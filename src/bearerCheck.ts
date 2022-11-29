import { Handler } from "hono";
import { HonoEnv } from "./environment";

const textEncoder = new TextEncoder();

export function bearerCheck() : Handler<HonoEnv> {
	return async (c, next) => {
		const authorization = c.req.header('authorization');
		if (!authorization) {
			return c.text('Missing Authorization header', 401);
		}
		console.log('Has authorization header');
		const expectedAuthHeader = `Bearer ${c.env.BEARER_TOKEN}`;
		try {
			if (expectedAuthHeader.length != authorization.length || c.env.BEARER_TOKEN == '' || !c.env.BEARER_TOKEN) {
				if (!c.env.BEARER_TOKEN) {
					console.log("Missing environment BEARER_TOKEN")
				}
				return c.text('Unauthorized', 401);
			}
			// crypto.subtle.timingSafeEqual is only available on actual cloudflare
			// It fails when using local development, for that reason fallback to an insecure comparison
			// since it is only for local testing purposes.
			if ((globalThis as any).MINIFLARE) {
				if (expectedAuthHeader != authorization) {
					console.log('Unauthorized');
					return c.text('Unauthorized', 401);
				}
			} else {
				if (!crypto.subtle.timingSafeEqual(textEncoder.encode(expectedAuthHeader), textEncoder.encode(authorization))) {
					console.log('Unauthorized');
					return c.text('Unauthorized', 401);
				}
			}
			console.log('Authorized!')
		} catch (e) {
			console.error(e);
			return c.text('Error', 500)
		}
		await next();
	};
}