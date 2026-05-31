<template>
  <div class="lyrics-panel" v-if="visible" @click.self="close">
    <div class="lyrics-container" :class="{ 'lyrics-enter': isAnimating }" :style="containerStyle">
      <!-- 背景封面 -->
      <div class="lyrics-bg" :style="coverStyle"></div>

      <!-- 桌面端：左右布局 -->
      <div class="desktop-layout">
        <!-- 左侧封面 -->
        <div class="cover-view">
          <div class="disc-large" :class="{ spinning: isPlaying }">
            <div class="disc-cover-large">
              <img v-if="cover" :src="cover" alt="cover" />
              <el-icon v-else :size="64"><Headset /></el-icon>
            </div>
          </div>
        </div>

        <!-- 右侧歌词 -->
        <div class="lyrics-view">
          <div class="lyrics-scroll" ref="lyricsRef">
            <div
              v-for="(line, i) in parsedLines"
              :key="i"
              class="lyrics-line"
              :class="{
                active: i === currentLine,
                near: Math.abs(i - currentLine) <= 2 && i !== currentLine
              }"
              :ref="el => { if (i === currentLine) activeLineEl = el }"
            >
              {{ line.text }}
            </div>
            <div v-if="parsedLines.length === 0" class="lyrics-empty">
              暂无歌词
            </div>
          </div>
        </div>
      </div>

      <!-- 移动端：单模式切换 -->
      <div class="mobile-layout">
        <!-- 封面模式 -->
        <div v-if="showMode === 'cover'" class="cover-view" @click="showMode = 'lyrics'">
          <div class="disc-large" :class="{ spinning: isPlaying }">
            <div class="disc-cover-large">
              <img v-if="cover" :src="cover" alt="cover" />
              <el-icon v-else :size="64"><Headset /></el-icon>
            </div>
          </div>
        </div>

        <!-- 歌词模式 -->
        <div v-else class="lyrics-view" @click="showMode = 'cover'">
          <div class="lyrics-scroll" ref="lyricsRef">
            <div
              v-for="(line, i) in parsedLines"
              :key="i"
              class="lyrics-line"
              :class="{
                active: i === currentLine,
                near: Math.abs(i - currentLine) <= 2 && i !== currentLine
              }"
              :ref="el => { if (i === currentLine) activeLineEl = el }"
            >
              {{ line.text }}
            </div>
            <div v-if="parsedLines.length === 0" class="lyrics-empty">
              暂无歌词
            </div>
          </div>
        </div>
      </div>

      <!-- 关闭按钮 -->
      <div class="close-btn" @click="close">
        <el-icon :size="20"><Close /></el-icon>
      </div>

      <!-- 底部控制栏 -->
      <div class="lyrics-controls" @click.stop>
        <!-- 歌曲信息 + 收藏按钮 -->
        <div class="bottom-song-info">
          <div class="bottom-song-meta">
            <span class="bottom-song-title">{{ title || '未知标题' }}</span>
            <span class="bottom-song-artist">{{ artist || '未知歌手' }}</span>
          </div>
          <div class="fav-btn" @click="$emit('toggle-favorite')">
            <el-icon :size="18" :color="isFavorite ? '#C20C0C' : 'rgba(255,255,255,0.5)'">
              <StarFilled />
            </el-icon>
          </div>
        </div>
        <!-- 进度条 -->
        <div class="progress-bar-wrapper">
          <div class="progress-bar" ref="progressBarRef" @click="handleSeek">
            <div class="progress-track"></div>
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            <div class="progress-dot" :style="{ left: progressPercent + '%' }"></div>
          </div>
          <div class="progress-times">
            <span class="time-current">{{ formatTime(currentTime) }}</span>
            <span class="time-total">{{ formatTime(duration) }}</span>
          </div>
        </div>
        <!-- 控制按钮 -->
        <div class="control-buttons">
          <div class="ctrl-btn play-mode-btn" @click="togglePlayMode">
            <el-icon :size="18" v-if="playMode === 'sequential'"><Operation /></el-icon>
            <el-icon :size="18" v-else-if="playMode === 'random'"><MagicStick /></el-icon>
            <el-icon :size="18" v-else><RefreshLeft /></el-icon>
            <span class="mode-label" v-if="playMode === 'single'">1</span>
          </div>
          <div class="ctrl-btn" @click="$emit('prev')">
            <el-icon :size="24"><Back /></el-icon>
          </div>
          <div class="ctrl-btn play-btn" @click="$emit('toggle-play')">
            <el-icon :size="28" v-if="!isPlaying"><VideoPlay /></el-icon>
            <el-icon :size="28" v-else><VideoPause /></el-icon>
          </div>
          <div class="ctrl-btn" @click="$emit('next')">
            <el-icon :size="24"><Right /></el-icon>
          </div>
          <div class="ctrl-btn" @click="$emit('toggle-playlist')">
            <el-icon :size="22"><List /></el-icon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Headset, Close, Back, VideoPlay, VideoPause, Right, List, StarFilled, Operation, MagicStick, RefreshLeft } from '@element-plus/icons-vue'

