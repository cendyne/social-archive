import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static.module'
import { bearerCheck } from './bearerCheck'
import { Env, HonoEnv } from './environment'
import { ListPage } from './ListPage'
import { getKey } from './signature'
import { TweetKind } from './TweetKind'
import { UnknownKind } from './UnknownKind'
import { decodeBase64Url, encodeBase64Url } from './utils'
const app = new Hono<HonoEnv>()
app.get('/', (c) => c.text('TODO'))
const staticMiddleware = serveStatic({root: './'});
app.use('/static/*', async (c, next) => {
	const response = await staticMiddleware(c, next);;
	if (response && response.status == 200) {
		response.headers.append('cache-control', 'max-age=600');
	}
	return response;
})

interface NewBody {
	time: string
	content: any
}

app.post('/new/:kind/:id', bearerCheck(), async (c) => {
	const kind = c.req.param('kind');
	const id = c.req.param('id');
	if (!kind || kind.length <= 0 || !id || id.length <= 0) {
		return c.text('Kind or ID missing', 400);
	}
	// console.log('id type: ', typeof id)
	let body : NewBody;
	try {
		body = await c.req.json<NewBody>();
	} catch (e) {
		return c.text('Missing body or invalid json', 400);
	}
	if (!body) {
		return c.text('Send json', 400)
	}
	if (!body.time) {
		return c.text('Please supply json with a "time" field', 400);
	}
	let time : Date;
	try {
		time = new Date(body.time);
	} catch (e) {
		return c.text('Could not parse "time" as ISO8601');
	}
	if (!body.content) {
		return c.text('Please supply json with a "content" field', 400);
	}
	const content = JSON.stringify(body.content);
	const {success} = await c.env.DB.prepare('INSERT OR REPLACE INTO archive (kind, kind_id, unixtime, content) values (?, ?, ?, ?)')
	.bind(kind, `${id}`, Math.ceil(time.getTime() / 1000), content)
	.run();
	if (!success) {
		return c.text('Failed', 500);
	}
	return c.text('OK');
});


const PAGE_SIZE = 50;
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

async function openNextToken(key: CryptoKey, next: string | undefined | null): Promise<{lastKindId: string, unixtime: number, direction: 'asc' | 'desc'}> {
	// long enough to fit a uuid
	let unixtime = 0;
	let direction: 'asc' | 'desc' = 'asc';
	// 36 blank spaces as an id
	let lastKindId = '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!';
	if (next) {
		let [unverifiedNextToken, signature] = next.split('.');
		if (unverifiedNextToken && signature) {
			const unverifiedNextTokenBytes = decodeBase64Url(unverifiedNextToken);
			const signatureBytes = decodeBase64Url(signature);
			try {
				await crypto.subtle.verify({name: 'HMAC'}, key, signatureBytes, unverifiedNextTokenBytes);
			} catch (e) {
				throw new Error('Tampered "next" query')
			}
			// It is now verified.
			const verifiedNextToken = JSON.parse(textDecoder.decode(unverifiedNextTokenBytes)) as {nextId: string, unixtime: number, direction: 'asc' | 'desc'};
			// Include the 0 padding because
			direction = verifiedNextToken.direction;
			unixtime = verifiedNextToken.unixtime;
			lastKindId = verifiedNextToken.nextId;
		} else {
			throw new Error('Malformed "next" query');
		}
	}
	return {lastKindId, unixtime, direction}
}

async function macNextToken(key: CryptoKey, nextId: string | undefined | null, unixtime: number, direction: 'asc' | 'desc'): Promise<string | undefined> {
	let next : string | undefined;
	if (nextId && nextId != '') {
		const nextIdBytes = textEncoder.encode(JSON.stringify({nextId, unixtime, direction}));
		const signature = await crypto.subtle.sign({name: 'HMAC'}, key, nextIdBytes);
		next = `${encodeBase64Url(nextIdBytes)}.${encodeBase64Url(signature)}`;
	}
	return next;
}

