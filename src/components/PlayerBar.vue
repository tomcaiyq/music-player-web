<template>
  <!-- ============ 桌面端播放栏 ============ -->
  <footer v-if="!isMobile" class="player-bar">
    <!-- 左：封面 + 歌曲信息 -->
    <div class="bar-left">
      <div class="vinyl" :class="{ spinning: isPlaying }" @click="openLyrics">
        <img :src="currentSong?.cover || DEFAULT_COVER" alt="" />
        <div class="vinyl-ring"></div>
      </div>
      <div class="song-meta">
        <div class="song-title" @click="openLyrics">
          {{ currentSong?.title || '暂无播放' }}
        </div>
        <div class="song-artist">{{ currentSong?.artist || '未知歌手' }}</div>
      </div>
      <button class="icon-fav" @click="toggleFavorite(currentSong)" :class="{ active: isFavorite(currentSong) }">
        <NcmIcon name="star-filled" :size="20" />
      </button>
    </div>

    <!-- 中：控制 -->
    <div class="bar-center">
      <div class="controls">
        <button class="ctrl" :title="playModeLabel" @click="togglePlayMode">
          <NcmIcon name="operation" :size="22" v-if="playMode === 'sequential'" />
          <NcmIcon name="magic-stick" :size="22" v-else-if="playMode === 'random'" />
          <NcmIcon name="repeat-one" :size="22" v-else />
        </button>
        <button class="ctrl" @click="prevSong">
          <NcmIcon name="caret-left" :size="24" />
        </button>
        <button class="ctrl play" @click="togglePlay">
          <NcmIcon name="play" :size="26" v-if="!isPlaying" />
          <NcmIcon name="pause-solid" :size="26" v-else />
        </button>
        <button class="ctrl" @click="nextSong">
          <NcmIcon name="caret-right" :size="24" />
        </button>
        <button class="ctrl" @click="showPlaylist = true">
          <NcmIcon name="list" :size="22" />
        </button>
      </div>
      <div class="progress">
        <span class="time tnum">{{ formatTime(currentTime) }}</span>
        <div class="progress-bar" ref="progressBar" @click="onSeek" @mousemove="onHover" @mouseleave="hoverPos = -1">
          <div class="progress-track"></div>
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          <div class="progress-hover" v-if="hoverPos >= 0" :style="{ width: hoverPos + '%' }"></div>
          <div class="progress-dot" :style="{ left: progressPercent + '%' }"></div>
        </div>
        <span class="time tnum">{{ formatTime(duration) }}</span>
      </div>
    </div>

    <!-- 右：音量 -->
    <div class="bar-right">
      <div class="volume">
        <button class="vol-btn" @click="isMuted = !isMuted">
          <NcmIcon :name="!isMuted && volume > 0.01 ? 'microphone' : 'mute'" :size="22" />
        </button>
        <el-slider
          v-model="sliderVolume"
          :max="1"
          :step="0.01"
          :show-stops="false"
          :disabled="isMuted"
          @change="setVolume(sliderVolume)"
        />
      </div>
    </div>
  </footer>

  <!-- ============ 移动端播放栏 ============ -->
  <footer v-else class="player-bar is-mobile" :class="{ active: currentSong }">
    <div
      class="mobile-grid"
      @touchstart.passive="onTouchStart"
      @touchend="onTouchEnd"
    >
      <!-- 封面 -->
      <div class="vinyl mobile" :class="{ spinning: isPlaying }" @click="openLyricsMobile">
        <img :src="currentSong?.cover || DEFAULT_COVER" alt="" />
      </div>
      <!-- 歌名 + 歌手 -->
      <div class="song-meta mobile" @click="openLyricsMobile">
        <div class="song-title">{{ currentSong?.title || '暂无播放' }}</div>
        <div class="song-artist">{{ currentSong?.artist || '未知歌手' }}</div>
      </div>
      <!-- 按钮组（所有按钮统一居右） -->
      <div class="ctrl-group">
        <button class="ctrl" @click="togglePlayMode">
          <NcmIcon name="operation" :size="20" v-if="playMode === 'sequential'" />
          <NcmIcon name="magic-stick" :size="20" v-else-if="playMode === 'random'" />
          <NcmIcon name="repeat-one" :size="20" v-else />
        </button>
        <button class="ctrl" @click="toggleFavorite(currentSong)">
          <NcmIcon name="star-filled" :size="20" :style="{ color: isFavorite(currentSong) ? 'var(--ncm-primary)' : 'rgba(255,255,255,0.7)' }" />
        </button>
        <!-- 播放/暂停 -->
        <button class="ctrl play" @click="togglePlay">
          <NcmIcon name="play" :size="26" v-if="!isPlaying" />
          <NcmIcon name="pause-solid" :size="26" v-else />
        </button>
        <!-- 播放列表 -->
        <button class="ctrl" @click="showPlaylist = true"><NcmIcon name="list" :size="22" /></button>
      </div>
    </div>
    <!-- 底部窄进度条 -->
    <div
      class="mobile-seek"
      ref="mobileSeekRef"
      @click="handleMobileSeek"
      v-if="duration > 0"
      :style="{ '--seek-dot': progressPercent + '%' }"
    >
      <div class="seek-fill" :style="{ width: progressPercent + '%' }"></div>
    </div>
  </footer>

  <!-- ============ 播放列表（桌面端） ============ -->
  <transition name="playlist-fade">
    <div v-if="showPlaylist && !isMobile" class="playlist-popup" @click.self="showPlaylist = false">
      <div class="playlist-head">
        <div class="head-left">
          <h3>播放列表</h3>
          <span class="count tnum">{{ songs.length }} 首</span>
        </div>
        <button v-if="songs.length" class="text-btn" @click="clearAll">清空</button>
      </div>
      <div class="playlist-body" v-if="songs.length">
        <div
          v-for="(song, idx) in songs"
          :key="song.id"
          class="pl-item"
          :class="{ active: idx === currentIndex }"
          @click="playAt(idx)"
        >
          <div class="pl-index">
            <span v-if="idx !== currentIndex" class="tnum">{{ String(idx + 1).padStart(2, '0') }}</span>
            <div v-else class="playing-wave" :class="{ paused: !isPlaying }">
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
          <div class="pl-info">
            <div class="pl-title">{{ song.title }}</div>
            <div class="pl-artist">{{ song.artist }}</div>
          </div>
          <div class="pl-actions">
            <button class="icon-fav small" @click.stop="toggleFavorite(song)" :class="{ active: isFavorite(song) }">
              <NcmIcon name="star-filled" :size="14" />
            </button>
            <button class="icon-del" @click.stop="removeFromPlaylist(idx)">
              <NcmIcon name="delete" :size="14" />
            </button>
          </div>
        </div>
      </div>
      <div v-else class="playlist-empty">播放列表为空</div>
    </div>
  </transition>

  <!-- ============ 播放列表（移动端） ============ -->
  <transition name="drawer-fade">
    <div v-if="showPlaylist && isMobile" class="mobile-drawer-mask" @click="showPlaylist = false">
      <transition name="mobile-playlist-slide">
        <div v-if="showPlaylist" class="mobile-playlist-drawer" @click.stop>
          <div class="drawer-handle" @click="showPlaylist = false"></div>
          <div class="playlist-head">
            <div class="head-left">
              <h3>播放列表</h3>
              <span class="count tnum">{{ songs.length }} 首</span>
            </div>
            <button v-if="songs.length" class="text-btn" @click="clearAll">清空</button>
          </div>
          <div class="playlist-body" v-if="songs.length">
            <div
              v-for="(song, idx) in songs"
              :key="song.id"
              class="pl-item"
              :class="{ active: idx === currentIndex }"
              @click="playAt(idx)"
            >
              <div class="pl-index">
                <span v-if="idx !== currentIndex" class="tnum">{{ String(idx + 1).padStart(2, '0') }}</span>
                <div v-else class="playing-wave" :class="{ paused: !isPlaying }">
                  <span></span><span></span><span></span><span></span>
                </div>
              </div>
              <div class="pl-info">
                <div class="pl-title">{{ song.title }}</div>
                <div class="pl-artist">{{ song.artist }}</div>
              </div>
              <div class="pl-actions">
                <button class="icon-fav small" @click.stop="toggleFavorite(song)" :class="{ active: isFavorite(song) }">
                  <NcmIcon name="star-filled" :size="16" />
                </button>
                <button class="icon-del" @click.stop="removeFromPlaylist(idx)">
                  <NcmIcon name="delete" :size="16" />
                </button>
              </div>
            </div>
          </div>
          <div v-else class="playlist-empty">播放列表为空</div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { usePlayer } from '@/composables/usePlayer'
