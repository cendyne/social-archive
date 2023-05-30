/** @jsx jsx */
/** @jsxFrag Fragment */
import { jsx, Fragment } from 'hono/jsx'
import { RenderOptions } from './RenderOptions';
import { resizeUrl, toText } from './utils';

interface VimeoContent {
  poster: string,
  url?: string,
  width: number,
  height: number,
  blurhash: string,
  title: string,
  name: string,
  uploader_url: string,
  source_url: string,
  iso8601: string,
}
interface VimeoData {
  id: string,
  content: VimeoContent,
  archive: string | null
}

export function VimeoKind(props: {data: VimeoData}, options: RenderOptions) {
  let content = props.data.content;
  let date = new Date(content.iso8601);
  const id = props.data.id;
  let archiveUrl = props.data.archive || null;

  let {width, height, url} = resizeUrl({
    url: content.poster,
    width: content.width,
    height: content.height
  })

  if (options.txt) {
    const title = `${content.name}`;
    let leftPad = '';
    let rightPad = '';
    if (title.length < 73) {
      const leftPadLength = Math.floor((71 - title.length) / 2)
      const rightPadLength = Math.ceil((71 - title.length) / 2)
      leftPad = ':'.repeat(leftPadLength) + ' ';
      rightPad = ' ' + ':'.repeat(rightPadLength);
    }
    let body = [`${leftPad}${title}${rightPad}`];
    toText(content.title, body);
    let dateLine = `${new Date(content.iso8601)}`
    body.push(`:${' '.repeat(71)}:`);
    body.push(`: ${dateLine}${' '.repeat(Math.max(0, 70 - dateLine.length))}:`);
    const sourceLine = content.source_url;
    body.push(`: ${sourceLine}${' '.repeat(Math.max(0, 70 - sourceLine.length))}:`);
    body.push(':'.repeat(73))
    return body.join('\n');
  }

  if (options.rss) {
    return <blockquote>
      <p>
        <a href={content.source_url}><img src={url} alt={content.title} width={width} height={height} loading="lazy" /></a>
        <br />
        <small><em>See vimeo for video</em></small>
      </p>
      <strong><a href={content.uploader_url}>{content.name}</a></strong>
      {' '}
      <a href={content.source_url}>{content.title}</a>
      {archiveUrl && [' ', <a href={archiveUrl}>(archived)</a>]}
    </blockquote>
  }

  let header = <div class="card-header-bg">
    <a href={content.uploader_url} class="inline-flex card-header-link flex-no-shrink" target='_top'>
      <div class="card-header-content">
        <div class="card-header-name">{content.name}</div>
      </div>
    </a>
    <a href={content.source_url} class="inline-flex card-header-link flex-shrink" target='_top'>
      <div class="card-header-content flex-shrink all-rounded">
        <div class="card-header-name">{content.title}</div>
      </div>
    </a>
  </div>;
  let footer = <div class="card-footer">
    <a href={content.source_url} target='_top'>{date.toLocaleString()}</a>
    {archiveUrl && [' ', <a href={archiveUrl} target='_top'>(archived)</a>]}
    {options.showLinks && <Fragment> - <a href={`/json/get/vimeo/${props.data.id}`} target='_top'>as json</a> - <a href={`/get/vimeo/${props.data.id}`} target='_top'>as html</a></Fragment>}
  </div>;
  if (content.url) {
      return <div class="card">
      {header}
      <video
        poster={url}
        class="card-video"
        data-ratio
        data-width={content.width}
        data-height={content.height}
        controls=""
        preload="none">
        <source src={content.url} type="video/mp4" />
      </video>
      {footer}
    </div>;
  } else {
    return <div class="card">
      {header}
      <div
        data-vimeo-poster={url}
        data-width={content.width}
        data-height={content.height}
        data-vimeo-id={id}
        data-ratio
        class="vimeo-embed">
      <noscript>
        <iframe class="vimeo-iframe" width="100%" height="363" src={`https://player.vimeo.com/video/${id}`} title="Vimeo" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>
      </noscript>
      </div>
      {footer}
    </div>
  }
}