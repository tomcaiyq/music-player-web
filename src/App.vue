<template>
  <div class="ncm-app">
    <!-- 顶部标题栏 -->
    <header class="ncm-header">
      <div class="header-left">
        <div class="logo">
          <el-icon :size="22"><Headset /></el-icon>
          <span>云音乐</span>
        </div>
      </div>
      <!-- 移动端：服务器设置按钮 -->
      <el-button v-if="isMobile" text circle class="header-server-btn" @click="showServerDialog = true">
        <el-icon :size="18" style="color:#fff"><Setting /></el-icon>
      </el-button>
    </header>

    <!-- 主体区域 -->
    <div class="ncm-body">
      <!-- 左侧导航（桌面端） -->
      <aside v-if="!isMobile" class="ncm-sidebar">
        <div class="sidebar-section">
          <div class="section-title">在线</div>
          <el-menu :default-active="activeRoute" router>
            <el-menu-item index="/search">
              <el-icon><Search /></el-icon>
              <span>发现音乐</span>
            </el-menu-item>
          </el-menu>
        </div>
        <div class="sidebar-section">
          <div class="section-title">我的音乐</div>
          <el-menu :default-active="activeRoute" router>
            <el-menu-item index="/">
              <el-icon><HomeFilled /></el-icon>
              <span>音乐列表</span>
            </el-menu-item>
            <el-menu-item index="/?tab=favorites">
              <el-icon><Star /></el-icon>
              <span>我喜欢的</span>
            </el-menu-item>
          </el-menu>
        </div>
        <!-- 服务器配置 -->
        <div class="sidebar-section server-config">
          <div class="section-title">服务器</div>
          <div class="server-input-wrap">
            <el-input
              v-model="corsProxy"
              placeholder="默认使用 corsproxy.io 代理"
              size="small"
              clearable
              @change="onProxyChange"
              class="server-input"
            />
          </div>
        </div>
      </aside>

      <!-- 主内容 -->
      <main class="ncm-main">
        <router-view />
      </main>
    </div>

    <!-- 移动端：服务器地址弹窗 -->
    <el-dialog v-if="isMobile" v-model="showServerDialog" title="服务器设置" width="90%" :append-to-body="true">
      <el-input v-model="corsProxy" placeholder="默认使用 corsproxy.io 代理" clearable @change="onProxyChange" />
      <template #footer>
        <el-button type="primary" @click="showServerDialog = false">确定</el-button>
      </template>
    </el-dialog>

    <!-- 桌面端：底部播放器 -->
    <footer v-if="!isMobile" class="ncm-player-bar">
      <!-- 歌曲信息 -->
      <!-- 播放主体：歌曲信息 + 控制按钮 + 进度条 -->
      <div class="bar-main">
        <!-- 歌曲信息 -->
        <div class="bar-song" v-if="playerState.currentSong">
          <div class="bar-cover" :class="{ spinning: playerState.isPlaying }" @click="showLyrics = !showLyrics">
            <img v-if="currentCoverUrl" :src="currentCoverUrl" alt="cover" />
            <el-icon v-else :size="20"><Headset /></el-icon>
          </div>
          <div class="bar-info">
            <div class="bar-title">
              <span class="title-text">{{ playerState.currentSong.title || playerState.currentSong.filename }}</span>
              <span class="title-sep"> - </span>
              <span class="title-artist">{{ playerState.currentSong.artist || '未知歌手' }}</span>
            </div>
          </div>
          <el-button text size="small" @click="toggleFavoriteCurrent" class="bar-fav-btn">
            <el-icon :size="16" :class="{ 'is-fav': isCurrentFavorite }">
              <StarFilled />
            </el-icon>
          </el-button>
        </div>
        <div class="bar-song empty" v-else>
          <div class="bar-cover empty-cover">
            <el-icon :size="20"><Headset /></el-icon>
          </div>
          <div class="bar-info">
            <div class="bar-title">未在播放</div>
          </div>
        </div>

        <!-- 控制按钮 -->
        <div class="control-buttons">
          <el-button text circle @click="prevSong" class="ctrl-btn-prev">
            <el-icon :size="32"><CaretLeft /></el-icon>
          </el-button>
          <el-button text circle @click="togglePlay" class="play-btn-main">
            <el-icon :size="36" v-if="playerState.isPlaying"><VideoPause /></el-icon>
            <el-icon :size="36" v-else><VideoPlay /></el-icon>
          </el-button>
          <el-button text circle @click="nextSong" class="ctrl-btn-next">
            <el-icon :size="32"><CaretRight /></el-icon>
          </el-button>
        </div>

        <!-- 进度条 -->
        <div class="progress-row">
          <span class="time-text">{{ formatTime(currentPos) }}</span>
          <el-slider v-model="seekPos" :max="durationMax" :show-tooltip="false" size="small" class="bar-slider" @mousedown="seeking = true" @change="onSeek" />
          <span class="time-text">{{ formatTime(durationMax) }}</span>
        </div>
      </div>

      <!-- 右侧工具 -->
      <div class="bar-tools">
        <div class="volume-wrap">
          <el-button text circle size="small">
            <el-icon :size="16" v-if="volume > 0"><Microphone /></el-icon>
            <el-icon :size="16" v-else><Mute /></el-icon>
          </el-button>
          <el-slider v-model="volume" :max="1" :step="0.01" :show-tooltip="false" size="small" class="vol-slider" />
        </div>
        <el-button text circle size="small" @click="togglePlayMode" class="play-mode-btn" :title="playModeLabel">
          <el-icon :size="16" v-if="playMode === 'sequential'"><Operation /></el-icon>
          <el-icon :size="16" v-else-if="playMode === 'random'"><MagicStick /></el-icon>
          <el-icon :size="16" v-else><RefreshLeft /></el-icon>
        </el-button>
      </div>

      <!-- 播放列表弹出 -->
      <div v-if="showPlaylist" class="playlist-overlay" @click="showPlaylist = false">
        <div class="playlist-popup" @click.stop>
          <div class="popup-header">
            <span>播放列表 ({{ playerState.songs.length }})</span>
            <el-button text size="small" @click="clearAll">
              <el-icon><DeleteFilled /></el-icon> 清空
            </el-button>
          </div>
          <div class="popup-list">
            <div v-for="(song, idx) in playerState.songs" :key="song.id || idx" :class="{ active: idx === playerState.currentIndex }" class="popup-item" @click="playAt(idx)">
              <div class="item-main">
                <span class="item-name">{{ song.title || song.filename }}</span>
                <span class="item-sep">-</span>
                <span class="item-artist">{{ song.artist || '未知歌手' }}</span>
              </div>
              <el-button text size="small" @click.stop="removeFromPlaylist(idx)" class="item-remove">
                <el-icon :size="14"><Close /></el-icon>
              </el-button>
            </div>
            <el-empty v-if="playerState.songs.length === 0" description="暂无歌曲" :image-size="48" />
          </div>
        </div>
      </div>
    </footer>

    <!-- 移动端：底部区域（播放条 + Tab栏） -->
    <div v-if="isMobile" class="mobile-bottom">
      <!-- 底部播放器 -->
      <footer class="ncm-player-bar is-mobile" :class="{ active: playerState.currentSong }">
        <template v-if="isMobile">
          <!-- 歌曲信息 -->
          <div class="bar-song" v-if="playerState.currentSong">
            <div class="bar-cover" :class="{ spinning: playerState.isPlaying }" @click="showLyrics = !showLyrics">
              <img v-if="currentCoverUrl" :src="currentCoverUrl" alt="cover" />
              <el-icon v-else :size="18"><Headset /></el-icon>
            </div>
            <div class="bar-info">
              <div class="bar-title">
                <span class="title-text">{{ playerState.currentSong.title || playerState.currentSong.filename }}</span>
                <span class="title-sep"> - </span>
                <span class="title-artist">{{ playerState.currentSong.artist || '未知歌手' }}</span>
              </div>
            </div>
          </div>
          <div class="bar-song empty" v-else>
            <div class="bar-cover empty-cover">
              <el-icon :size="18"><Headset /></el-icon>
            </div>
            <div class="bar-info">
              <div class="bar-title">未在播放</div>
            </div>
          </div>

          <!-- 控制按钮 -->
          <div class="mobile-controls">
            <el-button text circle size="small" @click="toggleFavoriteCurrent" class="bar-fav-btn">
              <el-icon :size="16" :class="{ 'is-fav': isCurrentFavorite }">
                <StarFilled />
              </el-icon>
            </el-button>
            <div class="play-btn-wrapper mobile" @click="togglePlay">
              <svg class="play-progress-ring" width="34" height="34" viewBox="0 0 34 34">
                <circle cx="17" cy="17" r="14" fill="none" stroke="rgba(194,12,12,0.2)" stroke-width="2" />
                <circle class="play-progress-arc" cx="17" cy="17" r="14" fill="none" stroke="#C20C0C" stroke-width="2"
                  stroke-linecap="round"
                  :stroke-dasharray="87.96"
                  :stroke-dashoffset="87.96 * (1 - playProgress)" />
              </svg>
              <el-icon class="play-btn-icon" :size="16">
                <VideoPause v-if="playerState.isPlaying" />
                <VideoPlay v-else />
              </el-icon>
            </div>
            <el-button text circle size="small" @click="nextSong">
              <el-icon :size="16"><CaretRight /></el-icon>
            </el-button>
            <el-button text circle size="small" @click="showPlaylist = !showPlaylist">
              <el-icon :size="16"><List /></el-icon>
            </el-button>
          </div>
        </template>

        <!-- 播放列表弹出 -->
        <div v-if="showPlaylist" class="playlist-overlay is-mobile" @click="showPlaylist = false">
          <div class="playlist-popup is-mobile" @click.stop>
            <div class="popup-header">
              <span>播放列表 ({{ playerState.songs.length }})</span>
            </div>
            <div class="popup-list">
              <div v-for="(song, idx) in playerState.songs" :key="song.id || idx" :class="{ active: idx === playerState.currentIndex }" class="popup-item" @click="playAt(idx)">
                <div class="item-main">
                  <span class="item-name">{{ song.title || song.filename }}</span>
                  <span class="item-sep">-</span>
                  <span class="item-artist">{{ song.artist || '未知歌手' }}</span>
                </div>
                <el-button text size="small" @click.stop="removeFromPlaylist(idx)" class="item-remove">
                  <el-icon :size="14"><Close /></el-icon>
                </el-button>
              </div>
              <el-empty v-if="playerState.songs.length === 0" description="暂无歌曲" :image-size="48" />
            </div>
          </div>
        </div>
      </footer>

      <!-- Tab 导航栏 -->
      <nav class="mobile-tab-bar">
        <router-link to="/" class="tab-item" :class="{ active: route.path === '/' && !route.query.tab }">
          <el-icon :size="20"><Headset /></el-icon>
          <span>音乐</span>
        </router-link>
        <router-link to="/search" class="tab-item" :class="{ active: route.path === '/search' }">
          <el-icon :size="20"><Search /></el-icon>
          <span>发现</span>
        </router-link>
        <router-link to="/?tab=favorites" class="tab-item" :class="{ active: route.query.tab === 'favorites' }">
          <el-icon :size="20"><Star /></el-icon>
          <span>收藏</span>
        </router-link>
      </nav>
    </div>

    <!-- 歌词面板 -->
    <LyricsPanel
      :visible="showLyrics"
      :lrc="currentLrc"
      :title="playerState.currentSong?.title"
      :artist="playerState.currentSong?.artist"
      :cover="currentCoverUrl"
      :currentTime="currentPos"
      :duration="durationMax"
      :isPlaying="playerState.isPlaying"
      :isFavorite="isCurrentFavorite"
      :playMode="playMode"
      :origin="lyricsOrigin"
      @close="showLyrics = false"
      @seek="onSeek"
      @toggle-play="togglePlay"
      @prev="prevSong"
      @next="nextSong"
      @toggle-playlist="showPlaylist = !showPlaylist"
      @toggle-favorite="toggleFavoriteCurrent"
      @change-play-mode="setPlayMode"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Headset, HomeFilled, Star, StarFilled, Timer,
  VideoPlay, VideoPause, CaretLeft, CaretRight, Microphone, Mute, List, DeleteFilled, Search, Mic, Setting,
  Operation, MagicStick, RefreshLeft, Close
} from '@element-plus/icons-vue'
import { usePlayer } from './composables/usePlayer.js'
import { useMobile } from './composables/useMobile.js'
import { getFavoriteSet, toggleFavorite as dbToggleFav, getLyrics } from './db.js'
import { getCorsProxy, setCorsProxy } from './config.js'
import { ElMessage } from 'element-plus'
import LyricsPanel from './components/LyricsPanel.vue'