const props = defineProps({
  visible: Boolean,
  lrc: { type: String, default: '' },
  title: { type: String, default: '' },
  artist: { type: String, default: '' },
  cover: { type: String, default: '' },
  currentTime: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  isPlaying: { type: Boolean, default: false },
  isFavorite: { type: Boolean, default: false },
  playMode: { type: String, default: 'sequential' },
  origin: { type: Object, default: () => ({ x: 0, y: 0 }) }
})

const emit = defineEmits(['close', 'seek', 'toggle-play', 'prev', 'next', 'toggle-playlist', 'toggle-favorite', 'change-play-mode'])

// 切换播放模式
function togglePlayMode() {
  const modes = ['sequential', 'random', 'single']
  const currentIndex = modes.indexOf(props.playMode)
  const nextMode = modes[(currentIndex + 1) % modes.length]
  emit('change-play-mode', nextMode)
}

const panelRef = ref(null)
const progressBarRef = ref(null)
const isAnimating = ref(false)
const showMode = ref('cover') // 'cover' or 'lyrics'

// 进度百分比
const progressPercent = computed(() => {
  if (!props.duration || props.duration === 0) return 0
  return (props.currentTime / props.duration) * 100
})

// 点击进度条跳转
function handleSeek(e) {
  if (!progressBarRef.value || !props.duration) return
  const rect = progressBarRef.value.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  emit('seek', percent * props.duration)
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// 计算动画样式
const containerStyle = computed(() => {
  if (!props.visible || !isAnimating.value) {
    return {}
  }
  return {
    transformOrigin: `${props.origin.x}px ${props.origin.y}px`
  }
})

// 监听 visible 变化，触发动画
watch(() => props.visible, (val) => {
  if (val) {
    isAnimating.value = true
    nextTick(() => {
      // 强制重绘后移除动画类
      requestAnimationFrame(() => {
        setTimeout(() => {
          isAnimating.value = false
        }, 500)
      })
    })
  }
})

const lyricsRef = ref(null)
const activeLineEl = ref(null)

const coverStyle = computed(() => {
  if (props.cover) {
    return { backgroundImage: `url(${props.cover})` }
  }
  return {}
})

// 解析 LRC 歌词
const parsedLines = computed(() => {
  if (!props.lrc) return []
  const lines = props.lrc.split('\n')
  const result = []
  const timeRe = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/
  for (const line of lines) {
    const m = line.match(timeRe)
    if (m) {
      const min = parseInt(m[1])
      const sec = parseInt(m[2])
      const ms = parseInt(m[3].padEnd(3, '0'))
      const time = min * 60 + sec + ms / 1000
      const text = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]\s*/, '').trim()
      if (text) result.push({ time, text })
    }
  }
  return result.sort((a, b) => a.time - b.time)
})

// 当前高亮行
const currentLine = computed(() => {
  if (parsedLines.value.length === 0) return -1
  let idx = -1
  for (let i = 0; i < parsedLines.value.length; i++) {
    if (parsedLines.value[i].time <= props.currentTime) {
      idx = i
    } else {
      break
    }
  }
  return idx
})

// 自动滚动到当前行
async function scrollToActive() {
  await nextTick()
  if (activeLineEl.value && lyricsRef.value) {
    const container = lyricsRef.value
    const el = activeLineEl.value
    const offset = el.offsetTop - container.offsetTop - container.clientHeight / 2 + el.clientHeight / 2
    container.scrollTo({ top: offset, behavior: 'smooth' })
  }
}

watch(currentLine, scrollToActive)
watch(() => props.visible, (v) => { if (v) scrollToActive() })

function close() {
  emit('close')
}
</script>

<style scoped>
.lyrics-panel {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.lyrics-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60px;
  position: relative;
  overflow: hidden;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease;
}

