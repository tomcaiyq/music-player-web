/**
 * CORS 代理配置
 * 浏览器直接请求 gequhai.com 会被跨域阻止，通过代理转发
 *
 * 优先级（从高到低）：
 * 1. localStorage 中 'cors_proxy' 的值（运行时修改，无需重新构建）
 * 2. 默认值：https://corsproxy.io/?url=
 */

const DEFAULT_PROXY = 'https://corsproxy.io/?url='

export function getCorsProxy() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('cors_proxy') || DEFAULT_PROXY
  }
  return DEFAULT_PROXY
}

export function setCorsProxy(url) {
  localStorage.setItem('cors_proxy', url || '')
}

/**
 * 是否运行在 Capacitor 原生平台（Android/iOS）
 * WebView 中会注入 window.Capacitor 全局对象，isNativePlatform() 返回 true
 *
 * 用于区分：
 *  - Web 端：走 /api/yymp3、/api/ting123 同源代理（dev: vite proxy，prod: server.js）
 *  - 原生端：启用 CapacitorHttp 插件后，fetch 直接发原始 URL，
 *            走原生网络层绕过 WebView CORS 限制，无需任何代理
 */
export function isNativePlatform() {
  return typeof window !== 'undefined'
    && !!window.Capacitor
    && typeof window.Capacitor.isNativePlatform === 'function'
    && window.Capacitor.isNativePlatform() === true
}

/**
 * 将外部 URL 转为可 fetch 的 URL
 *  - Web 平台：走同源路径 /api/yymp3、/api/ting123（dev: vite proxy，prod: server.js）
 *  - 原生平台：直接返回原始 URL（CapacitorHttp 插件已 patch fetch，绕过 CORS）
 */
export function proxyUrl(url) {
  if (isNativePlatform()) {
    return url
  }
  if (url.startsWith('https://www.yymp3.com/')) {
    return url.replace('https://www.yymp3.com', '/api/yymp3')
  }
  if (url.startsWith('https://ting123.yymp3.net/')) {
    return url.replace('https://ting123.yymp3.net', '/api/ting123')
  }
  return url
}

export const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'

// 搜歌 API 配置 (cn.apihz.cn)
export const SONG_SEARCH_API = 'https://cn.apihz.cn/api/fun/souge.php'
export const SEARCH_API_ID = '10018685'
export const SEARCH_API_KEY = '282dee43281051f75448297241860ea0'
export const MP3_BASE_URL = 'https://ting123.yymp3.net'

/**
 * 默认封面（200x200 渐变背景 + 音符图案）
 */
export const DEFAULT_COVER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
  '<defs>' +
  '<linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">' +
  '<stop offset="0%" style="stop-color:#667eea"/>' +
  '<stop offset="100%" style="stop-color:#764ba2"/>' +
  '</linearGradient>' +
  '</defs>' +
  '<rect width="200" height="200" fill="url(#g)" rx="8"/>' +
  '<g transform="translate(100,100)" fill="rgba(255,255,255,0.85)">' +
  '<circle cx="0" cy="20" r="18" fill="rgba(255,255,255,0.3)"/>' +
  '<path d="M-8 20 L-8 -35 L25 -28 L25 15" stroke="white" stroke-width="4" fill="none" stroke-linejoin="round" stroke-linecap="round"/>' +
  '<circle cx="25" cy="15" r="16" fill="rgba(255,255,255,0.3)"/>' +
  '<circle cx="-8" cy="20" r="10" fill="white"/>' +
  '<circle cx="25" cy="15" r="9" fill="white"/>' +
  '</g>' +
  '</svg>'
)

/**
 * 默认用户头像（80x80 渐变圆形）
 */
export const DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">' +
  '<defs>' +
  '<linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="100%">' +
  '<stop offset="0%" style="stop-color:#667eea"/>' +
  '<stop offset="100%" style="stop-color:#764ba2"/>' +
  '</linearGradient>' +
  '</defs>' +
  '<circle cx="40" cy="40" r="40" fill="url(#a)"/>' +
  '<circle cx="40" cy="32" r="14" fill="rgba(255,255,255,0.85)"/>' +
  '<path d="M14 70 Q14 48 40 48 Q66 48 66 70" fill="rgba(255,255,255,0.85)"/>' +
  '</svg>'
)

/**
 * 通过 CORS 代理请求
 * 如果未配置代理，直接请求原始 URL
 */
export async function proxyFetch(url, options = {}) {
  const proxy = getCorsProxy()
  const fetchUrl = proxy ? proxy + encodeURIComponent(url) : url

  return fetch(fetchUrl, {
    ...options,
    headers: {
      'User-Agent': UA,
      ...options.headers
    }
  })
}