const route = useRoute()
const { isMobile } = useMobile()
const showServerDialog = ref(false)

// CORS 代理配置
const corsProxy = ref(getCorsProxy())
function onProxyChange(val) {
  setCorsProxy(val || '')
  if (val) {
    ElMessage.success('代理地址已更新')
  } else {
    ElMessage.success('已恢复默认代理')
  }
}

const activeRoute = computed(() => {
  if (route.query.tab === 'favorites') return '/?tab=favorites'
  return route.path
})

const showPlaylist = ref(false)

const {
  state: playerState,
  rawState,
  registerInstance,
  setPlaying,
  setProgress,
  showLyrics,
  lyricsOrigin,
  playMode,
  setPlayMode,
  getNextIndex,
  getPrevIndex
} = usePlayer()

const currentLrc = ref('')
const favorites = ref(new Set())

// 封面 URL（支持 Blob 和远程 URL）
const currentCoverUrl = computed(() => {
  const song = playerState.currentSong
  if (!song) return ''
  if (song.coverBlob) return URL.createObjectURL(song.coverBlob)
  if (song.cover) return song.cover
  return ''
})

const isCurrentFavorite = computed(() => {
  if (!playerState.currentSong) return false
  return favorites.value.has(playerState.currentSong.id)
})

// 获取歌词
async function fetchLrc(song) {
  if (!song) { currentLrc.value = ''; return }
  if (song.lrc) { currentLrc.value = song.lrc; return }
  if (song.id) {
    try {
      currentLrc.value = await getLyrics(song.id)
    } catch { currentLrc.value = '' }
  } else {
    currentLrc.value = ''
  }
}

