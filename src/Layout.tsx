/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'
export function Layout(props: {title: string, children?: any, testing?: boolean, oembed?: any}) {
  console.log('oembed', props.oembed)
  return <html>
  <head>
    {props.testing && <link rel="stylesheet" href="/static/testing.css" />}
    <link rel="stylesheet" href="https://fonts.cdyn.dev/dejavu-fonts/regular.css" />
    <link rel="stylesheet" href="https://js.cdyn.dev/combo?p=base.min.css&p=blog.min.css&p=card.min.css&p=common.min.css&p=stickers.min.css&p=youtube.min.css" />
    <meta NAME="robots" CONTENT="noindex,nofollow" />
    <title>{props.title}</title>
    {props.oembed}
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