/** @jsx jsx */
/** @jsxFrag  Fragment */
import { Fragment, jsx, JSXNode } from 'hono/jsx'
import { RenderOptions } from './RenderOptions'
import { resizeUrl, toIR, toSimpleText, toText } from './utils'
import { CardContent, CardMedia, CardNode, ImageNode, VideoNode } from 'document-ir'
interface TweetContent {
  name: string
  username: string
  timestamp: number
  text: string
  iso8601: string
  photos: {
    url: string
    width: number
    height: number
    blurhash: string
  }[],
  videos: {
    poster: string
    url: string
    webm?: string
    width: number
    height: number
    blurhash: string
  }[],
  icon: string
  banner?: string
  banner_blurhash?: string
  url?: string
  color?: string
}
interface TweetData {
  id: string,
  content: TweetContent
  archive: null | string
}

type Child = JSXNode | string | number | Child[]

function parseTweet(content: string) : Child[] {
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
      if (char.match(/[ \n;\)\()]/)) {
        if (top.includes('.')) {
          result.push(<a href={`http${secure ? 's' : ''}://${top}`} target='_top' rel='ugc noreferrer nofollow noopener'>{top}</a>);
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
    result.push(<a href={`https://twitter.com/${top}`} target='_top' rel='ugc noreferrer nofollow noopener'>@{top}</a>);
  } else if (mode == 'hashtag') {
    result.push(<a href={`https://twitter.com/hashtag/${top}`} target='_top' rel='ugc noreferrer nofollow noopener'>#{top}</a>);
  } else if (mode == 'link') {
    result.push(<a href={`http${secure ? 's' : ''}://${top}`} target='_top' rel='ugc noreferrer nofollow noopener'>{top}</a>);
  }
  for (let i = 0; i < result.length; i++) {
    let node = result[i];
    if (typeof node === 'string' && node.includes('\n')) {
      // rebuild this so all but the last line have a br
      const lines = node.split('\n');
      let replacement : Child[] = [];
      for (let j = 0; j < lines.length; j++) {
        
        if (j < lines.length - 1) {
          replacement.push(<>{lines[j]}{`\n`}<br /></>);
        } else {
          replacement.push(lines[j]);
        }
      }
      result[i] = replacement;
    }
  }
  if (result.length > 0) {
    // check the last if it is br
    let last = result[result.length - 1];
    if (last instanceof JSXNode && last.tag == 'br') {
      result.pop();
    }
    if (result.length > 0) {
      last = result[result.length - 1];
      // if the last is a string and its last character is \n, remove it
      if (typeof last === 'string' && last.endsWith('\n')) {
        result[result.length - 1] = last.trimEnd();
      }
    }
  }
  return result;
}



export async function TweetKind(props: {data: TweetData}, options: RenderOptions) {
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

  if (options.ir) {
    const result : CardNode = {
      type: 'card',
      header: {
        type: 'card-header',
        title: [{type: 'text', text: displayName}],
        username,
        usernameDomain: 'twitter.com',
        url: accountUrl,
        backgroundImage: header,
        backgroundColor: color,
        backgroundBlurhash: content.banner_blurhash,
        imageUrl: avatar
        // TODO imageBlurhash
      },
      attribution: {
        type: 'card-attribution',
        archiveUrl: props.data.archive || undefined,
        date: content.iso8601,
        url: statusUrl
      }
    };
    
    const cardContent : CardContent = {
      type: 'card-content',
      content: await toIR(htmlContent)
    };
    if (cardContent.content.length > 0) {
      result.content = cardContent;
    }
    if ((content.photos && content.photos.length > 0)
      || (content.videos && content.videos.length > 0)) {
        const mediaContent : (ImageNode | VideoNode)[] = [];
        if (content.photos) {
          for (let photo of content.photos) {
            mediaContent.push({
              type: 'image',
              alt: 'Photo included with tweet',
              url: photo.url,
              blurhash: photo.blurhash,
              width: photo.width,
              height: photo.height
            })
          }
        }
        if (content.videos) {
          for (let video of content.videos) {
            mediaContent.push({
              type: 'video',
              alt: 'Video included with tweet',
              mp4: video.url,
              webm: video.webm,
              poster: video.poster,
              blurhash: video.blurhash,
              width: video.width,
              height: video.height
            })
          }
      }
      const media : CardMedia = {
        type: 'card-media',
        content: mediaContent
      };
      result.media = media;
    }

    return result;
  }

  if (options.txt) {
    const title = `${displayName} (@${username}@twitter.com)`;
    let leftPad = '';
    let rightPad = '';
    if (title.length < 73) {
      const leftPadLength = Math.floor((71 - title.length) / 2)
      const rightPadLength = Math.ceil((71 - title.length) / 2)
      leftPad = ':'.repeat(Math.max(0, leftPadLength)) + ' ';
      rightPad = ' ' + ':'.repeat(Math.max(0, rightPadLength));
    }
    let body = [`${leftPad}${title}${rightPad}`];

    toText(htmlContent, body);

    let dateLine = `${postedDate}: ${statusUrl}`
    body.push(`:${' '.repeat(71)}:`);
    body.push(`: ${dateLine}${' '.repeat(Math.max(0, 70 - dateLine.length))}:`);


    body.push(':'.repeat(73))
    return body.join('\n');
  }

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

  if (header) {
    try {
      let headerUrl = new URL(header);
      headerUrl.searchParams.set('width', '645');
      header = headerUrl.toString();
    } catch (e) {
      console.error(e);
    }
  }

  return <div class="card">
    <div class="card-header-wrapper" data-has-background={(header != null || color) && true}>
      {header && (<div class="card-header-bg2" data-background={header} data-background-color={color}></div>)}
      <div class="card-header-fg">
        <a href={accountUrl} class="fediverse-link inline-flex" target='_top'>
          <div class="card-header">
            <div class="card-icon">
              <img loading="lazy" class="card-icon-image" src={avatar && avatar + '?width=64'} alt="" />
            </div>
          </div>
          <div class="card-header-content card-header-fg-glassy">
            <div class="card-header-name">{displayName}</div>
            <div class="card-header-description">
              <span class="fediverse-username">@{username}</span>
              <span class="fediverse-instance">@twitter.com</span>
            </div>
          </div>
        </a>
      </div>
    </div>
    {htmlContent && (<div class="card-content">
      {htmlContent}
    </div>)}
    {content.photos.length > 0 ? (<div class="card-media">
    {content.photos.map((photo) => {
      let {width, height, url} = resizeUrl(photo);
      return <img loading="lazy" data-blurhash={photo.blurhash} data-height={height} data-width={width} src={url} alt='tweet photo' class="simple-image blurhash-actual-image" />
    })}
    </div>) : null}
    {content.videos.length > 0 ? (<div class="card-media">
    {content.videos.map((video) => {
      let {width, height, url} = resizeUrl({
        width: video.width,
        height: video.height,
        url: video.poster
      });
      return <video
      poster={url}
      class="card-video"
      data-ratio
      data-width={video.width}
      data-height={video.height}
      controls=""
      preload="none">
      {video.webm && <source src={video.webm} type="video/webm" />}
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

export function TweetOEmbed(url: URL, props: {data: TweetData}) {
  const tweet = props.data;
  if (!tweet) {
    return <></>
  }
  const parsedHtml = parseTweet(tweet.content.text);
  const textList : string[] = [];
  toSimpleText(parsedHtml, textList);
  const description = textList.join('').replaceAll(/  +/g, ' ');
  const displayNameText = tweet.content.name;

  const date = new Date(tweet.content.iso8601);
  let imageUrl : string | undefined;
  let videoUrl : string | undefined;
  let videoWidth : number | undefined;
  let videoHeight : number | undefined;

  if (tweet.content.photos && tweet.content.photos.length > 0) {
    for (let media of tweet.content.photos) {
      imageUrl = media.url;
    }
  }
  if (tweet.content.videos && tweet.content.videos.length > 0) {
    for (let media of tweet.content.videos) {
      imageUrl = media.poster;
      videoUrl = media.url;
      videoHeight = media.height;
      videoWidth = media.width;
    }
  }

  return <>
  <meta property="og:type" content="website" />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url.toString()} />
  <meta property="og:title" content={`${displayNameText} ${date.toLocaleString()}`} />
  {imageUrl && <meta property="og:image" content={imageUrl} />}
  {videoUrl && <>
    <meta property="og:video" content={videoUrl} />
    <meta property="og:video:type" content="video/mp4" />
    <meta property="og:video:width" content={videoWidth} />
    <meta property="og:video:height" content={videoHeight} />
  </>}
  </>;
}