watch(() => playerState.currentSong, (song) => { fetchLrc(song) }, { immediate: true })

const player = new Audio()
player.volume = 0.7
const currentPos = ref(0)
const seekPos = ref(0)
const volume = ref(0.7)
const seeking = ref(false)
const durationMax = computed(() => playerState.currentSong?.durationSeconds || player.duration || 0)

// 播放进度百分比
const playProgress = computed(() => {
  if (!playerState.duration || playerState.duration === 0) return 0
  return playerState.currentTime / playerState.duration
})

player.addEventListener('play', () => { setPlaying(true) })
player.addEventListener('pause', () => { setPlaying(false) })
player.addEventListener('ended', () => autoNextSong())
player.addEventListener('timeupdate', () => {
  if (!seeking.value) {
    currentPos.value = player.currentTime
    seekPos.value = player.currentTime
    setProgress(player.currentTime, player.duration || 0)
  }
})
player.addEventListener('loadedmetadata', () => {
  if (rawState.currentSong) {
    rawState.currentSong.durationSeconds = player.duration
  }
  setProgress(player.currentTime, player.duration || 0)
})

onMounted(async () => {
  registerInstance({ playSong, togglePlay })
  favorites.value = await getFavoriteSet()
})

onUnmounted(() => {
  player.pause()
  player.src = ''
})

