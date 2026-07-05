<template>
  <transition name="lyrics-fade">
    <div class="lyrics-panel" v-if="visible" @click.self="close">
      <div class="lyrics-container" :style="containerStyle">
        <!-- 背景封面（模糊） -->
        <div class="lyrics-bg" :style="coverStyle"></div>
        <div class="lyrics-bg-mask"></div>

        <!-- 顶部 -->
        <header class="lyrics-header">
          <div class="header-meta">
            <div class="meta-title">{{ title || '未知标题' }}</div>
            <div class="meta-artist">{{ artist || '未知歌手' }}</div>
          </div>
          <button class="close-btn" @click="close">
            <NcmIcon name="close" :size="20" />
          </button>
        </header>

        <!-- 桌面端：左右布局 -->
        <div class="desktop-layout">
          <!-- 左侧黑胶 -->
          <div class="cover-stage">
            <div class="vinyl-wrap">
              <div class="vinyl-large" :class="{ spinning: isPlaying }">
                <div class="vinyl-grooves"></div>
                <div class="vinyl-cover">
                  <img v-if="cover" :src="cover" alt="cover" />
                  <NcmIcon v-else name="headset" :size="56" />
                </div>
                <div class="vinyl-center"></div>
              </div>
              <div class="vinyl-needle" :class="{ down: isPlaying }">
                <span class="needle-pivot"></span>
                <span class="needle-arm"></span>
                <span class="needle-tip"></span>
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
                  near: Math.abs(i - currentLine) <= 2 && i !== currentLine,
                  far: Math.abs(i - currentLine) > 2
                }"
                :ref="el => { if (i === currentLine) activeLineEl = el }"
                @click="seekToLine(line)"
              >
                {{ line.text }}
              </div>
              <div v-if="parsedLines.length === 0" class="lyrics-empty">
                暂无歌词
              </div>
            </div>
          </div>
        </div>

        <!-- 移动端：模式切换 -->
        <div class="mobile-layout">
          <div v-if="showMode === 'cover'" class="cover-stage mobile" @click="showMode = 'lyrics'">
            <div class="vinyl-large" :class="{ spinning: isPlaying }">
              <div class="vinyl-grooves"></div>
              <div class="vinyl-cover">
                <img v-if="cover" :src="cover" alt="cover" />
                <NcmIcon v-else name="headset" :size="56" />
              </div>
              <div class="vinyl-center"></div>
            </div>
          </div>
          <div v-else class="lyrics-view mobile" @click="showMode = 'cover'">
            <div class="lyrics-scroll" ref="lyricsRefMobile">
              <div
                v-for="(line, i) in parsedLines"
                :key="i"
                class="lyrics-line"
                :class="{
                  active: i === currentLine,
                  near: Math.abs(i - currentLine) <= 2 && i !== currentLine,
                  far: Math.abs(i - currentLine) > 2
                }"
                :ref="el => { if (i === currentLine) activeLineElMobile = el }"
                @click.stop="seekToLine(line)"
              >
                {{ line.text }}
              </div>
              <div v-if="parsedLines.length === 0" class="lyrics-empty">
                暂无歌词
              </div>
            </div>
          </div>
        </div>

        <!-- 底部控制栏 -->
        <div class="lyrics-controls" @click.stop>
          <!-- 进度条 -->
          <div class="progress-wrap">
            <div class="progress-bar" ref="progressBarRef" @click="handleSeek" @mousemove="onHover" @mouseleave="hoverPos = -1">
              <div class="progress-track"></div>
              <div class="progress-hover" v-if="hoverPos >= 0" :style="{ width: hoverPos + '%' }"></div>
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
              <div class="progress-dot" :style="{ left: progressPercent + '%' }"></div>
            </div>
            <div class="progress-times">
              <span class="time tnum">{{ formatTime(currentTime) }}</span>
              <span class="time tnum">{{ formatTime(duration) }}</span>
            </div>
          </div>

          <!-- 控制按钮 -->
          <div class="control-row">
            <button class="ctrl-btn side" @click="togglePlayMode">
              <NcmIcon name="operation" :size="22" v-if="playMode === 'sequential'" />
              <NcmIcon name="magic-stick" :size="22" v-else-if="playMode === 'random'" />
              <NcmIcon name="repeat-one" :size="22" v-else />
            </button>
            <div class="main-controls">
              <button class="ctrl-btn" @click="$emit('prev')">
                <NcmIcon name="caret-left" :size="26" />
              </button>
              <button class="ctrl-btn play" @click="$emit('toggle-play')">
                <NcmIcon name="play" :size="30" v-if="!isPlaying" />
                <NcmIcon name="pause-solid" :size="30" v-else />
              </button>
              <button class="ctrl-btn" @click="$emit('next')">
                <NcmIcon name="caret-right" :size="26" />
              </button>
            </div>
            <button class="ctrl-btn side" @click="$emit('toggle-favorite')">
              <NcmIcon name="star-filled" :size="24" :style="{ color: isFavorite ? 'var(--ncm-primary)' : 'rgba(255,255,255,0.7)' }" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import NcmIcon from './NcmIcon.vue'

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

