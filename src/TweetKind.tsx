/** @jsx jsx */
/** @jsxFrag  Fragment */
import { Fragment, jsx } from 'hono/jsx'
import { RenderOptions } from './RenderOptions'
interface TweetContent {
  name: string,
  username: string,
  timestamp: number,
  text: string,
  photos: {
    url: string,
    width: number,
    height: number,
    blurhash: string
  }[],
  videos: {
    poster: string,
    url: string,
    width: number,
    height: number,
    blurhash: string
  }[], icon: string
}
interface TweetData {
  id: string,
  content: TweetContent
}

export function TweetKind(props: {data: TweetData}, options: RenderOptions) {
  let content = props.data.content;
  let date = new Date(content.timestamp * 1000);
  return <div class="float-pair im-message">
    <div class="flex gap1">
      <div class="flex-auto">
        <div class="im-message-right">
          <div class="free-quote-name">
            <a href={`https://twitter.com/${content.username}`} rel="noopener noreferrer nofollow" target='_top'>{content.name}</a>
          </div>
          <p>
            {content.text}
          </p>
          {content.photos && content.photos.map(photo =>
            <div data-blurhash={photo.blurhash} data-height={photo.height} data-width={photo.width} class="blurhash-parent">
              <a href={photo.url} rel="noopener" target="_blank">
              <img loading="lazy" width={photo.width} height={photo.height} src={photo.url} class="simple-image blurhash-actual-image" alt="" />
              </a>
            </div>)}
          {content.videos && content.videos.map(video =>
            <video
              controls
              preload="none"
              class="card-video"
              data-ratio
              data-width={video.width}
              data-height={video.height}
              poster={video.poster}>
              <source src={video.url} type="video/mp4" />
            </video>)}
          <p>
            <a href={`https://twitter.com/${content.username}/status/${props.data.id}`} rel="noopener noreferrer nofollow" target='_top'>{date.toISOString()}</a>
            {options.showLinks && <Fragment> - <a href={`/json/get/tweet/${props.data.id}`} target='_top'>as json</a> - <a href={`/get/tweet/${props.data.id}`} target='_top'>as html</a></Fragment>}
          </p>
        </div>
      </div>
      <div class="flex-none">
        <div class="twitter-icon">
          <img width="64" alt={content.name} src={content.icon} />
        </div>
      </div>
    </div>
  </div>;
}