import { useMobile } from '@/composables/useMobile'
import { DEFAULT_COVER } from '@/config.js'
import NcmIcon from './NcmIcon.vue'

const {
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
  toggleLyrics,
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
  isFavorite,
  toggleFavorite,
} = usePlayer()

const { isMobile } = useMobile()

const progressBar = ref(null)
const showPlaylist = ref(false)
const isMuted = ref(false)
const sliderVolume = ref(volume.value)
const hoverPos = ref(-1)
const ringDash = 2 * Math.PI * 20

watch(volume, (v) => {
  if (!isMuted.value) sliderVolume.value = v
})

const progressPercent = computed(() => {
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

const ringOffset = computed(() => {
  if (!duration.value) return ringDash
  return ringDash * (1 - currentTime.value / duration.value)
})

const playModeLabel = computed(() => {
  if (playMode.value === 'sequential') return '顺序播放'
  if (playMode.value === 'random') return '随机播放'
  return '单曲循环'
})

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function onSeek(e) {
  if (!progressBar.value || !duration.value) return
  const rect = progressBar.value.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  seek(percent * duration.value)
}

function onHover(e) {
  if (!progressBar.value || !duration.value) return
  const rect = progressBar.value.getBoundingClientRect()
  hoverPos.value = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
}

function togglePlayMode() {
  const modes = ['sequential', 'random', 'single']
  const idx = modes.indexOf(playMode.value)
  const next = modes[(idx + 1) % modes.length]
  setPlayMode(next)
  ElMessage({ message: playModeLabel.value, type: 'success', duration: 800 })
}

function openLyrics() {
  toggleLyrics({ x: 80, y: window.innerHeight - 60 })
}

function openLyricsMobile() {
  // 刚刚发生了滑动切歌，不打开歌词页
  if (justSwiped.value) return
  toggleLyrics({ x: window.innerWidth / 2, y: window.innerHeight - 80 })
}

// 移动端进度条 seek
const mobileSeekRef = ref(null)
function handleMobileSeek(e) {
  if (!mobileSeekRef.value || !duration.value) return
  const rect = mobileSeekRef.value.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  seek(percent * duration.value)
}

// 移动端左右滑动切歌
const touchStartX = ref(0)
const touchStartY = ref(0)
const SWIPE_THRESHOLD = 50  // 最小滑动距离（px）
const justSwiped = ref(false)  // 标记刚刚发生了滑动，用于屏蔽后续 click

function onTouchStart(e) {
  if (e.touches.length !== 1) return
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
}

function onTouchEnd(e) {
  if (!e.changedTouches.length) return
  const dx = e.changedTouches[0].clientX - touchStartX.value
  const dy = e.changedTouches[0].clientY - touchStartY.value
  // 横向滑动距离需大于阈值，且大于纵向（避免与垂直滚动冲突）
  if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return
  if (dx < 0) {
    nextSong()  // 左滑下一首
  } else {
    prevSong()  // 右滑上一首
  }
  // 标记刚刚发生了滑动，屏蔽后续 click 事件（避免触发 openLyricsMobile）
  justSwiped.value = true
  setTimeout(() => { justSwiped.value = false }, 300)
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})
onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})

