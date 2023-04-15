import { Hono } from 'hono'
import { html } from 'hono/html'
import { serveStatic } from 'hono/serve-static.module'
import { bearerCheck } from './bearerCheck'
import { Env, HonoEnv } from './environment'
import { FlexingPage } from './FlexingPage'
import { IframeExample } from './IframeExample'
import { IframeFlex } from './IframeFlex'
import { IframePage } from './IframePage'
import { ListPage } from './ListPage'
import { RenderOptions } from './RenderOptions'
import { getKey } from './signature'
import { SinglePage } from './SinglePage'
import { TootKind } from './TootKind'
import { TweetKind } from './TweetKind'
import { VimeoKind } from './VimeoKind'
import { UnknownKind } from './UnknownKind'
import { decodeBase64Url, encodeBase64Url } from './utils'
import { YoutubeKind } from './YoutubeKind'
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
app.get('/js', async (c) =>{
	let {host, pathname,searchParams} = new URL(c.req.url);
	let cachedUrl = new URL(`https://${host}${pathname}`);
	let loadIframeJs = false;
	let loadInsideIframeJs = false;
	if (searchParams.get('iframe') != undefined) {
		cachedUrl.searchParams.set('iframe','');
		loadIframeJs = true;
	}
	if (searchParams.get('iframe-inside') != undefined) {
		cachedUrl.searchParams.set('iframe-inside','');
		loadInsideIframeJs = true;
	}
	const cachedRequest = new Request(cachedUrl);
	const cachedResponse = await caches.default.match(cachedRequest);
	if (cachedResponse) {
		return cachedResponse;
	}
	let url = new URL('https://js.cdyn.dev/combo');
	url.searchParams.append('p', 'blurhash2.min.js')
	url.searchParams.append('p', 'youtube.min.js')
	url.searchParams.append('p', 'enhance.min.js')
	if (loadIframeJs) {
		url.searchParams.append('p', 'iframe.min.js')
	}
	if (loadInsideIframeJs) {
		url.searchParams.append('p', 'iframe-inside.min.js')
	}

	const jsResponse = await fetch(url.toString());
	let js = await jsResponse.text();
	const response = new Response(js, {
		headers: new Headers([
			['cache-control', 'max-age=3600']
		])
	});
	c.executionCtx.waitUntil(caches.default.put(cachedRequest, response.clone()));
	return response;
});

interface NewBody {
	time: string
	content: any
	archive?: string
}
app.patch('/patch/:kind/:id', bearerCheck(), async (c) => {
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
	if (!body.content) {
		return c.text('Please supply json with a "content" field', 400);
	}
	const content = JSON.stringify(body.content);
	const {success} = await c.env.DB.prepare('UPDATE archive set content = ? where kind = ? and kind_id = ?')
	.bind(content, kind, `${id}`)
	.run();
	if (!success) {
		return c.text('Failed', 500);
	}
	return c.text('OK');
});
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
	if (body.archive && !body.archive.match(/^https?:\/\/\S+$/)) {
		return c.text('Please supply json with a "archive" field with a valid url', 400);
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
	const {success} = await c.env.DB.prepare('INSERT OR REPLACE INTO archive (kind, kind_id, unixtime, content, archive_url) values (?, ?, ?, ?, ?)')
	.bind(kind, `${id}`, Math.ceil(time.getTime() / 1000), content, body.archive)
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
	let results : D1Result<{kind_id: string, content: string, unixtime: number, archive_url: string | null}>;
	if (direction == 'asc') {
		const stmt = await env.DB.prepare(`SELECT kind_id, content, unixtime, archive_url FROM archive WHERE kind = ? and kind_id > ? and unixtime >= ? ORDER BY unixtime ASC LIMIT ${PAGE_SIZE}`);
		// '!' is the earliest character that sqlite does not truncate
		// console.log(`SELECT kind_id, content, unixtime FROM archive WHERE kind = '${kind}' and kind_id > '${lastKindId}' and unixtime >= ${unixtime} ORDER BY unixtime ASC LIMIT ${PAGE_SIZE}`)
		results = await stmt.bind(kind, `${lastKindId}`, unixtime).all();
		// console.log('Results: ', results.results?.length)
	} else if (direction == 'desc') {
		const stmt = await env.DB.prepare(`SELECT kind_id, content, unixtime, archive_url FROM archive WHERE kind = ? and kind_id < ? and unixtime <= ? ORDER BY unixtime DESC LIMIT ${PAGE_SIZE}`)
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
		let output: {
			id: string,
			content: any,
			archive: string | null
		}[] = [];
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
			output.push({
				id: result.kind_id,
				content: JSON.parse(result.content),
				archive: result.archive_url
			});
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
	const stmt = await c.env.DB.prepare('select kind, kind_id, content, archive_url from archive where kind = ? and kind_id = ?');
	const result = await stmt.bind(kind, `${id}`).first<{content: any, kind: string, kind_id: string, archive_url: string }>();
	if (result) {
		const json = JSON.parse(result.content);
		return c.json({
			id: result.kind_id,
			kind: result.kind,
			content: json,
			archive: result.archive_url
		});
	} else {
		return c.text('Not found', 404);
	}
})

