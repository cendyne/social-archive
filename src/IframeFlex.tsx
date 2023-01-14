/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'
import { Layout } from './Layout'
export function IframeFlex() {
  return <Layout title={`iframe test`} testing>
    <div class="big-space"></div>
    <iframe
      src='/iframe-example'
      allowtransparency='true'
      scrolling='no'
      sandbox='allow-scripts allow-popups allow-top-navigation'
      style='border-bottom: white solid 5px; height: 0px;'
      data-resizing-iframe
      class='inline-iframe'></iframe>
    <div class="big-space"></div>
    <script type="application/javascript" src="https://js.cdyn.dev/iframe.min.js?nocache" defer></script>
    <iframe
      src={`/get/youtube/b9j-sfP9GUU?iframe`}
      allowtransparency='true'
      scrolling='no'
      sandbox='allow-scripts allow-popups allow-top-navigation'
      data-resizing-iframe
      class='inline-iframe' id='potato'></iframe>
  </Layout>
}