function togglePlayMode() {
  const modes = ['sequential', 'random', 'single']
  const currentIndex = modes.indexOf(props.playMode)
  const nextMode = modes[(currentIndex + 1) % modes.length]
  emit('change-play-mode', nextMode)
}

const progressBarRef = ref(null)
const showMode = ref('cover')

const hoverPos = ref(-1)

const progressPercent = computed(() => {
  if (!props.duration || props.duration === 0) return 0
  return (props.currentTime / props.duration) * 100
})

function handleSeek(e) {
  if (!progressBarRef.value || !props.duration) return
  const rect = progressBarRef.value.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  emit('seek', percent * props.duration)
}

function onHover(e) {
  if (!progressBarRef.value || !props.duration) return
  const rect = progressBarRef.value.getBoundingClientRect()
  hoverPos.value = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
}

function seekToLine(line) {
  if (line && line.time !== undefined) {
    emit('seek', line.time)
  }
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const containerStyle = computed(() => {
  if (!props.visible) return {}
  return {
    transformOrigin: `${props.origin.x}px ${props.origin.y}px`
  }
})

const lyricsRef = ref(null)
const lyricsRefMobile = ref(null)
const activeLineEl = ref(null)
const activeLineElMobile = ref(null)

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
  const container = lyricsRef.value || lyricsRefMobile.value
  const el = activeLineEl.value || activeLineElMobile.value
  if (el && container) {
    const offset = el.offsetTop - container.offsetTop - container.clientHeight / 2 + el.clientHeight / 2
    container.scrollTo({ top: offset, behavior: 'smooth' })
  }
}

watch(currentLine, scrollToActive)
watch(() => props.visible, (v) => {
  if (v) {
    showMode.value = 'cover'
    nextTick(scrollToActive)
  }
})

function close() {
  emit('close')
}
</script>

<style scoped>
.lyrics-panel {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(24px);
}

.lyrics-fade-enter-active {
  transition: opacity 0.4s var(--ncm-ease-out);
}
.lyrics-fade-leave-active {
  transition: opacity 0.25s var(--ncm-ease);
}
.lyrics-fade-enter-from,
.lyrics-fade-leave-to {
  opacity: 0;
}

.lyrics-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* —— 背景封面 —— */
.lyrics-bg {
  position: absolute;
  top: -30%;
  left: -30%;
  width: 160%;
  height: 160%;
  background-size: cover;
  background-position: center;
  filter: blur(80px) brightness(0.25) saturate(1.3);
  z-index: -2;
  animation: bgFloat 12s ease-in-out infinite alternate;
}

.lyrics-bg-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(8,8,10,0.5) 0%, rgba(8,8,10,0.7) 50%, rgba(8,8,10,0.9) 100%);
  z-index: -1;
}

@keyframes bgFloat {
  from { transform: scale(1) translate(0, 0); }
  to { transform: scale(1.08) translate(-2%, 2%); }
}

/* —— 顶部 —— */
.lyrics-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
  background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%);
}

.header-meta {
  min-width: 0;
}

.meta-title {
  font-size: var(--ncm-text-lg);
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60vw;
}

