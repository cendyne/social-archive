/** @jsx jsx */
/** @jsxFrag  Fragment */
import { jsx, JSXNode, Fragment } from 'hono/jsx'
import { RenderOptions } from './RenderOptions'
import { resizeUrl } from './utils'

interface TootEmoji {
  shortcode: string,
  url: string,
  width: number,
  height: number
}
interface TootField {
  name: string,
  value: string,
  verified_at: string | null
}
interface TootAccount {
  username: string,
  display_name: string,
  url: string,
  avatar: string,
  header: string,
  emojis: TootEmoji[],
  avatar_blurhash: string,
  header_blurhash: string,
}
interface TootCard {
  url: string,
  title: string,
  type: 'link',
  description: string,
  image: string | null,
  width: number | null,
  height: number | null,
  blurhash: string | null
}
interface TootMention {
  username: string
  url: string
  acct: string
}
interface ImageMeta {
  width: number,
  height: number,
  aspect: number
}
interface VideoMeta {
  frame_rate: string,
  duration: number,
  bitrate: number
}
interface ImageFocus {
  x: number,
  y: number
}
interface TootAttachmentImage {
  type: 'image'
  url: string,
  blurhash: string,
  description: string,
  meta: {
    original: ImageMeta,
    small: ImageMeta,
    focus: ImageFocus,
  }
}
interface TootAttachmentVideo {
  type: 'video'
  url: string,
  preview_url: string,
  blurhash: string,
  description: string,
  meta: {
    original: ImageMeta & VideoMeta,
    small: ImageMeta,
    focus: ImageFocus
  }
}
type TootAttachment = TootAttachmentImage | TootAttachmentVideo;
interface Toot {
  id: string,
  created_at: string,
  url: string,
  content: string,
  emojis: TootEmoji[],
  mentions: TootMention[],
  account: TootAccount,
  card: TootCard | null,
  media_attachments: TootAttachment[]
  replies_count: number,
  reblogs_count: number,
  favourites_count: number,
}
type EmojiMap = {[key: string]: TootEmoji};

type Child = JSXNode | string | number | Child[]

function parseEmojis(emojis: EmojiMap, text: string) : Child[] {
  let top = '';
  let output = [];
  let mode : 'text' | 'shortcode' = 'text'
  for (let char of text) {
    if (mode == 'text') {
      if (char == ':') {
        mode = 'shortcode';
        // console.log(`Pushing ${top}`)
        output.push(top);
        top = '';
        continue;
      }
      top += char;
    } else if (mode == 'shortcode') {
      if (char == ':') {
        if (top == ':') {
          // Don't freak out on ::
          mode = 'text';
          top += ':';
          continue;
        }
        mode = 'text';
        let emoji = emojis[top];
        if (emoji) {
          output.push(<img src={`${emoji.url}?width=16`} draggable="false" class="custom-emoji" alt={top}/>);
        } else {
          output.push(`:${top}:`)
        }
        // console.log(`Emoji ${top}`)
        top = '';
        continue;
      } else if (!char.match(/^[a-zA-Z0-9_\-]$/)) {
        // Not a valid short code
        mode = 'text';
        top += char;
        continue;
      }
      top += char;
    }
  }
  if (top.length > 0) {
    if (mode == 'text') {
      output.push(top);
    } else if (mode == 'shortcode') {
      output.push(`:${top}`);
    }
  }
  return output;
}

const SELF_CLOSING: {[k: string]: boolean} = {
  'br': true,
  'hr': true,
  'img': true,
  'source': true,
  'meta': true,
  'input': true,
  'link': true,
  'param': true,
  'track': true,
  'embed': true,
}
const SAFE_TAGS: {[k: string]: boolean} = {
  'br': true,
  'hr': true,
  'source': true,
  'picture': true,
  // 'img': true,
  'abbr': true,
  'acronym': true,
  'b': true,
  'blockquote': true,
  'code': true,
  'div': true,
  'em': true,
  'i': true,
  'li': true,
  'ol': true,
  'p': true,
  'span': true,
  'strong': true,
  'table': true,
  'td': true,
  'tr': true,
  'ul': true,
  'a': true,
}
const SAFE_ATTRIBUTES : {[k: string]: boolean} = {
  'href': true,
  'src': true,
}

