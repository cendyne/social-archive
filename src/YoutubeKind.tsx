/** @jsx jsx */
/** @jsxFrag Fragment */
import { jsx, Fragment } from 'hono/jsx'
import { RenderOptions } from './RenderOptions';
import { resizeUrl, toText } from './utils';
import { CardNode } from 'document-ir';

interface YoutubeContent {
  icon: string,
  poster: string,
  banner: string | null,
  banner_blurhash?: string | null,
  url?: string,
  width: number,
  height: number,
  blurhash: string,
  title: string,
  name: string,
  channel_url: string,
  source_url: string,
  iso8601: string,
  id: string,
}
interface YoutubeData {
  id: string,
  content: YoutubeContent,
  archive: string | null
}

export function YoutubeKind(props: {data: YoutubeData}, options: RenderOptions) {
  let content = props.data.content;
  let date = new Date(content.iso8601);
  const id = props.data.id;
  let archiveUrl = props.data.archive || null;
  if (options.ir) {
    const result : CardNode = {
      type: 'card',
      header: {
        type: 'card-header',
        title: [{type: 'text', text: content.name}],
        url: content.channel_url,
        imageUrl: content.icon,
        backgroundImage: content.banner || undefined,
        backgroundBlurhash: content.banner_blurhash || undefined
      },
      attribution: {
        type: 'card-attribution',
        archiveUrl: archiveUrl || undefined,
        date: content.iso8601,
        url: content.source_url,
        title: [{type: 'text', text: content.title}]
      }
    };

    if (content.url) {
      result.media = {
        type: 'card-media',
        content : [{
          type: 'video',
          mp4: content.url || 'todo',
          alt: content.title,
          poster: content.poster,
          blurhash: content.blurhash,
          height: content.height,
          width: content.width,
        }]
      }
    } else {
      result.media = {
        type: 'card-media',
        content: [{
          type: 'embed',
          content: {
            type: 'youtube',
            id: content.id || props.data.id,
            imagePreview: {
              url: content.poster,
              width: content.width,
              height: content.height,
              blurhash: content.blurhash
            }
          }
        }]
      }
    }

    return result;
  }

  let {width, height, url} = resizeUrl({
    url: content.poster,
    width: content.width,
    height: content.height
  });

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
        <small><em>See youtube for video</em></small>
      </p>
      <strong><a href={content.channel_url}>{content.name}</a></strong>
      {' '}
      <a href={content.source_url}>{content.title}</a>
      {archiveUrl && [' ', <a href={archiveUrl}>(archived)</a>]}
    </blockquote>
  }


  let banner = content.banner
  if (banner == 'https://c.cdyn.dev/null') {
    banner = null;
  }

  let resizedBanner = banner && resizeUrl({url: banner})
  let bannerUrl = resizedBanner && resizedBanner.url;

  if (bannerUrl) {
    try {
      let bannerUrlObj = new URL(bannerUrl);
      bannerUrlObj.searchParams.set('width', '645');
      bannerUrl = bannerUrlObj.toString();
    } catch (e) {
      console.error(e);
    }
  }

  let header = <div class="card-header-wrapper" data-has-background={bannerUrl != null}>
    <div class="card-header-bg2" data-background={bannerUrl}></div>
    <div class="card-header-fg">
      <a href={content.channel_url} class="card-header-link card-channel-link  card-header-fg-glassy" target='_top'>
        <div class="card-header">
          <div class="card-icon">
            <img loading="lazy" class="card-icon-image" src={content.icon + '?height=64'} alt="" />
          </div>
        </div>
        <div class="card-header-content">
          <div class="card-header-name">{content.name}</div>
        </div>
      </a>
      <a href={content.source_url} class="inline-flex card-header-link flex-shrink card-header-fg-glassy" target='_top'>
        <div class="card-header-content flex-shrink all-rounded">
          <div class="card-header-name">{content.title}</div>
        </div>
      </a>
    </div>
  </div>;
  let footer = <div class="card-footer">
    <a href={content.source_url} target='_top'>{date.toLocaleString()}</a>
    {archiveUrl && [' ', <a href={archiveUrl} target='_top'>(archived)</a>]}
    {options.showLinks && <Fragment> - <a href={`/json/get/youtube/${props.data.id}`} target='_top'>as json</a> - <a href={`/get/youtube/${props.data.id}`} target='_top'>as html</a></Fragment>}
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
        data-youtube-poster={url}
        data-width={content.width}
        data-height={content.height}
        data-youtube-id={id}
        data-ratio
        class="youtube-embed">
      <noscript>
        <iframe class="youtube-iframe" width="100%" height="363" src={`https://www.youtube-nocookie.com/embed/${id}`} title="Youtube" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>
      </noscript>
      </div>
      {footer}
    </div>
  }
}