function handleOutsideClick(e) {
  if (showPlaylist.value && !e.target.closest('.playlist-popup, .mobile-drawer-mask, .ctrl')) {
    showPlaylist.value = false
  }
}
</script>

<style scoped>
/* ============ 桌面端播放栏 ============ */
.player-bar {
  position: fixed;
  bottom: 0;
  left: var(--ncm-sidebar-width);
  right: 0;
  height: var(--ncm-player-bar-height);
  background: var(--ncm-bg-player);
  border-top: 1px solid var(--ncm-border);
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  align-items: center;
  padding: 0 24px;
  z-index: 1000;
  backdrop-filter: blur(24px);
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.3);
}

/* —— 左侧 —— */
.bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.vinyl {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  background: radial-gradient(circle at 50% 50%, #2a2a2a 0%, #0a0a0a 100%);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: transform 0.2s var(--ncm-ease-out);
}

.vinyl:hover {
  transform: scale(1.04);
}

.vinyl img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.vinyl.spinning img {
  animation: vinyl-spin 12s linear infinite;
}

.vinyl-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.vinyl-ring::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  background: #0a0a0a;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
}

@keyframes vinyl-spin {
  to { transform: rotate(360deg); }
}

.song-meta {
  min-width: 0;
  flex: 1;
}