.meta-artist {
  font-size: var(--ncm-text-sm);
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}

.close-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  transition: var(--ncm-transition-fast);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  transform: rotate(90deg);
}

/* —— 桌面布局 —— */
.desktop-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  justify-items: center;
  flex: 1;
  width: 100%;
  padding: 0 60px 160px;
  gap: 60px;
}

.mobile-layout {
  display: none;
  flex: 1;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding: 80px 0 160px;
}

/* —— 黑胶 —— */
.cover-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
}

/* 与黑胶同尺寸的定位上下文，让唱针跟随黑胶缩放 */
.vinyl-wrap {
  position: relative;
  width: min(46vh, 340px);
  height: min(46vh, 340px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.vinyl-large {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, #1a1a1a 0%, #050505 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.04);
  position: relative;
}

.vinyl-grooves {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: repeating-radial-gradient(
    circle at center,
    transparent 0,
    transparent 2px,
    rgba(255, 255, 255, 0.025) 2px,
    rgba(255, 255, 255, 0.025) 3px
  );
  pointer-events: none;
}

.vinyl-large.spinning {
  animation: vinylRotate 18s linear infinite;
}

@keyframes vinylRotate {
  to { transform: rotate(360deg); }
}

.vinyl-cover {
  width: 56%;
  height: 56%;
  border-radius: 50%;
  background: linear-gradient(135deg, #3a3a3a 0%, #1a1a1a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  overflow: hidden;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.6);
  position: relative;
}

.vinyl-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vinyl-center {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  background: #0a0a0a;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1), inset 0 0 4px rgba(0, 0, 0, 0.8);
  z-index: 2;
}

/* 唱针：支点底座 + 悬臂 + 针头（三段结构，相对黑胶定位） */
.vinyl-needle {
  position: absolute;
  top: 6%;
  right: -4%;
  width: 30%;
  height: 5px;
  transform-origin: 100% 50%;
  transform: rotate(30deg);
  transition: transform 0.7s var(--ncm-ease-out);
  z-index: 5;
  pointer-events: none;
}

.vinyl-needle.down {
  transform: rotate(-18deg);
}

/* 支点底座（右端圆形枢轴） */
.needle-pivot {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translate(0, -50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 32%, #8a8a92 0%, #3a3a40 55%, #0a0a0d 100%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 3px 10px rgba(0, 0, 0, 0.7),
    inset 0 1px 2px rgba(255, 255, 255, 0.15);
}

/* 悬臂（金属渐变细杆） */
.needle-arm {
  position: absolute;
  left: 4px;
  right: 4px;
  top: 50%;
  transform: translate(0, -50%);
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg,
    rgba(120, 120, 130, 0.85) 0%,
    rgba(200, 200, 210, 0.95) 50%,
    rgba(80, 80, 90, 0.9) 100%);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

/* 针头（左端，播放时点亮暖红） */
.needle-tip {
  position: absolute;
  left: -2px;
  top: 50%;
  transform: translate(0, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3a3a40;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
  transition: all 0.4s var(--ncm-ease-out) 0.2s;
}

.vinyl-needle.down .needle-tip {
  background: var(--ncm-primary);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.4),
    0 0 8px var(--ncm-primary-glow),
    0 0 16px var(--ncm-primary-glow);
}

/* —— 歌词视图 —— */
.lyrics-view {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-width: 0;
  height: 100%;
}

.lyrics-scroll {
  position: relative;
  width: 100%;
  max-width: 520px;
  height: 60vh;
  max-height: 540px;
  overflow-y: auto;
  mask-image: linear-gradient(transparent 0%, #000 18%, #000 82%, transparent 100%);
  -webkit-mask-image: linear-gradient(transparent 0%, #000 18%, #000 82%, transparent 100%);
  padding: 160px 0;
  scroll-behavior: smooth;
}

.lyrics-scroll::-webkit-scrollbar { width: 0; }

.lyrics-line {
  font-size: clamp(14px, 1.6vw, 18px);
  color: rgba(255, 255, 255, 0.22);
  line-height: 2.2;
  text-align: center;
  transition: all 0.5s var(--ncm-ease-out);
  cursor: pointer;
  transform: scale(0.96);
  padding: 4px 24px;
}

.lyrics-line.far {
  opacity: 0.5;
}

.lyrics-line.near {
  color: rgba(255, 255, 255, 0.55);
  transform: scale(0.98);
}

.lyrics-line:hover {
  color: rgba(255, 255, 255, 0.6);
}

.lyrics-line.active {
  font-size: clamp(20px, 2.4vw, 26px);
  font-weight: 600;
  color: #fff;
  transform: scale(1);
  text-shadow: 0 0 24px rgba(255, 255, 255, 0.3);
}

.lyrics-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.25);
  font-size: var(--ncm-text-lg);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* —— 底部控制栏 —— */
.lyrics-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px 60px 32px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6) 50%, rgba(0, 0, 0, 0.85));
  display: flex;
  flex-direction: column;
  gap: 18px;
  z-index: 5;
}

/* —— 进度条 —— */
.progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}

.progress-bar {
  position: relative;
  height: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.progress-track {
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
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
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  pointer-events: none;
}

.progress-dot {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
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

.progress-times {
  display: flex;
  justify-content: space-between;
}

.time {
  font-size: var(--ncm-text-xs);
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.02em;
}

/* —— 控制按钮 —— */
.control-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}

.main-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ctrl-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--ncm-transition-fast);
  position: relative;
}

