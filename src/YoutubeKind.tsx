/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx } from 'hono/jsx'

export function YoutubeKind(props: {data: {id: string, content: {
  icon: string,
  poster: string,
  url?: string,
  width: number,
  height: number,
  blurhash: string,
  title: string,
  name: string,
  channel_url: string,
  source_url: string,
  iso8601: string,
}}}) {
  let content = props.data.content;
  let date = new Date(content.iso8601);
  const id = props.data.id;
  if (content.url) {
    return <div class="float-pair im-message">
      <div class="flex gap1">
        <div class="flex-auto">
          <div class="im-message-right">
            <p class="free-quote-name">
              <a href={content.channel_url}>{content.name}</a>
            </p>
            <p>
              <video poster={content.poster} style={`aspect-ratio: ${content.width}/${content.height}`} controls="" preload="none">
                <source src={content.url} type="video/mp4" />
              </video>
            </p>
            <p>
              <a href={content.source_url}>{content.title}</a> {date.toLocaleDateString("en-US",{weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})} - <a href={`/json/get/youtube/${props.data.id}`}>as json</a> - <a href={`/get/youtube/${props.data.id}`}>as html</a>
            </p>
          </div>
        </div>
        <div class="flex-none">
          <div class="free-quote-icon">
            <img width="64" alt={content.name} src={`${content.icon}?width=64`} />
          </div>
        </div>
      </div>
    </div>
  } else {
    return <div>
      <div data-youtube-poster={content.poster} data-width={content.width} data-height={content.height} data-youtube-id={id} style={`aspect-ratio: ${content.width}/${content.height}`} class="youtube-embed">
      <noscript>
        <iframe class="youtube-iframe" width="100%" height="363" src={`https://www.youtube-nocookie.com/embed/${id}`} title="Youtube" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>
      </noscript>
    </div>
    <p>
      <a href={content.source_url} rel="noopener noreferrer nofollow">{content.title}</a> by <a href={content.channel_url} rel="noopener noreferrer nofollow">{content.name}</a> - <a href={`/json/get/youtube/${props.data.id}`}>as json</a> - <a href={`/get/youtube/${props.data.id}`}>as html</a>
    </p>
    </div>
  }
}