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