.ctrl-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.ctrl-btn:active {
  transform: scale(0.94);
}

.ctrl-btn.play {
  width: 56px;
  height: 56px;
  background: #fff;
  color: #000;
  box-shadow: 0 6px 24px rgba(255, 255, 255, 0.2);
}

.ctrl-btn.play:hover {
  background: #fff;
  color: #000;
  transform: scale(1.06);
  box-shadow: 0 8px 28px rgba(255, 255, 255, 0.3);
}

.ctrl-btn.side {
  width: 40px;
  height: 40px;
}

.mode-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 9px;
  font-weight: 700;
  color: var(--ncm-primary);
  background: rgba(0, 0, 0, 0.6);
  border-radius: 3px;
  padding: 0 3px;
  line-height: 1.4;
}

/* ============ 移动端 ============ */
@media (max-width: 768px) {
  .desktop-layout { display: none; }
  .mobile-layout { display: flex; flex-direction: column; }

  .lyrics-header {
    padding: 16px 18px;
  }

  .meta-title { font-size: var(--ncm-text-md); max-width: 70vw; }
  .meta-artist { font-size: var(--ncm-text-xs); }

  .close-btn {
    width: 36px;
    height: 36px;
  }

  .vinyl-large {
    width: min(50vh, 260px);
    height: min(50vh, 260px);
  }

  .mobile-layout .cover-stage {
    margin-bottom: 20px;
    flex-direction: column;
  }

  .vinyl-needle { display: none; }

  .mode-hint {
    margin-top: 24px;
    font-size: var(--ncm-text-xs);
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 500;
  }

  .lyrics-view.mobile {
    position: relative;
  }

  .lyrics-view.mobile .mode-hint {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 0;
  }

  .lyrics-view.mobile {
    cursor: pointer;
    justify-content: center;
    padding: 0 24px;
  }

  .lyrics-scroll {
    width: 100%;
    height: 42vh;
    padding: 80px 0;
  }

  .lyrics-line {
    font-size: clamp(14px, 3.5vw, 18px);
    line-height: 2;
  }
  .lyrics-line.active {
    font-size: clamp(18px, 4.5vw, 22px);
  }

  .lyrics-controls {
    padding: 18px 22px 24px;
    gap: 14px;
  }

  .progress-wrap { gap: 6px; }
  .progress-bar { height: 12px; }
  .progress-dot { width: 10px; height: 10px; }

  .control-row {
    gap: 28px;
  }

  .main-controls { gap: 20px; }

  .ctrl-btn { width: 38px; height: 38px; }
  .ctrl-btn.play { width: 48px; height: 48px; }
  .ctrl-btn.side { width: 36px; height: 36px; }
}
</style>
