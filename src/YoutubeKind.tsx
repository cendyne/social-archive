/** @jsx jsx */
/** @jsxFrag Fragment */
import { jsx, Fragment } from 'hono/jsx'
import { RenderOptions } from './RenderOptions';

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
interface YoutubeData {id: string, content: YoutubeContent}

export function YoutubeKind(props: {data: YoutubeData}, options: RenderOptions) {
  let content = props.data.content;
  let date = new Date(content.iso8601);
  const id = props.data.id;
  let header = <div class="card-header-bg" data-background={content.banner}>
    <a href={content.channel_url} class="inline-flex card-header-link flex-no-shrink" target='_top'>
      <div class="card-header">
        <div class="card-icon">
          <img loading="lazy" class="card-icon-image" src={content.icon + '?height=64'} />
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
    {options.showLinks && <Fragment> - <a href={`/json/get/youtube/${props.data.id}`} target='_top'>as json</a> - <a href={`/get/youtube/${props.data.id}`} target='_top'>as html</a></Fragment>}
  </div>;
  if (content.url) {
      return <div class="card">
      {header}
      <video
        poster={content.poster}
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
      <div data-youtube-poster={content.poster} data-width={content.width} data-height={content.height} data-youtube-id={id} style={`aspect-ratio: ${content.width}/${content.height}`} class="youtube-embed">
      <noscript>
        <iframe class="youtube-iframe" width="100%" height="363" src={`https://www.youtube-nocookie.com/embed/${id}`} title="Youtube" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>
      </noscript>
      </div>
      {footer}
    </div>
  }
}