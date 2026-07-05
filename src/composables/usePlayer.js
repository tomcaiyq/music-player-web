import { computed, reactive, readonly, ref, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getLyrics as getLyricsFromDB, getSong as getSongById } from '../db.js'
import { useFavorites } from './useFavorites'

// 单例 Audio 元素
const audio = new Audio()
audio.volume = 0.7

// 播放列表状态
const songs = reactive([])
const currentIndex = ref(-1)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.7)
const seeking = ref(false)
const playMode = ref(localStorage.getItem('playMode') || 'sequential')
const showLyrics = ref(false)
const lyricsOrigin = ref({ x: 0, y: 0 })

// 计算属性：当前歌曲
const currentSong = computed(() => {
  if (currentIndex.value >= 0 && currentIndex.value < songs.length) {
    return songs[currentIndex.value]
  }
  return null
})

const { favorites, isFavorite, toggleFavorite } = useFavorites()

// 持久化
const STORAGE_KEY = 'ncm_playlist'
function loadPlaylist() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      const parsed = JSON.parse(data)
      songs.splice(0, songs.length, ...(parsed.songs || []))
      currentIndex.value = parsed.currentIndex ?? -1
    }
  } catch (e) {
    console.warn('Failed to load playlist:', e)
  }
}
function savePlaylist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      songs: songs.map(s => ({ ...s })),
      currentIndex: currentIndex.value
    }))
  } catch (e) {
    console.warn('Failed to save playlist:', e)
  }
}
loadPlaylist()
// 刷新后恢复 audio.src（只加载元数据，不自动播放，浏览器会拦截自动播放）
if (currentIndex.value >= 0 && songs[currentIndex.value]) {
  const song = songs[currentIndex.value]
  getAudioSrc(song).then(src => {
    if (src) {
      audio.src = src
      audio.load()  // 触发 loadedmetadata，恢复 duration
    }
  }).catch(() => {})
}
watch(() => [songs.length, currentIndex.value], savePlaylist, { deep: true })
watch(playMode, val => localStorage.setItem('playMode', val))
watch(volume, val => { audio.volume = val })

// 内部：获取音频源 URL（优先用本地 blob，避免依赖第三方链接）
async function getAudioSrc(song) {
  // 1. 优先用本地 blob（已下载保存的）
  if (song.audioBlob instanceof Blob) {
    return URL.createObjectURL(song.audioBlob)
  }
  // 2. 其次用已缓存的 url（同一会话内）
  if (song.url) return song.url
  // 3. 兜底：从数据库重新读取（刷新后内存丢失，但 DB 里有）
  if (song.id) {
    const record = await getSongById(song.id)
    if (record?.audioBlob instanceof Blob) {
      song.audioBlob = record.audioBlob
      return URL.createObjectURL(song.audioBlob)
    }
    if (record?.audioUrl) {
      song.url = record.audioUrl
      return song.url
    }
  }
  // 4. 在线歌曲懒加载：调用方注册的回调（如 SearchView 拉取 audioUrl）
  if (typeof onMissingSrcCallback === 'function') {
    try {
      const url = await onMissingSrcCallback(song)
      if (url) {
        song.url = url
        return url
      }
    } catch (e) {
      console.warn('onMissingSrc callback failed:', e.message)
    }
  }
  return null
}

// 在线歌曲缺音频源时的懒加载回调（由搜索页等注册）
let onMissingSrcCallback = null
function setOnMissingSrc(fn) {
  onMissingSrcCallback = fn
}

// Audio 事件监听
function onTimeUpdate() {
  if (!seeking.value) {
    currentTime.value = audio.currentTime
  }
}
function onLoadedMetadata() {
  duration.value = audio.duration || 0
}
function onPlay() { isPlaying.value = true }
function onPause() { isPlaying.value = false }
function onEnded() { autoNextSong() }
function onError() {
  console.error('Audio error')
  ElMessage.error('播放失败，尝试下一首')
  autoNextSong()
}

audio.addEventListener('timeupdate', onTimeUpdate)
audio.addEventListener('loadedmetadata', onLoadedMetadata)
audio.addEventListener('play', onPlay)
audio.addEventListener('pause', onPause)
audio.addEventListener('ended', onEnded)
audio.addEventListener('error', onError)

// 内部：自动播放下一首（遵循播放模式）
function autoNextSong() {
  if (songs.length === 0) return
  if (playMode.value === 'single') {
    audio.currentTime = 0
    audio.play().catch(() => {})
    return
  }
  let nextIndex
  if (playMode.value === 'random') {
    if (songs.length === 1) {
      nextIndex = 0
    } else {
      do {
        nextIndex = Math.floor(Math.random() * songs.length)
      } while (nextIndex === currentIndex.value)
    }
  } else {
    nextIndex = (currentIndex.value + 1) % songs.length
  }
  playAt(nextIndex)
}

