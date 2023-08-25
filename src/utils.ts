import { ArrayCollapseTransformer, DocumentNode, ListItem, ListNode, Node, TableCellNode, TextCollapseTransformer, WhitespaceStretchingTransformer, WhitespaceTransformer } from 'document-ir';
import {JSXNode } from 'hono/jsx'
export function encodeHex(array: ArrayBuffer): string {
  return Array.from(new Uint8Array(array))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
export function decodeHex(text: string): Uint8Array {
  // Get rid of all punctuation and spacing.
  text = text.replace(/[^0-9a-zA-Z]+/g, '');
  const match = text.match(/[0-9a-fA-F]{1,2}/g);
  if (text.match(/^[0-9a-fA-F]+$/) && match && match.length) {
    return Uint8Array.from(match.map(byte => parseInt(byte, 16)));
  }
  throw new Error('Bad input to decodeHex');
}
export function encodeBase64(array: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(array)));
}
export function decodeBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), c => c.charCodeAt(0));
}
export function encodeBase64Url(array: ArrayBuffer): string {
  return encodeBase64(array)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
export function decodeBase64Url(text: string): Uint8Array {
  return decodeBase64(text.replace(/-/g, '+').replace(/_/g, '/'));
}

export function resizeUrl(opts: {width?: number, height?: number, url: string}) : {width?: number, height?: number, url: string} {
  let {width, height, url} = opts;
  let originalWidth = width;
  width = (width && Math.min(width, 645) || 645);
  height = height && width && originalWidth && Math.ceil(height * (width / originalWidth));
  if (width) {
    try {
      let parsedUrl = new URL(url);
      parsedUrl.searchParams.append('width', `${width}`);
      url = parsedUrl.toString();
    } catch (e) {
      // Sucks
    }
  }
  return {
    width,
    height,
    url
  }
}

type Child = JSXNode | string | number | Child[]

export function toText(node : Child, body: string[]) {
  let dirtyLine = '';
  let visit = function(node : Child | null) {
    if (node == null) {
      return;
    }
    if (typeof node == 'string') {
      let word = '';
      for (let c of node) {
        if (c == '\n') {
          dirtyLine += word;
          body.push(`: ${dirtyLine}${' '.repeat(Math.max(0, 70 - dirtyLine.length))}:`);
          dirtyLine = ''
          word = '';
        } else if (c ==' ') {
          if (dirtyLine.length == 0) {
            dirtyLine += word;
          } else {
            dirtyLine += ' ' + word;
          }
          word = ''

        } else {
          word += c;
          if (dirtyLine.length + word.length > 67 && dirtyLine.length > 0) {
            body.push(`: ${dirtyLine}${' '.repeat(Math.max(0, 70 - dirtyLine.length))}:`);
            dirtyLine = '';
          }
        }
      }
      if (word.length > 0) {
        if (dirtyLine.length == 0) {
          dirtyLine += word;
        } else {
          dirtyLine += ' ' + word;
        }
      }
    } else if (typeof node == 'number') {
      visit(`${node}`);
    } else if (node instanceof JSXNode) {
      if (node.tag == 'a') {
        if (node.props['target'] == '_blank') {
          visit(node.props['href']);
        } else {
          for (let child of node.children) {
            visit(child);
          }
        }
      } else {
        for (let child of node.children) {
          visit(child);
        }
      }
    } else if (Array.isArray(node)) {
      for (let item of node) {
        visit(item);
      }
    }
  }
  visit(node);
  if (dirtyLine.length > 0) {
    body.push(`: ${dirtyLine}${' '.repeat(Math.max(0, 70 - dirtyLine.length))}:`);
  }
}

export function toSimpleText(node : Child, body: string[]) {
  let dirtyLine = '';
  let visit = function(node : Child | null) {
    if (node == null) {
      return;
    }
    if (typeof node == 'string') {
      body.push(node.replaceAll("\n", " "));
    } else if (typeof node == 'number') {
      visit(`${node}`);
    } else if (node instanceof JSXNode) {
      if (node.tag == 'a') {
        if (node.props['target'] == '_blank') {
          visit(node.props['href']);
        } else {
          for (let child of node.children) {
            visit(child);
          }
        }
      } else if (node.tag == 'p') {
        for (let child of node.children) {
          visit(child);
        }
        body.push(' ')
      } else if (node.tag == 'br') {
        body.push(' ')
      } else {
        for (let child of node.children) {
          visit(child);
        }
      }
    } else if (Array.isArray(node)) {
      for (let item of node) {
        visit(item);
      }
    }
  }
  visit(node);
  if (dirtyLine.length > 0) {
    body.push(' ');
  }
}

function visitIRList(nodes: Child[]) : Node[] {
  if (!nodes) {
    return [];
  }
  let content: Node[] = []
  for (let elem of nodes) {
    let result = visitIR(elem);
    if (result) {
      content.push(result);
    }
  }
  return content
}
function visitIR(node: Child) : Node | null {
  if (node == null || node == undefined) {
    return null;
  }
  if (typeof node == 'string') {
    return {
      type: 'text',
      text: node
    }
  } else if (typeof node == 'number') {
    return {
      type: 'text',
      text: `${node}`
    }
  } else if (Array.isArray(node)) {
    let results : Node[] = []
    for (let elem of node) {
      let result = visitIR(elem);
      if (result) {
        results.push(result);
      }
    }
    return {
      type: 'array',
      content: results
    }
  } else if (node instanceof JSXNode) {
    if (node.tag == 'b' || node.tag == 'strong') {
      return {
        type: 'bold',
        content: visitIRList(node.children)
      }
    } else if (node.tag == 'i' || node.tag == 'em') {
      return {
        type: 'italic',
        content: visitIRList(node.children)
      }
    } else if (node.tag == 'p') {
      return {
        type: 'paragraph',
        content: visitIRList(node.children)
      }
    } else if (node.tag == 'br') {
      return {
        type: 'break'
      }
    } else if (node.tag == 'hr') {
      return {
        type: 'break'
      }
    } else if (node.tag == 'span') {
      return {
        type: 'array',
        content: visitIRList(node.children)
      }
    } else if (node.tag == 'code') {
      return {
        type: 'code',
        content: visitIRList(node.children)
      }
    } else if (node.tag == 'blockquote') {
      return {
        type: 'block-quote',
        content: visitIRList(node.children)
      }
    } else if (node.tag == 'div') {
      return {
        type: 'block',
        content: visitIRList(node.children)
      }
    } else if (node.tag == 'img') {
      let isEmoji = false;
      if (node.props['data-emoji']) {
        isEmoji = true;
      }
      let alt = '';
      if (typeof node.props['alt'] == 'string') {
        alt = node.props['alt'];
      }
      let url = '';
      if (typeof node.props['src'] == 'string') {
        url = node.props['src'];
      }
      if (isEmoji) {
        if (typeof node.props['data-emoji-src'] == 'string') {
          url = node.props['data-emoji-src'];
        }
        return {
          type: 'emoji',
          alt,
          url
        }
      }
      let width : number | undefined;
      let height: number | undefined;
      let blurhash : string | undefined;
      if (typeof node.props['width'] == 'string' && node.props['width'].match(/^\d+(?:\.\d+)?$/)) {
        width = Number.parseFloat(node.props['width']);
      } else if (typeof node.props['width'] == 'number') {
        width = node.props['width'];
      }
      if (typeof node.props['height'] == 'string' && node.props['height'].match(/^\d+(?:\.\d+)?$/)) {
        height = Number.parseFloat(node.props['height']);
      } else if (typeof node.props['height'] == 'number') {
        height = node.props['height'];
      }
      if (typeof node.props['data-blurhash'] == 'string') {
        blurhash = node.props['data-blurhash'];
      }

      return {
        type: 'image',
        alt,
        url,
        blurhash,
        width,
        height
      }
    } else if (node.tag == 'a') {
      let url = '#';
      if (typeof node.props['href'] == 'string') {
        url = node.props['href'];
      }
      let userGeneratedContent : true | undefined;
      let noReferrer : true | undefined;
      let noFollow : true | undefined;
      let noOpener : true | undefined;
      let target : '_blank' | '_self' | '_top' | undefined;
      let title : string | undefined;
      if (typeof node.props['title'] == 'string') {
        title = node.props['title'];
      }
      if (typeof node.props['target'] == 'string') {
        if (node.props['target'] == '_blank'
          || node.props['target'] == '_self'
          || node.props['target'] == '_top') {
          target = node.props['target'];
        }
      }
      if (typeof node.props['rel'] == 'string') {
        const relTokens = node.props['rel'].split(' ');
        for (let token of relTokens) {
          if (token == 'ugc') {
            userGeneratedContent = true;
          } else if (token == 'noreferrer' || token == 'noreferer') {
            noReferrer = true;
          } else if (token == 'nofollow') {
            noFollow = true;
          } else if (token == 'noopener') {
            noOpener = true;
          }
        }
      }
      return {
        type: 'link',
        content: visitIRList(node.children),
        url,
        userGeneratedContent,
        noReferrer,
        noFollow,
        noOpener,
        target
      }
    } else if (node.tag == 'ul' || node.tag == 'ol') {
      let content: ListItem[] = []
      for (let child of node.children) {
        if (child instanceof JSXNode && child.tag == 'li') {
          content.push({
            type: 'list-item',
            content: visitIRList(child.children)
          })
        }
      }
      return {
        type: 'list',
        style: node.tag == 'ul' ? 'unordered' : 'ordered',
        content
      };
    } else if (node.tag == 'table') {
      let rows : TableCellNode[][] = []
      for (let child of node.children) {
        if (child instanceof JSXNode && child.tag == 'tr') {
          let row : TableCellNode[] = [];
          for (let cell of child.children) {
            if (cell instanceof JSXNode
              && (cell.tag == 'td' || cell.tag == 'th')) {
                let width = 1;
                let height = 1;
                const colspan = cell.props['colspan'];
                const rowspan = cell.props['rowspan'];
                if (typeof colspan == 'string' && colspan.match(/^\d+$/)) {
                  width = Number.parseInt(colspan);
                }
                if (typeof rowspan == 'string' && rowspan.match(/^\d+$/)) {
                  height = Number.parseInt(rowspan);
                }
                row.push({
                  type: 'table-cell',
                  span: [width, height],
                  content: visitIRList(cell.children),
                  header: cell.tag == 'th' ? true : undefined
                });
            }
          }
        }
      }
      return {
        type: 'table',
        content: rows
      }
    } else {
      // Unknown type
      return {
        type: 'array',
        content: visitIRList(node.children)
      }
    }
  } else {
    return null;
  }
}

export async function toIR(node: Child | null) : Promise<Node[]> {
  if (node == null) {
    return [];
  }
  const result = visitIR(node);
  if (!result) {
    return []
  }
  let document : DocumentNode = {
    type: 'document',
    author: '',
    title: '',
    url: '',
    content: [result]
  }
  // Collapse some general things
  const transformers = [
    new ArrayCollapseTransformer(),
    new TextCollapseTransformer(),
    new WhitespaceTransformer(),
    new WhitespaceStretchingTransformer()
  ];
  for (let transformer of transformers) {
    document = await transformer.transform(document);
  }
  return document.content;
}