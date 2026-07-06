<template>
  <div class="ncm-app">
    <!-- 顶部栏：与侧边栏同深，构成 L 型骨架 -->
    <header class="ncm-header">
      <div class="brand">
        <div class="brand-mark" @click="onBrandClick">
          <NcmIcon name="headset" :size="18" />
        </div>
        <span class="brand-name">云音乐</span>
      </div>
      <div class="header-meta">
        <span class="meta-pill" v-if="currentSong">
          <span class="pill-dot" :class="{ playing: isPlaying }"></span>
          正在播放
        </span>
      </div>
    </header>

    <div class="ncm-body">
      <!-- 侧边栏 -->
      <aside v-if="!isMobile" class="ncm-sidebar">
        <nav class="nav-group">
          <div class="nav-label">在线</div>
          <el-menu :default-active="activeRoute" router>
            <el-menu-item index="/search">
              <NcmIcon name="search" />
              <span>发现音乐</span>
            </el-menu-item>
          </el-menu>
        </nav>

        <nav class="nav-group">
          <div class="nav-label">我的音乐</div>
          <el-menu :default-active="activeRoute" router>
            <el-menu-item index="/">
              <NcmIcon name="home" />
              <span>音乐列表</span>
            </el-menu-item>
            <el-menu-item index="/?tab=favorites">
              <NcmIcon name="star" />
              <span>我喜欢的</span>
            </el-menu-item>
          </el-menu>
        </nav>

        <nav class="nav-group">
          <div class="nav-label">系统</div>
          <el-menu :default-active="activeRoute" router>
            <el-menu-item index="/settings">
              <NcmIcon name="user" />
              <span>我的</span>
            </el-menu-item>
          </el-menu>
        </nav>

        <!-- 侧栏底部：当前播放微缩卡 -->
        <div class="sidebar-foot" v-if="currentSong" @click="showLyrics = true">
          <div class="foot-cover">
            <img :src="currentCoverUrl" alt="" />
          </div>
          <div class="foot-meta">
            <div class="foot-title">{{ currentSong.title }}</div>
            <div class="foot-artist">{{ currentSong.artist }}</div>
          </div>
          <div class="foot-bars" :class="{ paused: !isPlaying }">
            <span></span><span></span><span></span>
          </div>
        </div>
      </aside>

      <!-- 主内容 -->
      <main class="ncm-main">
        <router-view />
      </main>
    </div>

    <!-- 播放器组件 -->
    <PlayerBar />

    <!-- 移动端底部 Tab Bar -->
    <nav v-if="isMobile" class="mobile-tabbar">
      <router-link
        v-for="tab in mobileTabs"
        :key="tab.path"
        :to="tab.path"
        class="tab-item"
        :class="{ active: isTabActive(tab) }"
      >
        <NcmIcon :name="tab.icon" :size="20" />
        <span class="tab-label">{{ tab.label }}</span>
      </router-link>
    </nav>

    <!-- 歌词面板 -->
    <LyricsPanel
      :visible="showLyrics"
      :lrc="currentLrc"
      :title="currentSong?.title"
      :artist="currentSong?.artist"
      :cover="currentCoverUrl"
      :currentTime="currentTime"
      :duration="duration"
      :isPlaying="isPlaying"
      :isFavorite="isCurrentFavorite"
      :playMode="playMode"
      :origin="lyricsOrigin"
      @close="showLyrics = false"
      @seek="seek"
      @toggle-play="togglePlay"
      @prev="prevSong"
      @next="nextSong"
      @toggle-favorite="toggleFavoriteCurrent"
      @change-play-mode="setPlayMode"
    />

    <!-- 调试面板：连续点击左上角图标 5 次进入 -->
    <DebugPanel v-model:visible="showDebug" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePlayer } from './composables/usePlayer.js'
import { useMobile } from './composables/useMobile.js'
import { getFavoriteSet, toggleFavorite as dbToggleFav, getLyrics } from './db.js'
import { DEFAULT_COVER } from './config.js'
import { ElMessage } from 'element-plus'
import NcmIcon from './components/NcmIcon.vue'
import LyricsPanel from './components/LyricsPanel.vue'
import PlayerBar from './components/PlayerBar.vue'
import DebugPanel from './components/DebugPanel.vue'

const route = useRoute()
const { isMobile } = useMobile()