// 播放指定索引的歌曲
async function playAt(index) {
  if (index < 0 || index >= songs.length) return
  currentIndex.value = index
  const song = songs[index]
  const src = await getAudioSrc(song)
  if (!src) {
    ElMessage.error('获取播放地址失败')
    return
  }
  audio.src = src
  audio.currentTime = 0
  await audio.play().catch(() => {})
  showLyrics.value = true
  lyricsOrigin.value = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  fetchLyrics(song)
}

// 添加歌曲到播放列表并播放
async function playSong(song) {
  const existingIndex = songs.findIndex(s => s.id === song.id)
  if (existingIndex !== -1) {
    await playAt(existingIndex)
    return
  }
  songs.push(song)
  await playAt(songs.length - 1)
}

// 切换播放/暂停
function togglePlay() {
  // 无歌曲时提示并返回，不切换状态
  if (songs.length === 0 || !currentSong.value) {
    ElMessage({ message: '暂无歌曲播放', type: 'info', duration: 1200 })
    return
  }
  // src 为空（如刷新后）且存在当前歌曲时，重新获取并播放
  if (!audio.src && currentSong.value) {
    playAt(currentIndex.value)
    return
  }
  if (audio.paused) {
    audio.play().catch(() => {})
  } else {
    audio.pause()
  }
}

// 上一首（顺序模式，忽略播放模式）
function prevSong() {
  if (songs.length === 0) return
  const prevIndex = (currentIndex.value - 1 + songs.length) % songs.length
  playAt(prevIndex)
}

// 下一首（顺序模式，忽略播放模式）
function nextSong() {
  if (songs.length === 0) return
  const nextIndex = (currentIndex.value + 1) % songs.length
  playAt(nextIndex)
}

// 跳转进度
function seek(time) {
  audio.currentTime = time
}

// 设置音量
function setVolume(val) {
  volume.value = val
}

// 设置播放模式
function setPlayMode(mode) {
  playMode.value = mode
}

// 清空播放列表
function clearAll() {
  songs.splice(0)
  currentIndex.value = -1
  audio.pause()
  audio.src = ''
  currentTime.value = 0
  duration.value = 0
  isPlaying.value = false
  showLyrics.value = false
}

// 从播放列表移除
function removeFromPlaylist(index) {
  if (index < 0 || index >= songs.length) return
  const wasCurrent = index === currentIndex.value
  const wasBefore = index < currentIndex.value
  songs.splice(index, 1)
  if (wasCurrent) {
    if (songs.length === 0) {
      currentIndex.value = -1
      audio.pause()
      audio.src = ''
      currentTime.value = 0
      duration.value = 0
      isPlaying.value = false
    } else {
      const newIndex = Math.min(index, songs.length - 1)
      playAt(newIndex)
    }
  } else if (wasBefore) {
    currentIndex.value--
  }
}

// 获取歌词（优先用内存中已有的，其次从 DB 读取）
async function fetchLyrics(song) {
  if (song.lrc) return
  if (!song.id) {
    song.lrc = ''
    return
  }
  try {
    const lrc = await getLyricsFromDB(song.id)
    song.lrc = lrc || ''
  } catch (e) {
    console.warn('Failed to fetch lyrics:', e)
    song.lrc = ''
  }
}

// 设置播放列表（供 HomeView/SearchView 使用）
function setSongs(newSongs) {
  songs.splice(0, songs.length, ...newSongs)
  if (newSongs.length > 0 && currentIndex.value === -1) {
    currentIndex.value = 0
  }
}

// 通过 ID 播放歌曲（保持兼容性）
async function playSongById(songId) {
  const index = songs.findIndex(s => s.id === songId)
  if (index !== -1) await playAt(index)
}

// 切换歌词面板
function toggleLyrics(origin = { x: window.innerWidth / 2, y: window.innerHeight / 2 }) {
  showLyrics.value = !showLyrics.value
  if (showLyrics.value) {
    lyricsOrigin.value = origin
  }
}

// 清理
onUnmounted(() => {
  audio.pause()
  audio.src = ''
  audio.removeEventListener('timeupdate', onTimeUpdate)
  audio.removeEventListener('loadedmetadata', onLoadedMetadata)
  audio.removeEventListener('play', onPlay)
  audio.removeEventListener('pause', onPause)
  audio.removeEventListener('ended', onEnded)
  audio.removeEventListener('error', onError)
})

export function usePlayer() {
  return {
    songs,
    currentIndex,
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    seeking,
    playMode,
    showLyrics,
    lyricsOrigin,
    favorites,
    playSong,
    togglePlay,
    prevSong,
    nextSong,
    playAt,
    seek,
    setVolume,
    setPlayMode,
    clearAll,
    removeFromPlaylist,
    toggleLyrics,
    isFavorite,
    toggleFavorite,
    setSongs,
    playSongById,
    setOnMissingSrc,
  }
}