.song-title {
  font-size: var(--ncm-text-md);
  font-weight: 500;
  color: var(--ncm-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: color 0.2s;
}

.song-title:hover {
  color: var(--ncm-primary);
}

.song-artist {
  font-size: var(--ncm-text-xs);
  color: var(--ncm-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 3px;
}

.icon-fav {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--ncm-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--ncm-transition-fast);
}

.icon-fav:hover {
  background: var(--ncm-bg-hover);
  color: var(--ncm-text-primary);
  transform: scale(1.08);
}

.icon-fav.active {
  color: var(--ncm-primary);
}

.icon-fav.small {
  width: 28px;
  height: 28px;
}

/* —— 中部 —— */
.bar-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ctrl {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--ncm-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--ncm-transition-fast);
  position: relative;
}

.ctrl:hover {
  color: var(--ncm-text-primary);
  background: var(--ncm-bg-hover);
  transform: translateY(-1px);
}

.ctrl:active {
  transform: translateY(0) scale(0.96);
}

.ctrl.play {
  width: 42px;
  height: 42px;
  background: #fff;
  color: #000;
  margin: 0 4px;
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.15);
}

.ctrl.play:hover {
  background: #fff;
  color: #000;
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 6px 20px rgba(255, 255, 255, 0.25);
}

.mode-badge {
  position: absolute;
  bottom: 1px;
  right: 1px;
  font-size: 9px;
  font-weight: 700;
  color: var(--ncm-primary);
  background: var(--ncm-bg-app);
  border-radius: 4px;
  padding: 0 3px;
  line-height: 1.4;
}

.progress {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 480px;
}

.time {
  font-size: var(--ncm-text-xs);
  color: var(--ncm-text-tertiary);
  width: 38px;
  text-align: center;
  letter-spacing: 0.02em;
}

.progress-bar {
  flex: 1;
  height: 14px;
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.progress-track {
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
}

.progress-fill {
  position: absolute;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--ncm-primary) 0%, #ff6b6f 100%);
  border-radius: 2px;
  transition: width 0.1s linear;
  box-shadow: 0 0 8px var(--ncm-primary-glow);
}

.progress-hover {
  position: absolute;
  left: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  pointer-events: none;
}

.progress-dot {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  background: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.1), 0 2px 6px rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.2s, left 0.1s linear;
  pointer-events: none;
}

.progress-bar:hover .progress-dot {
  opacity: 1;
}