function isSelfClosing(name: string) : boolean {
  return SELF_CLOSING[name] || false;
}

const HtmlEntityNode = class extends JSXNode {
  private entity: string;
  constructor(entity: string) {
    super('', {}, []);
    this.entity = entity;
  }
  toStringToBuffer(buffer: [string]) {
    buffer[0] += `&${this.entity};`
  }
};

type HtmlMode = 'text' | 'tag-open' | 'tag-close' | 'tag-self-close' | 'attribute-name' |  'attribute-value' | 'attribute-value-quoted' | 'entity';
function parseHtml(text: string) : Child {
  let mode : HtmlMode = 'text';
  let stack: JSXNode[] = [<Fragment></Fragment>];
  let top = '';
  let lastTagBegun = 0;
  let index = 0;
  let attributeName = '';
  let lastMode : HtmlMode = 'text';
  //console.log(text)
  for (let char of text) {
    const thisIndex = index++;
    if (mode != lastMode) {
      //console.log(`Mode switched to ${mode} on index ${thisIndex}`);
      lastMode = mode;
    }
    if (mode == 'text') {
      if (char == '<') {
        //console.log('168: Opening tag');
        lastTagBegun = thisIndex;
        mode = 'tag-open';
        stack[stack.length - 1].children.push(top)
        top = '';
        continue;
      } else if (char == '&') {
        mode = 'entity';
        stack[stack.length - 1].children.push(top)
        top = '';
        continue;
      }
      top += char;
    } else if (mode == 'entity') {
      if (char == ';') {
        stack[stack.length - 1].children.push(new HtmlEntityNode(top));
        mode = 'text';
        top = '';
        continue;
      } else if (char == ' ' || char == '<' || char == '>') {
        // bail out.
        mode = 'text';
        stack[stack.length - 1].children.push(`&${top}`)
        top = '';
      }
      top += char;
    } else if (mode == 'tag-open') {
      if (char == '>') {
        //console.log(`196: Closing open ${top}`);
        if (top == '') {
          //console.log('???? empty top?')
        }
        let tag = jsx(top, {});
        stack.push(tag);
        //console.log(`202: Stack size: ${stack.length}`)
        mode = 'text';
        top = '';
        continue;
      } else if (char == ' ') {
        //console.log(`203: attributes! ${top}`);
        if (top == '') {
          //console.log('???? empty top?')
        }
        let tag = jsx(top, {});
        stack.push(tag);
        //console.log(`213: Stack size: ${stack.length}`)
        mode = 'attribute-name';
        top = '';
        continue;
      } else if (char == '/') {
        if (top.length > 0) {
          //console.log(`225: Closing open tag '${top}'`)
          let tag = jsx(top, {});
          stack.push(tag);
          //console.log(`228: Stack size: ${stack.length}`)
          mode = 'tag-self-close';
          top = '';
        } else {
          mode = 'tag-close'
        }
        continue;
      }
      top += char;
    } else if (mode == 'tag-close') {
      if (char == '>') {
        if (top.length > 0) {
          let foundTag = null;
          let popCount = 0;
          for (let i = stack.length - 1; i >= 0; i--) {
            popCount++;
            if (stack[i].tag == top) {
              foundTag = stack[i];
              break;
            }
          }
          // Auto close several if they were left open.
          // console.log(`241: Closing ${popCount} tags`)
          if (foundTag) {
            for (let i = 0; i < popCount; i++) {
              if (stack.length <= 1) {
                break;
              }
              let element = stack.pop();
              if (element) {
                stack[stack.length - 1].children.push(element);
                // console.log(`259: Committed '${element.tag}'!`)
              }
            }
          }
        } else {
          // Remove the last one I guess
          if (stack.length > 1) {
            stack.pop();
          }
        }
        mode = 'text'
        top = '';
        continue;
      }
      top += char;
    } else if (mode == 'tag-self-close') {
      if (char == '>') {
        if (stack.length > 1) {
          // Commit this tag
          //console.log(`278: Commit the tag! ${stack[stack.length - 1].tag}`)
          stack[stack.length - 2].children.push(stack[stack.length - 1]);
          stack.pop();
        }
        mode = 'text';
        continue;
      }
      // Remove the in progress tag since it is not well formed
      stack.pop();
      // Oops? Restore best effort
      stack[stack.length - 1].children.push(text.slice(lastTagBegun, thisIndex + 1));
      mode = 'text';
    } else if (mode == 'attribute-name') {
      if (char == '>') {
        //console.log(`292: Closing tag '${stack[stack.length - 1].tag}'`)
        if (top.length > 0) {
          stack[stack.length - 1].props[top] = true;
        }
        let tagName = stack[stack.length - 1].tag;
        // Don't keep self closing tags on the stack
        if (typeof tagName == 'string') {
          if (isSelfClosing(tagName)) {
            // Commit this tag
            //console.log(`301: Commit the tag! '${stack[stack.length - 1].tag}'`)
            stack[stack.length - 2].children.push(stack[stack.length - 1]);
            stack.pop();
          }
        } else if (isSelfClosing(tagName())){
          //console.log(`307: Commit the tag! '${stack[stack.length - 1].tag}'`)
          stack[stack.length - 2].children.push(stack[stack.length - 1]);
          stack.pop();
        }
        mode = 'text';
        continue;
      } else if (char == '/') {
        if (top.length > 0) {
          stack[stack.length - 1].props[top] = true;
        }
        //console.log('316: Attribute self close')
        mode = 'tag-self-close';
        continue;
      } else if (char == ' ') {
        if (top.length > 0) {
          stack[stack.length - 1].props[top] = true;
        }
        continue;
      } else if (char == '=') {
        //console.log('294: Attribute name:', top);
        attributeName = top;
        mode = 'attribute-value';
        top = '';
        continue;
      } else if (char == '"') {
        //console.log('Not well formed')
        // Remove the in progress tag since it is not well formed
        stack.pop();
        // Oops? Restore best effort
        stack[stack.length - 1].children.push(text.slice(lastTagBegun, thisIndex + 1));
        mode = 'text';
        continue;
      }
      top += char;
    } else if (mode == 'attribute-value') {
      if (char == '"') {
        if (top == '') {
          mode = 'attribute-value-quoted';
        } else {
          //console.log('Not well formed')
          // Remove the in progress tag since it is not well formed
          stack.pop();
          // Oops? Restore best effort
          stack[stack.length - 1].children.push(text.slice(lastTagBegun, thisIndex + 1));
          mode = 'text';
        }
        continue;
      } else if (char == ' ') {
        stack[stack.length - 1].props[attributeName] = top;
        mode = 'attribute-name'
        top = '';
        continue;
      } else if (char == '/') {
        stack[stack.length - 1].props[attributeName] = top;
        mode = 'tag-self-close'
        top = '';
        continue;
      } else if (char == '>') {
        //console.log('364: Setting attribute', attributeName, top)
        stack[stack.length - 1].props[attributeName] = top;
        //console.log('366: closing tag', stack[stack.length - 1].tag)
        if (stack.length > 1) {
          // Commit this tag
          //console.log(`369: Commit the tag! ${stack[stack.length - 1].tag}`)
          stack[stack.length - 2].children.push(stack[stack.length - 1]);
        }
        let tagName = stack[stack.length - 1].tag;
        // Don't keep self closing tags on the stack
        if (typeof tagName == 'string') {
          if (isSelfClosing(tagName)) {
            stack.pop();
          }
        } else if (isSelfClosing(tagName())){
          stack.pop();
        }
        mode = 'text'
        top = '';
        continue;
      }
      top += char;
    } else if (mode == 'attribute-value-quoted') {
      if (char == '"') {
        //console.log('388: Setting attribute', attributeName, top);
        stack[stack.length - 1].props[attributeName] = top;
        mode = 'attribute-name'
        top = '';
        continue;
      }
      top += char;
    }
  }
  //console.log(`397: Stack length ${stack.length}`)
  //console.log(stack[0].children)
  return stack[0];
}

