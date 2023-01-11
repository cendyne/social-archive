/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'
import { RenderOptions } from './RenderOptions';

export function UnknownKind(props: {data: {id: string, content: any}}, _options: RenderOptions) {
  return <pre>
    <code>
      {JSON.stringify(props.data.content)}
    </code>
  </pre>;
}