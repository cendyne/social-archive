/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'
import { Layout } from './Layout'
export function SinglePage(kind: string, elements: any[]) {
  return <Layout title='Single'>
    {elements.map(element => <p>{element}</p>)}
  </Layout>
}