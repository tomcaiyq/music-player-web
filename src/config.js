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
 *  - Capacitor 原生端：启用 CapacitorHttp 插件后，fetch 直接发原始 URL，
 *            走原生网络层绕过 WebView CORS 限制，无需任何代理
 *  - Tauri 桌面端：用 @tauri-apps/plugin-http 的 fetch 绕过 CORS
 */
export function isNativePlatform() {
  return typeof window !== 'undefined'
    && !!window.Capacitor
    && typeof window.Capacitor.isNativePlatform === 'function'
    && window.Capacitor.isNativePlatform() === true
}

/**
 * 是否运行在 Tauri 桌面端
 * Tauri 会在 window 上注入 __TAURI_INTERNALS__ 对象
 */
export function isTauriPlatform() {
  return typeof window !== 'undefined'
    && '__TAURI_INTERNALS__' in window
}

/**
 * 统一的 fetch 包装：
 *  - Tauri 环境：用 @tauri-apps/plugin-http 的 fetch（走 Rust 原生网络层，绕过 CORS）
 *  - 其他环境（Web / Capacitor）：用原生 fetch
 *  - Capacitor 原生平台已 patch fetch，所以也走原生 fetch
 */
let _tauriFetch = null
async function getTauriFetch() {
  if (_tauriFetch !== null) return _tauriFetch
  if (!isTauriPlatform()) {
    _tauriFetch = false
    return false
  }
  try {
    const mod = await import('@tauri-apps/plugin-http')
    _tauriFetch = mod.fetch
    return _tauriFetch
  } catch (e) {
    console.warn('Failed to load @tauri-apps/plugin-http:', e)
    _tauriFetch = false
    return false
  }
}

/**
 * 统一 fetch 包装。签名与原生 fetch 一致。
 *  - Tauri 环境：走 plugin-http
 *  - 其他：原生 fetch
 */
export async function unifiedFetch(url, options = {}) {
  if (isTauriPlatform()) {
    const tFetch = await getTauriFetch()
    if (tFetch) return tFetch(url, options)
  }
  return fetch(url, options)
}

/**
 * 将外部 URL 转为可 fetch 的 URL
 *  - Web 平台：走同源路径 /api/yymp3、/api/ting123（dev: vite proxy，prod: server.js）
 *  - 原生平台（Capacitor/Tauri）：直接返回原始 URL（fetch 已被 patch 或用 plugin-http）
 */
export function proxyUrl(url) {
  if (isNativePlatform() || isTauriPlatform()) {
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

/**
 * 初始化原生平台安全区（状态栏 + 底部导航栏）
 *
 * 安卓 WebView 不支持 env(safe-area-inset-*)，需通过插件 / viewport 动态获取：
 *  - 顶部：用 @capacitor/status-bar 的 getInfo() 获取状态栏高度
 *  - 底部：监听 visualViewport.resize，计算 window.innerHeight - visualViewport.height
 *
 * 把实际像素值写入 :root 的 CSS 变量：
 *  - --ncm-safe-top
 *  - --ncm-safe-bottom
 *
 * Web/Tauri 端调用为 no-op，保留 env() 默认值。
 */
export async function initSafeArea() {
  if (!isNativePlatform()) return

  // 顶部状态栏
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    const info = await StatusBar.getInfo()
    if (info && typeof info.height === 'number') {
      // height 单位为像素（已转换为 CSS px）
      document.documentElement.style.setProperty('--ncm-safe-top', info.height + 'px')
    }
  } catch (e) {
    console.warn('StatusBar plugin unavailable:', e)
  }

  // 底部导航栏：通过 visualViewport 推算
  // 安卓底部地址栏/导航栏会导致 visualViewport.height < window.innerHeight
  function updateBottomInset() {
    const vv = window.visualViewport
    if (!vv) return
    const inset = Math.max(0, window.innerHeight - vv.height)
    document.documentElement.style.setProperty('--ncm-safe-bottom', inset + 'px')
  }
  updateBottomInset()
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateBottomInset)
  }
}

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
