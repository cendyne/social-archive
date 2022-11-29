/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'

export function UnknownKind(props: {data: {id: string, content: any}}) {
  return <pre>
    <code>
      {JSON.stringify(props.data.content)}
    </code>
  </pre>;
}