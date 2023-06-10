/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'
import { RenderOptions } from './RenderOptions';

export function UnknownKind(props: {data: {id: string, content: any}}, options: RenderOptions) {
  if (options.rss) {
    return <blockquote>
      UNSUPPORTED EMBED TYPE
    </blockquote>
  }
  if (options.ir) {
    return 'Unsupported';
  }
  return <pre>
    <code>
      {JSON.stringify(props.data.content)}
    </code>
  </pre>;
}