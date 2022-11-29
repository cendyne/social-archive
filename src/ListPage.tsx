/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'
import { Layout } from './Layout'
export function ListPage(kind: string, elements: any[], next: string | undefined, prev: string | undefined, last: string | undefined) {
  let nav = <p>
  <button>
    <a href={`/list/${kind}`}>First</a>
  </button>
  {prev && (<button>
      <a href={`/list/${kind}?next=${prev}`}>Previous</a>
    </button>)}
  {next && (<button>
      <a href={`/list/${kind}?next=${next}`}>Next</a>
    </button>)}
  {last && (<button>
      <a href={`/list/${kind}?next=${last}`}>Last</a>
    </button>)}
  </p>;
  return <Layout title='List'>
    {nav}
    {elements.map(element => <p>{element}</p>)}
    {nav}
  </Layout>
}