async function listAscending(key: CryptoKey, env: Env, kind: string, next: string | undefined) : Promise<{results: any[], next?: string, hasNext: boolean, error: false, direction: 'asc' | 'desc', prev?: string, last?: string} | {error: true, message: string}> {
	let openedToken;
	try {
		openedToken = await openNextToken(key, next);
	} catch (e) {
		return {error: true, message: (e as Error).message}
	}
	const {lastKindId, unixtime, direction} = openedToken;

	// I have to use '!' because D1 (as of 2022-11-28) will coerce the value into a number
	let results : D1Result<{kind_id: string, content: string, unixtime: number}>;
	if (direction == 'asc') {
		const stmt = await env.DB.prepare(`SELECT kind_id, content, unixtime FROM archive WHERE kind = ? and kind_id > ? and unixtime >= ? ORDER BY unixtime ASC LIMIT ${PAGE_SIZE}`);
		// '!' is the earliest character that sqlite does not truncate
		// console.log(`SELECT kind_id, content, unixtime FROM archive WHERE kind = '${kind}' and kind_id > '${lastKindId}' and unixtime >= ${unixtime} ORDER BY unixtime ASC LIMIT ${PAGE_SIZE}`)
		results = await stmt.bind(kind, `${lastKindId}`, unixtime).all();
		// console.log('Results: ', results.results?.length)
	} else if (direction == 'desc') {
		const stmt = await env.DB.prepare(`SELECT kind_id, content, unixtime FROM archive WHERE kind = ? and kind_id < ? and unixtime <= ? ORDER BY unixtime DESC LIMIT ${PAGE_SIZE}`)
		// '~' is the latest character
		// console.log(`SELECT kind_id, content, unixtime FROM archive WHERE kind = '${kind}' and kind_id < '${lastKindId}' and unixtime <= ${unixtime} ORDER BY unixtime DESC LIMIT ${PAGE_SIZE}`);
		results = await stmt.bind(kind, lastKindId, unixtime).all();
	} else {
		return {error: true, message: '"next" token is not supported'}
	}
	if (results.success && results.results) {
		let counter = 0;
		let nextId : string | undefined ;
		let firstId: string | undefined;
		let maxUnixtime = 0;
		let minUnixtime = Number.MAX_SAFE_INTEGER;
		let output: {id: string, content: any}[] = [];
		let sortedResults = results.results.sort((a, b) => a.unixtime - b.unixtime)
		for (let result of sortedResults) {
			counter++;
			maxUnixtime = Math.max(result.unixtime, maxUnixtime);
			minUnixtime = Math.min(result.unixtime, minUnixtime);
			// console.log({unixtime, id: result.kind_id, kty: typeof result.kind_id})
			if (counter == 1) {
				// Remove prefix
				firstId = result.kind_id;
			} else if (counter >= PAGE_SIZE) {
				// Remove prefix
				nextId = result.kind_id;
			}
			// Remove the prefix when reading
			output.push({id: result.kind_id, content: JSON.parse(result.content)});
		}
		const next = await macNextToken(key, nextId, maxUnixtime, 'asc');
		// Nearly everything is done, just need to prepare tokens that explore other ways
		// Previous is easy
		const prev = await macNextToken(key, firstId, minUnixtime, 'desc');
		const last = await macNextToken(key, '~'.repeat(36), Number.MAX_VALUE, 'desc');
		return {
			results: output,
			next,
			prev,
			last,
			hasNext: !!next,
			error: false,
			direction
		}
	}
	return {error: true, message: 'No results'}
}

app.get('/json/list/:kind', async (c) => {
	const kind = c.req.param('kind');
	if (!kind || kind.length <= 0) {
		return c.text('Kind missing', 400);
	}
	const next = c.req.query('next');
	const key = await getKey(c.env);
	let result = await listAscending(key, c.env, kind, next);
	if (result.error) {
		return c.text(result.message, 400);
	} else {
		return c.json(result);
	}
})

app.get('/json/get/:kind/:id', async (c) => {
	const kind = c.req.param('kind');
	const id = c.req.param('id');
	if (!kind || kind.length <= 0 || !id || id.length <= 0) {
		return c.text('Kind or ID missing', 400);
	}
	const stmt = await c.env.DB.prepare('select content from archive where kind = ? and kind_id = ?');
	const result = await stmt.bind(kind, `${id}`).first<{content: any}>();
	if (result) {
		const json = JSON.parse(result.content);
		return c.json(json);
	} else {
		return c.text('Not found', 404);
	}
})

app.get('/list/:kind', async (c) => {
	const kind = c.req.param('kind');
	if (!kind || kind.length <= 0) {
		return c.text('Kind missing', 400);
	}
	const next = c.req.query('next');
	const key = await getKey(c.env);
	let result = await listAscending(key, c.env, kind, next);
	if (result.error) {
		return c.text(result.message, 400);
	} else {
		return c.html(ListPage(kind, result.results.map(result => {
			if (kind == 'tweet') {
				return TweetKind({data: result})
			} else {
				return UnknownKind({data: result});
			}
		}), result.next, result.prev, result.last));
	}
})

export default app