// ===== 调试面板：连续点击左上角图标 5 次进入 =====
const showDebug = ref(false)
const clickCount = ref(0)
let clickTimer = null
function onBrandClick() {
  clickCount.value++
  if (clickTimer) clearTimeout(clickTimer)
  clickTimer = setTimeout(() => { clickCount.value = 0 }, 800)
  if (clickCount.value >= 5) {
    clickCount.value = 0
    showDebug.value = true
  }
}

const activeRoute = computed(() => {
  if (route.query.tab === 'favorites') return '/?tab=favorites'
  return route.path
})

// 移动端底部 Tab Bar
const mobileTabs = [
  { path: '/', label: '音乐', icon: 'home' },
  { path: '/search', label: '搜索', icon: 'search' },
  { path: '/settings', label: '设置', icon: 'user' }
]

function isTabActive(tab) {
  if (tab.path === '/') return route.path === '/' && route.query.tab !== 'favorites'
  return route.path === tab.path
}

const {
  currentSong,
  isPlaying,
  currentTime,
  duration,
  playMode,
  showLyrics,
  lyricsOrigin,
  setPlayMode,
  playSong,
  togglePlay,
  prevSong,
  nextSong,
  seek,
  removeFromPlaylist,
  clearAll,
  playAt,
  toggleLyrics,
  isFavorite,
  toggleFavorite,
} = usePlayer()

const currentLrc = ref('')
const favorites = ref(new Set())

// 封面 URL（支持 Blob 和远程 URL）
const currentCoverUrl = computed(() => {
  const song = currentSong?.value
  if (!song) return DEFAULT_COVER
  if (song.coverBlob) return URL.createObjectURL(song.coverBlob)
  if (song.cover) return song.cover
  return DEFAULT_COVER
})

