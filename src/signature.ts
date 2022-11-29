import { Env } from "./environment";

export async function getKey(env: Env) {
	let base64Key = env.SIGNING_KEY;
	if (!base64Key) {
    if ((globalThis as any).MINFLARE) {
      // Default to all zeros, only used for local development!
      console.warn('All zero key')
      base64Key = 'A'.repeat(43);
    } else {
      throw new Error('SIGNING_KEY not set up');
    }
	}
	return await crypto.subtle.importKey(
    "jwk",
    {
        kty: "oct",
        k: base64Key,
        alg: "HS256",
        ext: true,
    },
    {
        name: "HMAC",
        hash: {name: "SHA-256"},
    },
    false,
    ["sign", "verify"]
	)
}
