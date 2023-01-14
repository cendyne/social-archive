/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'
import { Layout } from './Layout'
export function IframeExample(kind: string, id: string) {
  return <Layout title={`iframe ${kind} - ${id}`} testing>
    <div class="big-space"></div>
    <iframe
      src={`/get/${kind}/${id}?iframe`}
      allowtransparency='true'
      scrolling='no'
      sandbox='allow-scripts allow-popups allow-top-navigation'
      data-resizing-iframe
      class='inline-iframe' id='potato'></iframe>
    <script type="application/javascript" src="https://js.cdyn.dev/iframe.js?nocache" defer></script>
    <div class="big-space"></div>
  </Layout>
}