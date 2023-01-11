/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'
export function IframePage(title: string, children: any) {
  return <html>
  <head>
    <link rel="stylesheet" href="/static/main.css" />
    <link rel="stylesheet" href="https://fonts.cdyn.dev/dejavu-fonts/regular.css" />
    <meta NAME="robots" CONTENT="noindex,nofollow" />
    <title>{title}</title>
  </head>
  <body class="iframe">
    <div id="body">
    <article class="content">
      {children}
    </article>
    </div>
    <script src="/js?iframe-inside" type="application/javascript" defer></script>
  </body>
  </html>
}