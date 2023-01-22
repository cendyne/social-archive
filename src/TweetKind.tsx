/** @jsx jsx */
/** @jsxFrag  Fragment */
import { Fragment, jsx, JSXNode } from 'hono/jsx'
import { RenderOptions } from './RenderOptions'
import { resizeUrl } from './utils'
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
  }[],
  icon: string,
  banner?: string,
  url?: string,
  color?: string
}
interface TweetData {
  id: string,
  content: TweetContent
  archive: null | string
}

type Child = JSXNode | string | number | Child[]

function parseTweet(content: string) : Child {
  let result : Child[] = [];
  let top = '';
  let mode : 'text' | 'username' | 'hashtag' | 'link' = 'text';
  let secure = false;
  for (let char of content) {
    if (mode == 'text') {
      if (char == '@' && (top == '' || top.slice(-1).match(/^[^a-zA-Z0-9_]$/))) {
        mode = 'username';
        result.push(top);
        top = '';
        continue;
      } else if (char == '#' && (top == '' || top.slice(-1).match(/^[^a-zA-Z0-9_]$/))) {
        mode = 'hashtag';
        result.push(top);
        top = '';
        continue;
      } else if (top.endsWith('https://')) {
        mode = 'link';
        if (top.length > 8) {
          result.push(top.slice(0, -8));
        }
        top = char;
        secure = true;
        continue;
      } else if (top.endsWith('http://')) {
        mode = 'link';
        if (top.length > 8) {
          result.push(top.slice(0, -7));
        }
        top = char;
        secure = false;
        continue;
      }
    } else if (mode == 'username') {
      if (char == '@') {
        if (top == '') {
          result.push('@');
        } else {
          top = '@' + top + '@';
          mode = 'text';
        }
        continue;
      }
      if (!char.match(/[a-zA-Z0-9_@]/)) {
        if (top == '') {
          top = '@' + char;
          mode = 'text';
          continue;
        } else {
          result.push(<a href={`https://twitter.com/${top}`} target='_top' rel='ugc noreferer nofollow noopener'>@{top}</a>);
          mode = 'text';
          top = char;
          continue;
        }
      }
    } else if (mode == 'hashtag') {
      if (char == '#') {
        if (top == '') {
          result.push('#');
        } else {
          top = '#' + top + '#';
          mode = 'text';
        }
        continue;
      }
      if (!char.match(/[a-zA-Z0-9_#]/)) {
        if (top == '') {
          top = '#' + char;
          mode = 'text';
          continue;
        } else {
          result.push(<a href={`https://twitter.com/hashtag/${top}`} target='_top' rel='ugc noreferer nofollow noopener'>#{top}</a>);
          mode = 'text';
          top = char;
          continue;
        }
      }
    } else if (mode == 'link') {
      if (char.match(/[ \n;]/)) {
        if (top.includes('.')) {
          result.push(<a href={`http${secure ? 's' : ''}://${top}`} target='_top' rel='ugc noreferer nofollow noopener'>{top}</a>);
          top = char;
          mode = 'text';
          continue;
        }
      }
    }
    top += char;
  }
  if (mode == 'text') {
    result.push(top);
  } else if (mode == 'username') {
    result.push(<a href={`https://twitter.com/${top}`} target='_top' rel='ugc noreferer nofollow noopener'>@{top}</a>);
  } else if (mode == 'hashtag') {
    result.push(<a href={`https://twitter.com/hashtag/${top}`} target='_top' rel='ugc noreferer nofollow noopener'>#{top}</a>);
  } else if (mode == 'link') {
    result.push(<a href={`http${secure ? 's' : ''}://${top}`} target='_top' rel='ugc noreferer nofollow noopener'>{top}</a>);
  }
  return result;
}



export function TweetKind(props: {data: TweetData}, options: RenderOptions) {
  let content = props.data.content;
  let date = new Date(content.timestamp * 1000);
  let accountUrl = `https://twitter.com/${content.username}`;
  let header = content.banner;
  let avatar = content.icon;
  let displayName = content.name;
  let username = content.username;
  let color = content.color;
  let htmlContent = parseTweet(content.text);
  let statusUrl = `https://twitter.com/${content.username}/status/${props.data.id}`;
  let postedDate = date.toLocaleString();
  if (header == 'https://c.cdyn.dev/null') {
    header = undefined;
  }
  if (!content.photos) {
    content.photos = [];
  }
  if (!content.videos) {
    content.videos = [];
  }
  let archiveUrl = props.data.archive || null;

  if (options.rss) {
    return <blockquote>
      <p>{htmlContent}</p>
      {content.photos.map((photo) => {
        let {width, height, url} = resizeUrl(photo);
        return <p>
          <img loading="lazy" width={width} height={height} src={url} alt='tweet photo'/>
        </p>
      })}
      {content.videos.map((video) => {
        let {width, height, url} = resizeUrl({url: video.poster, height: video.height, width: video.width});
        return <p>
          <img loading="lazy" width={width} height={height} src={url} alt='Embedded video'/><br />
          <small><em>See website for video</em></small>
        </p>
      })}
      <strong><a href={accountUrl}>{displayName} ({username})</a></strong>
      {' '}
      <a href={statusUrl}>{postedDate}</a>
      {archiveUrl && [' ', <a href={archiveUrl}>(archived)</a>]}
    </blockquote>
  }

  return <div class="card">
    <div class="card-header-bg" data-background={header} data-background-color={color}>
      <a href={accountUrl} class="fediverse-link inline-flex" target='_top'>
        <div class="card-header">
          <div class="card-icon">
            <img loading="lazy" class="card-icon-image" src={avatar && avatar + '?width=64'} />
          </div>
        </div>
        <div class="card-header-content">
          <div class="card-header-name">{displayName}</div>
          <div class="card-header-description">
            <span class="fediverse-username">@{username}</span>
            <span class="fediverse-instance">@twitter.com</span>
          </div>
        </div>
      </a>
    </div>
    {htmlContent && (<div class="card-content">
      {htmlContent}
    </div>)}
    {content.photos.length > 0 ? (<div class="card-media">
    {content.photos.map((photo) => {
      return <img loading="lazy" data-blurhash={photo.blurhash} data-height={photo.height} data-width={photo.width} src={photo.url} alt='tweet photo' class="simple-image blurhash-actual-image" />
    })}
    </div>) : null}
    {content.videos.length > 0 ? (<div class="card-media">
    {content.videos.map((video) => {
      return <video
      poster={video.poster}
      class="card-video"
      data-ratio
      data-width={video.width}
      data-height={video.height}
      controls=""
      preload="none">
      <source src={video.url} type="video/mp4"/>
    </video>
    })}
    </div>) : null}
    <div class="card-footer">
      <a href={statusUrl} target='_top'>{postedDate}</a>
      {archiveUrl && [' ', <a href={archiveUrl} target='_top'>(archived)</a>]}
      {options.showLinks && <Fragment> - <a href={`/json/get/tweet/${props.data.id}`} target='_top'>as json</a> - <a href={`/get/tweet/${props.data.id}`} target='_top'>as html</a></Fragment>}
    </div>
  </div>;
}