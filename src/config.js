/**
 * CORS 代理配置
 * 浏览器直接请求 gequhai.com 会被跨域阻止，通过代理转发
 *
 * 优先级（从高到低）：
 * 1. localStorage 中 'cors_proxy' 的值（运行时修改，无需重新构建）
 * 2. 空字符串（表示不使用代理，直接请求）
 */

export function getCorsProxy() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('cors_proxy') || ''
  }
  return ''
}

export function setCorsProxy(url) {
  localStorage.setItem('cors_proxy', url || '')
}

export const MUSIC_SOURCE = 'https://www.gequhai.com'
export const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'

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