.lyrics-container.lyrics-enter {
  animation: lyricsEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes lyricsEnter {
  from {
    transform: scale(0.1);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* 背景模糊封面 */
.lyrics-bg {
  position: absolute;
  top: -20%; left: -20%;
  width: 140%; height: 140%;
  background-size: cover;
  background-position: center;
  filter: blur(40px) brightness(0.4);
  z-index: -1;
}

/* 顶部歌曲信息（歌词模式） */
.top-song-info {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 10;
}

.top-song-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 4px;
}

.top-song-info p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

/* 桌面端左右布局 */
.desktop-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  justify-items: center;
  flex: 1;
  width: 100%;
  padding: 0 0 80px;
}

/* 移动端布局 */
.mobile-layout {
  display: none;
  flex: 1;
  width: 100%;
}

/* 封面视图 */
.cover-view {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 40px;
  width: 100%;
}

.disc-large {
  width: min(45vh, 320px);
  height: min(45vh, 320px);
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, #333 0%, #111 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.5);
  animation: none;
}

.disc-large.spinning {
  animation: spin 20s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.disc-cover-large {
  width: 62%;
  height: 62%;
  border-radius: 50%;
  background: linear-gradient(135deg, #555 0%, #333 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  overflow: hidden;
}

.disc-cover-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 歌词视图 */
.lyrics-view {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 40px;
  width: 100%;
  min-width: 0;
}

.lyrics-scroll {
  width: 100%;
  max-width: 500px;
  height: 60vh;
  max-height: 500px;
  overflow-y: auto;
  mask-image: linear-gradient(transparent 0%, #000 15%, #000 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(transparent 0%, #000 15%, #000 85%, transparent 100%);
  padding: 120px 0;
}

.lyrics-scroll {
  height: 100%;
  overflow-y: auto;
  mask-image: linear-gradient(transparent 0%, #000 15%, #000 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(transparent 0%, #000 15%, #000 85%, transparent 100%);
  padding: 160px 0;
}

.lyrics-scroll::-webkit-scrollbar { width: 0; }

.lyrics-line {
  font-size: clamp(12px, 2vw, 15px);
  color: rgba(255, 255, 255, 0.3);
  line-height: 2.2;
  text-align: center;
  transition: all 0.4s ease;
  cursor: pointer;
  transform: scale(0.95);
}

.lyrics-line:hover {
  color: rgba(255, 255, 255, 0.5);
}

.lyrics-line.active {
  font-size: clamp(15px, 2.5vw, 20px);
  font-weight: 700;
  color: #fff;
  transform: scale(1);
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

.lyrics-line.near {
  color: rgba(255, 255, 255, 0.6);
  transform: scale(0.98);
}

.lyrics-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  padding-top: 160px;
  font-size: 15px;
}

.close-btn {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* 底部歌曲信息 */
.bottom-song-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.bottom-song-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bottom-song-title {
  font-size: 16px;
  font-weight: 500;
  color: #fff;
}

.bottom-song-artist {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.fav-btn {
  cursor: pointer;
  padding: 8px;
  transition: transform 0.2s;
}

.fav-btn:active {
  transform: scale(0.9);
}

/* 底部控制栏 */
.lyrics-controls {
  position: absolute;
  bottom: 0px;
  left: 0;
  right: 0;
  padding: 16px 40px 24px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 进度条 */
.progress-bar-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-bar {
  position: relative;
  height: 4px;
  cursor: pointer;
  padding: 8px 0;
}

.progress-track {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  transform: translateY(-50%);
}

.progress-fill {
  position: absolute;
  top: 50%;
  left: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 2px;
  transform: translateY(-50%);
  transition: width 0.1s linear;
}

.progress-dot {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.3);
  transition: left 0.1s linear;
  opacity: 0;
}

.progress-bar:hover .progress-dot {
  opacity: 1;
}

.progress-times {
  display: flex;
  justify-content: space-between;
}

.time-current,
.time-total {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-variant-numeric: tabular-nums;
}

.control-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.ctrl-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.2s;
}

.ctrl-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.ctrl-btn:active {
  transform: scale(0.95);
}

.ctrl-btn.play-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.play-mode-btn {
  position: relative;
}

.mode-label {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

@media (max-width: 768px) {
  .lyrics-container { flex-direction: column; gap: 16px; padding: 20px 0 120px; }

  .desktop-layout { display: none; }
  .mobile-layout { display: flex; flex-direction: column; }

  .top-song-info {
    top: 16px;
  }

  .top-song-info h3 {
    font-size: clamp(14px, 3.5vw, 18px);
  }

  .top-song-info p {
    font-size: clamp(11px, 2.5vw, 13px);
  }

  .disc-large {
    width: min(70vh, 380px);
    height: min(70vh, 380px);
  }

  .lyrics-view {
    cursor: pointer;
  }

  .lyrics-scroll {
    width: 100%;
    height: 45vh;
    padding: 80px 0;
  }

  .lyrics-line { font-size: clamp(13px, 3vw, 16px); }
  .lyrics-line.active { font-size: clamp(16px, 4vw, 22px); }
  .lyrics-line.near { font-size: clamp(14px, 3.5vw, 18px); }
  .close-btn { top: 12px; right: 12px; width: 36px; height: 36px; }

  .bottom-song-info {
    margin-bottom: 2px;
  }

  .bottom-song-title {
    font-size: 14px;
  }

  .bottom-song-artist {
    font-size: 12px;
  }

  .lyrics-controls {
    padding: 12px 16px 20px;
    gap: 20px;
  }

  .bottom-song-title {
    font-size: 14px;
  }

  .bottom-song-artist {
    font-size: 11px;
  }

  .progress-bar-wrapper {
    gap: 4px;
  }

  .progress-bar {
    padding: 6px 0;
  }

  .progress-dot {
    width: 10px;
    height: 10px;
    color: white;
  }

  .time-current,
  .time-total {
    font-size: 10px;
  }

  .control-buttons {
    gap: 32px;
    padding: 10px;
  }

  .ctrl-btn {
    width: 36px;
    height: 36px;
  }

  .ctrl-btn.play-btn {
    width: 44px;
    height: 44px;
  }
}
</style>