function sanitizeAndAddEmojis(emojis: EmojiMap, node: Child, depth: number) : Child | null {
  // const prefix = '                              '.slice(0, depth * 2);
  if (node == null || node == undefined) {
    return null;
  } else if (typeof node == 'string') {
    return parseEmojis(emojis, node);
  } else if (node instanceof JSXNode) {
    let tag : string;
    let fragment = false;
    // console.log(`${prefix}Looking at tag`);
    if (typeof node.tag == 'string') {
      // console.log(`${prefix}Found`, node.tag)
      tag = node.tag
      if (tag == '') {
        fragment = true;
      }
    } else {
      tag = node.tag({});
      if (tag == '') {
        fragment = true;
      }
    }
    // if (fragment) {
    //   console.log(`${prefix}Found fragment`)
    // } else {
    //   console.log(`${prefix}Found tag '${tag}'`)
    // }
    let children = [];
    for (let child of (node.children || [])) {
      let sanitized = sanitizeAndAddEmojis(emojis, child, depth + 1);
      if (sanitized != null) {
        children.push(sanitized);
      }
    }

    // tag = 't'
    let nodeProps = node.props || {};
    let props : {[k:string]: any} = {};
    for (let [k, v] of Object.entries(nodeProps)) {
      if (SAFE_ATTRIBUTES[k]) {
        props[k] = v;
      }
    }

    if (tag == 'a') {
      props['rel'] = 'ugc noreferer nofollow noopener'
      props['target'] = '_top';
    }

    if (tag == 'span') {
      let nodeClass = nodeProps['class'] || '';
      // Skip if the content is intended to be invisible
      if (nodeClass.includes('invisible')) {
        return null;
      } else if (nodeClass.includes('ellipsis')) {
        return [...children, '...'];
      }
      // We don't care to inline span.
      return children;
    } else if (fragment) {
      // flatten
      if (children.length == 0) {
        // console.log(`${prefix}Empty Fragment`)
        return null;
      }
      // console.log(`${prefix}Returning fragment`, children)
      return children;
    } else if (!SAFE_TAGS[tag]) {
      // console.log(`${prefix}Unsafe tag ${tag}`);
      return children;
    } else if (SELF_CLOSING[tag]) {
      // console.log(`${prefix}Self closing`)
      return jsx(tag, props);
    } else {
      if (children.length == 0) {
        // Do not return empty for non self closing tags
        // console.log(`${prefix}Empty Tag`)
        return null;
      }
      let newNode = jsx(tag, props);
      newNode.children = children;
      // console.log(`${prefix}Children set?` ,  newNode.children)
      return newNode;
    }
  } else {
    // console.log(`${prefix}Returning node as is`, node)
    return node;
  }
}