/* —— 右侧 —— */
.bar-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.volume {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 140px;
}

.vol-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--ncm-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--ncm-transition-fast);
}

.vol-btn:hover {
  color: var(--ncm-text-primary);
  background: var(--ncm-bg-hover);
}

.volume :deep(.el-slider) {
  --el-slider-height: 3px;
  flex: 1;
}

.volume :deep(.el-slider__runway) {
  height: 3px !important;
  margin: 8px 0;
}

.volume :deep(.el-slider__bar) {
  height: 3px !important;
}

/* ============ 移动端播放栏（单行 + 底部进度条） ============ */
.player-bar.is-mobile {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(var(--ncm-safe-bottom, 0px) + var(--ncm-tabbar-height-mobile));
  height: auto;
  padding: 8px 12px 16px;
  background: var(--ncm-bg-player);
  border-top: 1px solid var(--ncm-border);
  display: block;
  transform: translateY(110%);
  transition: transform 0.4s var(--ncm-ease-out);
  backdrop-filter: blur(24px);
  z-index: 1000;
}

.player-bar.is-mobile.active {
  transform: translateY(0);
}

/* flex 布局：封面 | 歌名/歌手 | 按钮组（贴右） */
.mobile-grid {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 56px;
  touch-action: pan-y;
  width: 100%;
}

.vinyl.mobile {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  cursor: pointer;
}

.song-meta.mobile {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
}

.song-meta.mobile .song-title {
  font-size: var(--ncm-text-md);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.song-meta.mobile .song-artist {
  font-size: var(--ncm-text-xs);
  color: var(--ncm-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.ctrl-group {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  margin-left: auto;
  justify-content: flex-end;
}

.player-bar.is-mobile .ctrl {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.15s, transform 0.15s;
}

.player-bar.is-mobile .ctrl:active {
  opacity: 0.6;
  transform: scale(0.92);
}

.player-bar.is-mobile .ctrl.play {
  width: 36px;
  height: 36px;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
}

.player-bar.is-mobile .ctrl.play:active {
  transform: scale(0.92);
}

/* 底部窄进度条 —— 绝对定位贴 footer 最底部边缘 */
.mobile-seek {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.mobile-seek::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 1.5px;
}

.mobile-seek .seek-fill {
  position: relative;
  height: 3px;
  background: var(--ncm-primary);
  border-radius: 1.5px;
  box-shadow: 0 0 6px var(--ncm-primary-glow);
  transition: width 0.2s linear;
}

.mobile-seek::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  background: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  left: var(--seek-dot, 0%);
  pointer-events: none;
}

/* ============ 播放波形（共用） ============ */
.playing-wave {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}

.playing-wave span {
  width: 2px;
  background: var(--ncm-primary);
  border-radius: 1px;
  height: 30%;
  animation: wave-bounce 0.9s ease-in-out infinite;
}

.playing-wave span:nth-child(1) { animation-delay: 0s; height: 60%; }
.playing-wave span:nth-child(2) { animation-delay: 0.15s; height: 100%; }
.playing-wave span:nth-child(3) { animation-delay: 0.3s; height: 40%; }
.playing-wave span:nth-child(4) { animation-delay: 0.45s; height: 80%; }

.playing-wave.paused span {
  animation-play-state: paused;
  height: 30% !important;
}

@keyframes wave-bounce {
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
}

/* ============ 播放列表弹窗 ============ */
.playlist-popup {
  position: fixed;
  bottom: var(--ncm-player-bar-height);
  left: var(--ncm-sidebar-width);
  right: 0;
  max-height: 60vh;
  background: var(--ncm-bg-elevated);
  border: 1px solid var(--ncm-border);
  border-bottom: none;
  border-radius: var(--ncm-radius-lg) var(--ncm-radius-lg) 0 0;
  backdrop-filter: blur(24px);
  display: flex;
  flex-direction: column;
  z-index: 1100;
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.4);
  animation: slideUp 0.3s var(--ncm-ease-out);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.playlist-fade-enter-active { animation: slideUp 0.3s var(--ncm-ease-out); }
.playlist-fade-leave-active { animation: slideUp 0.2s var(--ncm-ease) reverse; }

.playlist-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--ncm-border);
}

