import { reactive, readonly, ref } from 'vue'

const state = reactive({
  songs: [],
  currentSong: null,
  currentIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0
})

const playerInstance = { el: null }
const showLyrics = ref(false)
const lyricsOrigin = ref({ x: 0, y: 0 })
const playMode = ref('sequential') // 'sequential', 'random', 'single'

export function usePlayer() {
  function setSongs(songs) {
    state.songs = songs
  }

  function playSong(index) {
    if (state.songs.length === 0 || index < 0 || index >= state.songs.length) return
    state.currentIndex = index
    state.currentSong = state.songs[index]
    if (playerInstance.el) {
      playerInstance.el.playSong(index)
    }
  }

  function playSongById(songId) {
    const index = state.songs.findIndex(s => s.id === songId)
    if (index !== -1) playSong(index)
  }

  function togglePlay() {
    if (playerInstance.el) {
      playerInstance.el.togglePlay()
    }
  }

  function registerInstance(instance) {
    playerInstance.el = instance
  }

  function setPlaying(playing) {
    state.isPlaying = playing
  }

  function setProgress(currentTime, duration) {
    state.currentTime = currentTime
    state.duration = duration
  }

  function setShowLyrics(show, origin) {
    showLyrics.value = show
    if (origin) {
      lyricsOrigin.value = origin
    }
  }

  function setPlayMode(mode) {
    playMode.value = mode
  }

  // 获取下一首歌曲索引
  function getNextIndex() {
    const len = state.songs.length
    if (len === 0) return -1

    if (playMode.value === 'random') {
      // 随机播放：随机选择一首（排除当前）
      if (len === 1) return 0
      let nextIdx
      do {
        nextIdx = Math.floor(Math.random() * len)
      } while (nextIdx === state.currentIndex)
      return nextIdx
    } else if (playMode.value === 'single') {
      // 单曲循环：播放当前
      return state.currentIndex
    } else {
      // 顺序播放：下一首
      return (state.currentIndex + 1) % len
    }
  }

  // 获取上一首歌曲索引
  function getPrevIndex() {
    const len = state.songs.length
    if (len === 0) return -1

    if (playMode.value === 'random') {
      let prevIdx
      do {
        prevIdx = Math.floor(Math.random() * len)
      } while (prevIdx === state.currentIndex)
      return prevIdx
    } else if (playMode.value === 'single') {
      return state.currentIndex
    } else {
      return (state.currentIndex - 1 + len) % len
    }
  }

  return {
    state: readonly(state),
    rawState: state,
    showLyrics,
    lyricsOrigin,
    playMode,
    setSongs,
    playSong,
    playSongById,
    togglePlay,
    registerInstance,
    setPlaying,
    setProgress,
    setShowLyrics,
    setPlayMode,
    getNextIndex,
    getPrevIndex
  }
}
