/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'
import { Layout } from './Layout'
export function SinglePage(kind: string, elements: any[], oembed?: any) {
  console.log('single oembed', oembed)
  return <Layout title='Single' oembed={oembed}>
    {elements.map(element => <p>{element}</p>)}
  </Layout>
}