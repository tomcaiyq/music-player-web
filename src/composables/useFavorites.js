import { ref } from 'vue'
import { getFavoriteSet, toggleFavorite as dbToggleFavorite } from '../db.js'

// 全局共享的收藏 Set
const favorites = ref(new Set())

// 初始化加载
let loaded = false
async function ensureLoaded() {
  if (loaded) return
  favorites.value = await getFavoriteSet()
  loaded = true
}
ensureLoaded()

export function useFavorites() {
  // 接受 song 对象或 songId
  function resolveId(songOrId) {
    if (!songOrId) return null
    if (typeof songOrId === 'object') return songOrId.id
    return songOrId
  }

  // 同步判断是否收藏（模板里可直接用）
  function isFavorite(songOrId) {
    const id = resolveId(songOrId)
    if (!id) return false
    return favorites.value.has(id)
  }

  // 切换收藏状态
  async function toggleFavorite(songOrId) {
    const id = resolveId(songOrId)
    if (!id) return
    await dbToggleFavorite(id)
    favorites.value = await getFavoriteSet()
  }

  async function loadFavorites() {
    favorites.value = await getFavoriteSet()
    loaded = true
  }

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    loadFavorites,
  }
}