function getAudioSrc(song) {
  if (song.audioBlob) return URL.createObjectURL(song.audioBlob)
  if (song.audioUrl) return song.audioUrl
  return ''
}

function playSong(index) {
  if (rawState.songs.length === 0 || index < 0 || index >= rawState.songs.length) return
  const song = rawState.songs[index]
  rawState.currentIndex = index
  rawState.currentSong = song
  player.src = getAudioSrc(song)
  player.play()
}

function togglePlay() {
  if (!rawState.currentSong) return
  if (player.paused) player.play()
  else player.pause()
}

// 播放模式切换
function togglePlayMode() {
  const modes = ['sequential', 'random', 'single']
  const currentIndex = modes.indexOf(playMode.value)
  const nextMode = modes[(currentIndex + 1) % modes.length]
  setPlayMode(nextMode)
  const labels = { sequential: '顺序播放', random: '随机播放', single: '单曲循环' }
  ElMessage.success(labels[nextMode])
}

const playModeLabel = computed(() => {
  const labels = { sequential: '顺序播放', random: '随机播放', single: '单曲循环' }
  return labels[playMode.value] || '顺序播放'
})

// 手动上一曲（顺序，不受播放模式影响）
function prevSong() {
  if (rawState.songs.length === 0) return
  const i = rawState.currentIndex > 0 ? rawState.currentIndex - 1 : rawState.songs.length - 1
  rawState.currentIndex = i
  rawState.currentSong = rawState.songs[i]
  player.src = getAudioSrc(rawState.songs[i])
  player.play()
}

