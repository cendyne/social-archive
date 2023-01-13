/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'
import { Layout } from './Layout'
export function IframeFlex() {
  return <Layout title={`iframe test`}>
    <iframe
      src='/iframe-example'
      allowtransparency='true'
      scrolling='no'
      sandbox='allow-scripts allow-popups allow-top-navigation'
      style='border-bottom: white solid 5px; height: 0px;'
      class='inline-iframe'></iframe>
    <script type="application/javascript" src="https://js.cdyn.dev/iframe.min.js?nocache" defer></script>
  </Layout>
}