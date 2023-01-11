/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'
import { Layout } from './Layout'
export function IframeExample(kind: string, id: string) {
  return <Layout title={`iframe ${kind} - ${id}`}>
    <iframe
      src={`/get/${kind}/${id}?iframe`}
      allowtransparency='true'
      scrolling='no'
      sandbox='allow-scripts allow-popups allow-top-navigation'
      class='inline-iframe' id='potato'></iframe>
    <script type="application/javascript" src="https://js.cdyn.dev/iframe.min.js" defer></script>
  </Layout>
}