// 手动下一曲（顺序，不受播放模式影响）
function nextSong() {
  if (rawState.songs.length === 0) return
  const i = (rawState.currentIndex + 1) % rawState.songs.length
  rawState.currentIndex = i
  rawState.currentSong = rawState.songs[i]
  player.src = getAudioSrc(rawState.songs[i])
  player.play()
}

// 自动下一曲（受播放模式影响）
function autoNextSong() {
  if (rawState.songs.length === 0) return
  const i = getNextIndex()
  if (i < 0) return
  rawState.currentIndex = i
  rawState.currentSong = rawState.songs[i]
  player.src = getAudioSrc(rawState.songs[i])
  player.play()
}

function onSeek() {
  player.currentTime = seekPos.value
  currentPos.value = seekPos.value
  seeking.value = false
}

function removeFromPlaylist(idx) {
  if (rawState.songs.length === 0) return
  // 如果移除的是当前播放的歌曲
  if (idx === rawState.currentIndex) {
    rawState.songs.splice(idx, 1)
    if (rawState.songs.length === 0) {
      player.pause()
      player.src = ''
      rawState.currentSong = null
      rawState.currentIndex = -1
    } else {
      const newIdx = idx >= rawState.songs.length ? 0 : idx
      rawState.currentIndex = newIdx
      rawState.currentSong = rawState.songs[newIdx]
      player.src = getAudioSrc(rawState.songs[newIdx])
      player.play()
    }
  } else {
    rawState.songs.splice(idx, 1)
    // 调整当前播放索引
    if (idx < rawState.currentIndex) {
      rawState.currentIndex--
    }
  }
}

function clearAll() {
  player.pause()
  player.src = ''
  rawState.songs = []
  rawState.currentSong = null
  rawState.currentIndex = -1
  currentPos.value = 0
  seekPos.value = 0
  showPlaylist.value = false
}

function playAt(idx) {
  rawState.currentIndex = idx
  rawState.currentSong = rawState.songs[idx]
  player.src = getAudioSrc(rawState.songs[idx])
  player.play()
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

async function toggleFavoriteCurrent() {
  if (!playerState.currentSong) return
  const id = playerState.currentSong.id
  if (!id) return
  await dbToggleFav(id)
  favorites.value = await getFavoriteSet()
}

watch(volume, (v) => { if (player) player.volume = v })

defineExpose({ playSong, togglePlay })
</script>

<style scoped>
.ncm-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--ncm-bg-main);
  overflow: hidden;
}

/* ===== 顶部栏 ===== */
.ncm-header {
  height: 50px;
  background: var(--ncm-bg-header);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  -webkit-app-region: drag;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
  -webkit-app-region: no-drag;
}

.logo {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  white-space: nowrap;
}

/* ===== 主体 ===== */
.ncm-body { display: flex; flex: 1; min-height: 0; }

/* ===== 侧边栏 ===== */
.ncm-sidebar {
  width: 200px;
  background: var(--ncm-bg-sidebar);
  border-right: 1px solid var(--ncm-border);
  flex-shrink: 0;
  overflow-y: auto;
  padding-top: 8px;
  transition: background 0.3s;
}