app.put('/archive/:kind/:id', bearerCheck(), async (c) => {
	const kind = c.req.param('kind');
	const id = c.req.param('id');
	if (!kind || kind.length <= 0 || !id || id.length <= 0) {
		return c.text('Kind or ID missing', 400);
	}
	let url : string | null = await c.req.text();
	console.log('url',url)
	if (url == undefined || (url != '' && !url.match(/^https?:\/\/\S+$/))) {
		return c.text('Expecting a URL', 400);
	}
	if (url == '') {
		url = null;
	}
	const stmt = await c.env.DB.prepare('select archive_url from archive where kind = ? and kind_id = ?');
	const result = await stmt.bind(kind, `${id}`).first<{archive_url: string }>();
	if (result) {
		let old_url = result.archive_url;
		let updateStmt = await c.env.DB.prepare('update archive set archive_url = ? where kind = ? and kind_id = ?');
		let status = await updateStmt.bind(url, kind, `${id}`).run();
		if (status.success) {
			return c.json({
				status: 'success',
				old: old_url,
				'new': url
			}, 200);
		} else {
			return c.json({
				status: 'failure',
				message: status.error
			}, 200);
		}
	} else {
		return c.text('Not found', 404);
	}
})


function mapKindToHtml(kind: string, result: {id: string, content: any, archive: string | null}, options: RenderOptions): any {
	if (kind == 'tweet') {
		return TweetKind({data: result}, options);
	} else if (kind == 'youtube') {
		return YoutubeKind({data: result}, options);
	} else if (kind == 'toot') {
		return TootKind({data: result}, options);
	} else if (kind == 'vimeo') {
		return VimeoKind({data: result}, options);
	} else {
		return UnknownKind({data: result}, options);
	}
}

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
		let options: RenderOptions = {
			showLinks: true,
			rss: false,
		}
		return c.html(ListPage(kind, result.results.map(result => mapKindToHtml(kind, result, options)), result.next, result.prev, result.last));
	}
})

app.get('/get/:kind/:id', async (c) => {
	const kind = c.req.param('kind');
	const id = c.req.param('id');
	if (!kind || kind.length <= 0 || !id || id.length <= 0) {
		return c.text('Kind or ID missing', 400);
	}
	const stmt = await c.env.DB.prepare('select kind_id, content, archive_url from archive where kind = ? and kind_id = ?');
	const result = await stmt.bind(kind, `${id}`).first<{content: any, kind_id: string, archive_url: string}>();
	const iframe = c.req.query('iframe');
	const raw = c.req.query('raw');
	const rss = c.req.query('rss');
	if (result) {
		const json = JSON.parse(result.content);
		let options : RenderOptions = {
			showLinks: true,
			rss: rss !== undefined
		};
		if (iframe !== undefined || raw !== undefined) {
			options.showLinks = false;
		}
		const html = mapKindToHtml(kind, {
			id: result.kind_id,
			content: json,
			archive: result.archive_url || null
		}, options);
		if (raw !== undefined || rss !== undefined) {
			return c.html(html);
		}
		if (iframe !== undefined) {
			return c.html(IframePage(`${kind} - ${id}`, html));
		}
		return c.html(SinglePage(kind, [html]));
	} else {
		return c.text('Not found', 404);
	}
})

type ReadTypeId = [kind: string, id: string];
type BatchReadRequest = ReadTypeId[];

app.post('/batch-read', async (c) => {
	const errMsg = 'Body must be a json array of kinds and ids, as such: [["tweet", "2222"]]';
	let body : BatchReadRequest;
	try {
		body = await c.req.json<BatchReadRequest>();
	} catch (e) {
		return c.text(errMsg, 400);
	}

	if (!body || !Array.isArray(body)) {
		return c.text(errMsg, 400);
	}
	// validate
	for (let entry of body) {
		if (!Array.isArray(entry) || entry.length != 2) {
			return c.text(errMsg, 400);
		}
	}
	// We're good
	let results = [];
	const stmt = await c.env.DB.prepare('select kind_id, content, archive_url from archive where kind = ? and kind_id = ?');
	for (let [kind, id] of body) {
		try {
			const result = await stmt.bind(kind, `${id}`).first<{content: any, kind_id: string, archive_url: string | null}>();
			let value = null;
			if (result) {
				const json = JSON.parse(result.content);
				const inline = html`${mapKindToHtml(kind, {
					id: result.kind_id,
					content: json,
					archive: result.archive_url || null
				}, {
					rss: false,
					showLinks: false
				})}`;
				const rss = html`${mapKindToHtml(kind, {
					id: result.kind_id,
					content: json,
					archive: result.archive_url || null
				}, {
					rss: true,
					showLinks: false
				})}`;
				value = {inline, rss}
			}
			results.push({
				key: [kind, id],
				value
			})
		} catch (e) {
			console.log(kind, id, e, e instanceof Error ? e.stack : null);
			results.push({
				key: [kind, id],
				value: null
			})
		}
	}
	return c.json({
		results
	});
});

app.get('/iframe-test/:kind/:id', async (c) => {
	const kind = c.req.param('kind');
	const id = c.req.param('id');
	if (!kind || kind.length <= 0 || !id || id.length <= 0) {
		return c.text('Kind or ID missing', 400);
	}
	return c.html(IframeExample(kind, id));
})

app.get('/iframe-example', async (c) => {
	return c.html(FlexingPage('todo'));
})

app.get('/iframe-test', async (c) => {
	return c.html(IframeFlex());
})

export default app