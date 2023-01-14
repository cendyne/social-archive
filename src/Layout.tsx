/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'
export function Layout(props: {title: string, children?: any, testing?: boolean}) {
  return <html>
  <head>
    <link rel="stylesheet" href="/static/main.css" />
    {props.testing && <link rel="stylesheet" href="/static/testing.css" />}
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
    <script src="/js" type="application/javascript" defer></script>
  </body>
  </html>;
}