.sidebar-section { margin-bottom: 4px; }

.section-title {
  padding: 12px 20px 6px;
  font-size: 12px;
  color: var(--ncm-text-tertiary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ncm-sidebar .el-menu { background: transparent; }
.ncm-sidebar .el-menu-item { height: 40px; line-height: 40px; font-size: 13px; padding-left: 20px !important; margin: 0 8px; border-radius: 8px; color: var(--ncm-text-secondary); }
.ncm-sidebar .el-menu-item:hover { background: var(--ncm-bg-hover) !important; }
.ncm-sidebar .el-menu-item.is-active { background: var(--ncm-bg-hover) !important; color: var(--ncm-primary) !important; font-weight: 500; }

/* ===== 主内容 ===== */
.ncm-main {
  flex: 1;
  background: var(--ncm-bg-main);
  overflow-y: auto;
  transition: background 0.3s;
  -webkit-overflow-scrolling: touch;
}

/* ===== 底部播放器 ===== */
.ncm-player-bar {
  flex-shrink: 0;
  height: var(--player-bar-height);
  margin: 0 12px 12px;
  background: var(--ncm-bg-player);
  border: none;
  border-radius: 28px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
  transition: background 0.3s;
}

/* 歌曲信息 */
.bar-song { display: flex; align-items: center; gap: 12px; width: 240px; flex-shrink: 0; }
.bar-cover {
  width: 44px; height: 44px;
  background: linear-gradient(135deg, var(--ncm-text-tertiary) 0%, var(--ncm-text-placeholder) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ncm-text-inverse-sub);
  flex-shrink: 0;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.3s;
}
.bar-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.bar-cover {
  animation: coverSpin 8s linear infinite;
  animation-play-state: paused;
}
.bar-cover.spinning {
  animation-play-state: running;
}
@keyframes coverSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.empty-cover { opacity: 0.5; cursor: default; }
.bar-info { min-width: 0; flex: 1; }
.bar-title { font-size: 13px; color: var(--ncm-text-inverse); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.4; }
.title-sep { color: rgba(255,255,255,0.3); margin: 0 2px; }
.title-artist { color: rgba(255,255,255,0.4); }
.bar-fav-btn { color: var(--ncm-text-inverse-sub) !important; padding: 4px !important; }
.bar-fav-btn .is-fav { color: var(--ncm-primary) !important; }

/* 播放主体 */
.bar-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  padding: 0 16px;
}

.bar-main .bar-song {
  width: 200px;
  flex-shrink: 0;
}

/* 播放控制 */
.control-buttons { display: flex; align-items: center; flex-shrink: 0; }
.control-buttons .el-button { color: var(--ncm-text-inverse) !important; }
.control-buttons .el-button:hover { color: #fff !important; }
.ctrl-btn-prev, .ctrl-btn-next {
  width: 40px !important;
  height: 40px !important;
}
.ctrl-btn-prev:hover, .ctrl-btn-next:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

/* 播放按钮进度环 */
.play-btn-wrapper {
  position: relative;
  width: 44px;
  height: 44px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.play-btn-wrapper.mobile {
  width: 34px;
  height: 34px;
}
.play-progress-ring {
  position: absolute;
  top: 0;
  left: 0;
}
.play-progress-arc {
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dashoffset 0.3s linear;
}
.play-btn-icon {
  position: relative;
  z-index: 1;
  color: var(--ncm-text-inverse);
}
.play-btn-wrapper:hover .play-btn-icon {
  color: #fff;
}

.play-btn-main {
  width: 52px !important;
  height: 52px !important;
  color: var(--ncm-text-inverse) !important;
}
.play-btn-main:hover {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.1) !important;
}

.progress-row { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.time-text { font-size: 11px; color: var(--ncm-text-inverse-sub); width: 40px; text-align: center; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.bar-slider { flex: 1; }
.bar-slider :deep(.el-slider__runway) { background: var(--ncm-text-placeholder) !important; }

/* 右侧工具 */
.bar-tools { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.volume-wrap { display: flex; align-items: center; gap: 2px; }
.volume-wrap .el-button { color: var(--ncm-text-inverse-sub) !important; }
.vol-slider { width: 72px; }
.vol-slider :deep(.el-slider__runway) { background: var(--ncm-text-placeholder) !important; }
.playlist-btn { color: var(--ncm-text-inverse-sub) !important; }
.playlist-btn.is-active { color: var(--ncm-primary) !important; }

/* ===== 播放列表弹窗 ===== */
.playlist-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}
.playlist-popup {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 0;
  width: 360px;
  max-height: 420px;
  background: var(--ncm-bg-playlist);
  border: none;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.25);
  z-index: 1000;
}

.popup-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--ncm-border); font-size: 13px; color: var(--ncm-text-inverse); }
.popup-header .el-button { color: var(--ncm-text-inverse-sub) !important; }
.popup-list { overflow-y: auto; flex: 1; }
.popup-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; cursor: pointer; transition: background 0.15s; }
.popup-item:hover { background: var(--ncm-bg-hover); }
.popup-item.active { background: var(--ncm-bg-active); }
.popup-item.active .item-name { color: var(--ncm-primary); }
.item-main { min-width: 0; display: flex; align-items: center; gap: 4px; flex: 1; }
.item-name { font-size: 13px; color: var(--ncm-text-inverse); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-sep { color: var(--ncm-text-inverse-sub); font-size: 12px; }
.item-artist { font-size: 12px; color: var(--ncm-text-inverse-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-remove { color: var(--ncm-text-inverse-sub) !important; padding: 4px !important; flex-shrink: 0; opacity: 0.6; }
.item-remove:hover { color: var(--ncm-text-inverse) !important; opacity: 1; }

/* 服务器配置 */
.server-config { padding-bottom: 16px; border-top: 1px solid var(--ncm-border); margin-top: 4px; }
.server-input-wrap { padding: 8px 12px; }
.server-input :deep(.el-input__inner) { font-size: 11px; height: 28px; }

/* ===== 移动端 ===== */
.header-server-btn { margin-left: auto; }

/* 移动端底部区域：播放条 + Tab 栏，flex 自适应 */
.mobile-bottom {
  flex-shrink: 0;
  background: transparent;
}

/* 移动端播放器 */
.ncm-player-bar.is-mobile {
  position: relative;
  bottom: auto;
  left: auto;
  right: auto;
  height: auto;
  flex-direction: row;
  align-items: center;
  padding: 3px 4px;
  gap: 4px;
  transform: none;
  border: none;
  border-radius: 18px;
  background: var(--ncm-bg-player);
  margin: 0 8px 8px;
  box-shadow: none;
}

.ncm-player-bar.is-mobile .bar-song { flex: 1; min-width: 0; width: auto; }
.ncm-player-bar.is-mobile .bar-cover { width: 32px; height: 32px; }

.mobile-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  /* padding: 10px; */
  flex-shrink: 0;
}

.mobile-controls .el-button { color: var(--ncm-text-inverse) !important; }
.mobile-controls .bar-fav-btn { color: var(--ncm-text-inverse-sub) !important; }
.mobile-controls .bar-fav-btn .is-fav { color: var(--ncm-primary) !important; }

/* 移动端 Tab 栏 */
.mobile-tab-bar {
  height: 56px;
  background: var(--ncm-bg-card);
  border-top: 1px solid var(--ncm-border);
  display: flex;
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 10px;
  color: var(--ncm-text-tertiary);
  text-decoration: none;
  transition: color 0.2s;
}

.tab-item.active { color: var(--ncm-primary); }
.tab-item:active { opacity: 0.7; }

/* 移动端播放列表 */
.playlist-overlay.is-mobile {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1999;
}
.playlist-popup.is-mobile {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  border-radius: 16px 16px 0 0;
  max-height: 60vh;
  border: 1px solid var(--ncm-border);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  z-index: 2000;
}

@media (max-width: 768px) {
  .ncm-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .ncm-main {
    padding-bottom: 0 !important;
    overflow-y: auto;
  }
}
</style>
