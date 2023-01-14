/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'
export function FlexingPage(title: string) {
  return <html>
  <head>
    <link rel="stylesheet" href="/static/main.css" />
    <link rel="stylesheet" href="/static/testing.css" />
    <link rel="stylesheet" href="https://fonts.cdyn.dev/dejavu-fonts/regular.css" />
    <meta NAME="robots" CONTENT="noindex,nofollow" />
    <title>{title}</title>
  </head>
  <body class="iframe">
    <div id="body">
      <div style="background-color: blue; height: 30px; margin-bottom: 10px"></div>
      <div id="eee" style="background-color: red; border-bottom: black solid 5px;"></div>
      <div style="background-color: yellow; height: 30px; margin-top: 10px"></div>
    </div>
    <script src="/static/resizing-div.js" type="application/javascript" defer></script>
    <script src="https://js.cdyn.dev/iframe-inside.min.js?nocache" type="application/javascript" defer></script>
  </body>
  </html>
}