interface TootData {
  id: string,
  content: Toot,
  archive: string | null
}

export function TootKind(props: {data: TootData}, options: RenderOptions) {
  let content = props.data.content;
  let date = new Date(content.created_at);
  let accountUrl = content.account.url;
  let {hostname} = new URL(accountUrl);
  let username = content.account.username;
  let displayNameText = content.account.display_name;
  let avatar = content.account.avatar;
  let header = content.account.header;
  let statusUrl = content.url;
  let media = content.media_attachments;

  let emojis : EmojiMap = {};
  for (let emoji of content.emojis) {
    emojis[emoji.shortcode] = emoji;
  }
  for (let emoji of content.account.emojis) {
    emojis[emoji.shortcode] = emoji;
  }
  let displayName = parseEmojis(emojis, displayNameText);
  let parsedHtml = parseHtml(content.content);
  let postedDate = date.toLocaleString();
  let htmlContent;
  try {
    htmlContent = sanitizeAndAddEmojis(emojis, parsedHtml, 0);
  } catch (e) {
    htmlContent = parsedHtml;
    console.error(e);
  }
  if (htmlContent) {
    if (typeof htmlContent == 'string') {
      if (htmlContent == '') {
        htmlContent = null;
      }
    } else if (Array.isArray(htmlContent)) {
      if (htmlContent.length == 0) {
        htmlContent = null;
      }
    }
  }
  let archiveUrl = props.data.archive || null;

  if (options.rss) {
    return <blockquote>
      <p>{htmlContent}</p>
      {content.media_attachments.map((media) => {
        if (media.type == 'image') {
          let {width, height, url} = resizeUrl({
            url: media.url,
            width: media.meta.original.width,
            height: media.meta.original.height
          });
          return <p>
            <img loading="lazy" width={width} height={height} src={url} alt={media.description}/>
          </p>
        } else if (media.type == 'video') {
          let {width, height, url} = resizeUrl({
            url: media.preview_url,
            width: media.meta.original.width,
            height: media.meta.original.height
          });
          return <p>
            <img loading="lazy" width={width} height={height} src={url} alt={media.description} /><br />
            <small><em>See website for video</em></small>
          </p>
        } else {
          return 'UNSUPPORTED MEDIA';
        }
      })}
      <strong><a href={accountUrl}>{displayName} (@{username}@{hostname})</a></strong>
      {' '}
      <a href={statusUrl}>{postedDate}</a>
      {archiveUrl && [' ', <a href={archiveUrl}>(archived)</a>]}
    </blockquote>
  }

  return <div class="card">
    <div class="card-header-bg" data-background={header}>
      <a href={accountUrl} class="fediverse-link inline-flex" target='_top'>
        <div class="card-header">
          <div class="card-icon">
            <img loading="lazy" class="card-icon-image" src={avatar + '?width=64'} />
          </div>
        </div>
        <div class="card-header-content">
          <div class="card-header-name">{displayName}</div>
          <div class="card-header-description">
            <span class="fediverse-username">@{username}</span>
            <span class="fediverse-instance">@{hostname}</span>
          </div>
        </div>
      </a>
    </div>
    {htmlContent && (<div class="card-content">
      {htmlContent}
    </div>)}
    {media.length > 0 ? (<div class="card-media">
      {media.map((m) => {
        if (m.type == 'image') {
          return <div data-blurhash={m.blurhash} data-height={m.meta.original.height} data-width={m.meta.original.width} class="blurhash-parent">
            <img loading="lazy" width={m.meta.original.width} height={m.meta.original.height} src={m.url} alt={m.description} class="simple-image blurhash-actual-image" />
          </div>
        } else if (m.type == 'video') {
          return <video
            poster={m.preview_url}
            class="card-video"
            data-ratio
            data-width={m.meta.original.width}
            data-height={m.meta.original.height}
            controls=""
            preload="none">
            <source src={m.url} type="video/mp4"/>
          </video>
        } else {
          return null;
        }
      })}
    </div>) : null}
    <div class="card-footer">
      <a href={statusUrl} target='_top'>{postedDate}</a>
      {archiveUrl && [' ', <a href={archiveUrl} target='_top'>(archived)</a>]}
      {options.showLinks && <Fragment> - <a href={`/json/get/toot/${props.data.id}`} target='_top'>as json</a> - <a href={`/get/toot/${props.data.id}`} target='_top'>as html</a></Fragment>}
    </div>
  </div>;
}