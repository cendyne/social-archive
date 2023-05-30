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