/** @jsx jsx */
/** @jsxFrag Fragment */
import { jsx, Fragment } from 'hono/jsx'
import { RenderOptions } from './RenderOptions';
import { resizeUrl } from './utils';

interface YoutubeContent {
  icon: string,
  poster: string,
  banner: string | null,
  url?: string,
  width: number,
  height: number,
  blurhash: string,
  title: string,
  name: string,
  channel_url: string,
  source_url: string,
  iso8601: string,
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

  let {width, height, url} = resizeUrl({
    url: content.poster,
    width: content.width,
    height: content.height
  });

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

  let header = <div class="card-header-bg" data-background={bannerUrl}>
    <a href={content.channel_url} class="card-header-link card-channel-link" target='_top'>
      <div class="card-header">
        <div class="card-icon">
          <img loading="lazy" class="card-icon-image" src={content.icon + '?height=64'} alt="" />
        </div>
      </div>
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