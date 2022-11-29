export interface Env {
  __STATIC_CONTENT: KVNamespace
  DB: D1Database
  SIGNING_KEY: string
  BEARER_TOKEN: string
}
export interface HonoEnv {
	Bindings: Env
}