const isCurrentFavorite = computed(() => {
  if (!currentSong?.value) return false
  return favorites.value.has(currentSong.value.id)
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

watch(currentSong, (song) => { fetchLrc(song) }, { immediate: true })

onMounted(async () => {
  favorites.value = await getFavoriteSet()
})

async function toggleFavoriteCurrent() {
  if (!currentSong?.value) return
  const id = currentSong.value.id
  if (!id) return
  await dbToggleFav(id)
  favorites.value = await getFavoriteSet()
}
</script>

<style scoped>
.ncm-app {
  display: flex;
  flex-direction: column;
  /* 调试面板可通过 --app-height 覆盖可见区域高度，未设置时回退到 100dvh / 100vh */
  height: var(--app-height, 100vh);
  height: var(--app-height, 100dvh);
  background: var(--ncm-bg-app);
  overflow: hidden;
  /* 作为移动端 tabbar / player-bar absolute 定位的参照系，
     让 --app-height 变化时这些底部元素跟着容器底部走，而非贴 viewport 底部 */
  position: relative;
}

/* 支持 dvh 时优先用 dvh 作为回退（仍可被 --app-height 覆盖） */
@supports (height: 100dvh) {
  .ncm-app { height: var(--app-height, 100dvh); }
}

/* ===== 顶部栏 ===== */
.ncm-header {
  height: var(--ncm-header-height);
  background: var(--ncm-bg-sidebar);
  border-bottom: 1px solid var(--ncm-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
  -webkit-app-region: drag;
  position: relative;
  z-index: 10;
}

/* 移动端 header：原生平台由 StatusBar.overlaysWebView=false 让 WebView 避开状态栏 */
@media (max-width: 768px) {
  .ncm-header {
    padding-top: var(--ncm-safe-top);
    height: calc(var(--ncm-header-height) + var(--ncm-safe-top));
  }
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  -webkit-app-region: no-drag;
}

.brand-mark {
  width: 28px;
  height: 28px;
  border-radius: var(--ncm-radius-sm);
  background: linear-gradient(135deg, var(--ncm-primary) 0%, #b83236 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px var(--ncm-primary-glow);
}

.brand-name {
  color: var(--ncm-text-primary);
  font-size: var(--ncm-text-lg);
  font-weight: 600;
  letter-spacing: 0.01em;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--ncm-text-xs);
  color: var(--ncm-text-tertiary);
  padding: 4px 10px;
  border-radius: var(--ncm-radius-full);
  background: var(--ncm-bg-elevated);
  border: 1px solid var(--ncm-border);
  letter-spacing: 0.02em;
}

.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ncm-text-tertiary);
  transition: background 0.3s;
}

.pill-dot.playing {
  background: var(--ncm-primary);
  box-shadow: 0 0 8px var(--ncm-primary-glow);
  animation: ncm-pulse 1.6s ease-in-out infinite;
}

/* ===== 主体 ===== */
.ncm-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* ===== 侧边栏 ===== */
.ncm-sidebar {
  width: var(--ncm-sidebar-width);
  background: var(--ncm-bg-sidebar);
  border-right: 1px solid var(--ncm-border);
  flex-shrink: 0;
  overflow-y: auto;
  padding: 16px 0 12px;
  display: flex;
  flex-direction: column;
  position: relative;
}

.nav-group {
  margin-bottom: 8px;
}

.nav-label {
  padding: 12px 20px 6px;
  font-size: var(--ncm-text-xs);
  color: var(--ncm-text-tertiary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ncm-sidebar .el-menu {
  background: transparent;
}

.ncm-sidebar .el-menu-item {
  height: 38px;
  line-height: 38px;
  font-size: var(--ncm-text-md);
  padding-left: 16px !important;
  margin: 2px 8px;
  border-radius: var(--ncm-radius-sm);
  color: var(--ncm-text-secondary);
  transition: var(--ncm-transition-fast);
  display: flex;
  align-items: center;
  gap: 12px;
}

.ncm-sidebar .el-menu-item:hover {
  background: var(--ncm-bg-hover);
  color: var(--ncm-text-primary);
  transform: translateX(2px);
}

.ncm-sidebar .el-menu-item.is-active {
  background: var(--ncm-bg-active);
  color: var(--ncm-primary);
  font-weight: 500;
}

.ncm-sidebar .el-menu-item.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  background: var(--ncm-primary);
  border-radius: 0 2px 2px 0;
  margin-left: -8px;
}

/* 侧栏底部迷你卡 */
.sidebar-foot {
  margin-top: auto;
  margin: 8px;
  padding: 10px;
  border-radius: var(--ncm-radius-md);
  background: var(--ncm-bg-elevated);
  border: 1px solid var(--ncm-border);
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: var(--ncm-transition-fast);
}

.sidebar-foot:hover {
  background: var(--ncm-bg-hover);
  border-color: var(--ncm-border-strong);
}

.foot-cover {
  width: 36px;
  height: 36px;
  border-radius: var(--ncm-radius-sm);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--ncm-bg-input);
}

.foot-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.foot-meta {
  flex: 1;
  min-width: 0;
}

.foot-title {
  font-size: var(--ncm-text-sm);
  font-weight: 500;
  color: var(--ncm-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.foot-artist {
  font-size: var(--ncm-text-xs);
  color: var(--ncm-text-tertiary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.foot-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
  flex-shrink: 0;
}

.foot-bars span {
  width: 2px;
  background: var(--ncm-primary);
  border-radius: 1px;
  height: 30%;
  animation: bar-bounce 1s ease-in-out infinite;
}

.foot-bars span:nth-child(2) { animation-delay: 0.2s; height: 60%; }
.foot-bars span:nth-child(3) { animation-delay: 0.4s; height: 90%; }

.foot-bars.paused span {
  animation-play-state: paused;
  height: 30% !important;
}

@keyframes bar-bounce {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}

/* ===== 主内容 ===== */
.ncm-main {
  flex: 1;
  background: var(--ncm-bg-main);
  overflow-y: auto;
  transition: background 0.3s;
  -webkit-overflow-scrolling: touch;
}

/* ===== 移动端底部 Tab Bar ===== */
.mobile-tabbar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding-bottom: var(--ncm-safe-bottom, 0px);
  height: calc(var(--ncm-tabbar-height-mobile) + var(--ncm-safe-bottom, 0px));
  background: rgba(12, 12, 15, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--ncm-border);
  display: flex;
  align-items: stretch;
  z-index: 999;
  box-sizing: border-box;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: var(--ncm-tabbar-height-mobile);
  color: var(--ncm-text-tertiary);
  text-decoration: none;
  transition: color 0.2s var(--ncm-ease);
  -webkit-tap-highlight-color: transparent;
}

.tab-item.active {
  color: var(--ncm-primary);
}

.tab-label {
  font-size: 10px;
  letter-spacing: 0.02em;
  font-weight: 500;
}

@media (max-width: 768px) {
  .ncm-body {
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .ncm-main {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  /* header 移动端隐藏 */
  .ncm-header {
    display: none;
  }

  .brand-name {
    font-size: var(--ncm-text-md);
  }

  .meta-pill {
    display: none;
  }
}
</style>
