/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'
export function Layout(props: {title: string, children?: any}) {
  return <html>
  <head>
    <link rel="stylesheet" href="/static/main.css" />
    <link rel="stylesheet" href="https://fonts.cdyn.dev/dejavu-fonts/regular.css" />
    <meta NAME="robots" CONTENT="noindex,nofollow" />
    <title>{props.title}</title>
  </head>
  <body>
    <div id="body">
    <article class="content">
      {props.children}
    </article>
    </div>
    <script src="/static/blurhash.js" type="application/javascript" defer></script>
  </body>
  </html>;
}