.head-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.playlist-head h3 {
  margin: 0;
  font-size: var(--ncm-text-lg);
  font-weight: 600;
  color: var(--ncm-text-primary);
}

.count {
  font-size: var(--ncm-text-xs);
  color: var(--ncm-text-tertiary);
}

.text-btn {
  background: transparent;
  border: none;
  color: var(--ncm-text-tertiary);
  font-size: var(--ncm-text-sm);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--ncm-radius-sm);
  transition: var(--ncm-transition-fast);
}

.text-btn:hover {
  color: var(--ncm-text-primary);
  background: var(--ncm-bg-hover);
}

.playlist-body {
  overflow-y: auto;
  max-height: 50vh;
  padding: 6px 8px;
}

.pl-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  cursor: pointer;
  border-radius: var(--ncm-radius-sm);
  transition: background 0.15s;
}

.pl-item:hover {
  background: var(--ncm-bg-hover);
}

.pl-item.active {
  background: var(--ncm-bg-active);
}

.pl-item.active .pl-title {
  color: var(--ncm-primary);
}

.pl-index {
  width: 28px;
  text-align: center;
  font-size: var(--ncm-text-sm);
  color: var(--ncm-text-tertiary);
  flex-shrink: 0;
  display: flex;
  justify-content: center;
}

.pl-info {
  flex: 1;
  min-width: 0;
}

.pl-title {
  font-size: var(--ncm-text-md);
  font-weight: 500;
  color: var(--ncm-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pl-artist {
  font-size: var(--ncm-text-xs);
  color: var(--ncm-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.pl-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.pl-item:hover .pl-actions,
.pl-item.active .pl-actions {
  opacity: 1;
}

.icon-del {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--ncm-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--ncm-transition-fast);
}

.icon-del:hover {
  background: var(--ncm-bg-hover);
  color: #ff5a5a;
}

.playlist-empty {
  padding: 48px;
  text-align: center;
  color: var(--ncm-text-tertiary);
  font-size: var(--ncm-text-md);
}

/* ============ 移动端底部抽屉 ============ */
.mobile-drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
  z-index: 1150;
}

.mobile-playlist-drawer {
  position: fixed;
  bottom: var(--ncm-safe-bottom, 0px);
  left: 0;
  right: 0;
  max-height: 75vh;
  background: var(--ncm-bg-elevated);
  border-top-left-radius: var(--ncm-radius-xl);
  border-top-right-radius: var(--ncm-radius-xl);
  backdrop-filter: blur(24px);
  display: flex;
  flex-direction: column;
  z-index: 1200;
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.5);
  animation: drawerSlideUp 0.35s var(--ncm-ease-out);
}

@keyframes drawerSlideUp {
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
}

.drawer-fade-enter-active { transition: opacity 0.3s var(--ncm-ease); }
.drawer-fade-leave-active { transition: opacity 0.2s var(--ncm-ease); }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; }

.mobile-playlist-slide-enter-active { animation: drawerSlideUp 0.35s var(--ncm-ease-out); }
.mobile-playlist-slide-leave-active { animation: drawerSlideUp 0.25s var(--ncm-ease) reverse; }

.drawer-handle {
  width: 40px;
  height: 4px;
  background: var(--ncm-border-strong);
  border-radius: 2px;
  margin: 10px auto 6px;
  cursor: pointer;
}

.mobile-playlist-drawer .playlist-head { padding: 12px 16px; }
.mobile-playlist-drawer .playlist-body { padding: 0 8px 16px; }
.mobile-playlist-drawer .pl-item { padding: 12px; }
.mobile-playlist-drawer .pl-actions { opacity: 1; }
</style>
