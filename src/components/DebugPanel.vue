<template>
  <transition name="debug-fade">
    <div v-if="visible" class="debug-mask" @click.self="close">
      <div class="debug-panel">
        <header class="debug-header">
          <h3>调试面板</h3>
          <button class="close-btn" @click="close">×</button>
        </header>

        <div class="debug-body">
          <!-- 实时屏幕数据 -->
          <section class="section">
            <div class="section-title">屏幕数据（只读）</div>
            <div class="data-grid">
              <div class="data-item"><span class="label">window.innerWidth</span><span class="value">{{ info.innerW }}</span></div>
              <div class="data-item"><span class="label">window.innerHeight</span><span class="value">{{ info.innerH }}</span></div>
              <div class="data-item"><span class="label">screen.width</span><span class="value">{{ info.screenW }}</span></div>
              <div class="data-item"><span class="label">screen.height</span><span class="value">{{ info.screenH }}</span></div>
              <div class="data-item"><span class="label">devicePixelRatio</span><span class="value">{{ info.dpr }}</span></div>
              <div class="data-item"><span class="label">visualViewport.h</span><span class="value">{{ info.vvH }}</span></div>
              <div class="data-item"><span class="label">100vh 实际像素</span><span class="value">{{ info.vh100 }}</span></div>
              <div class="data-item"><span class="label">100dvh 实际像素</span><span class="value">{{ info.dvh100 }}</span></div>
            </div>
            <button class="refresh-btn" @click="refreshInfo">刷新数据</button>
          </section>

          <!-- 调整覆盖值 -->
          <section class="section">
            <div class="section-title">布局覆盖（实时生效）</div>

            <div class="field">
              <label>应用高度 (--app-height)</label>
              <div class="input-row">
                <input type="number" v-model.number="form.appHeight" placeholder="留空使用默认" step="1" />
                <span class="unit">px</span>
                <button class="set-btn" @click="setAppHeight(form.appHeight)">应用</button>
              </div>
              <div class="hint">设为 window.innerHeight 的值可让容器贴合可见区域</div>
            </div>

            <div class="field">
              <label>顶部安全区 (--ncm-safe-top)</label>
              <div class="input-row">
                <input type="number" v-model.number="form.safeTop" placeholder="留空使用默认" step="1" />
                <span class="unit">px</span>
                <button class="set-btn" @click="setSafeTop(form.safeTop)">应用</button>
              </div>
            </div>

            <div class="field">
              <label>底部安全区 (--ncm-safe-bottom)</label>
              <div class="input-row">
                <input type="number" v-model.number="form.safeBottom" placeholder="留空使用默认" step="1" />
                <span class="unit">px</span>
                <button class="set-btn" @click="setSafeBottom(form.safeBottom)">应用</button>
              </div>
              <div class="hint">底部被导航栏遮挡时，调大此值（如 24、48、64）</div>
            </div>
          </section>

          <!-- 操作按钮 -->
          <section class="section">
            <div class="section-title">操作</div>
            <div class="action-row">
              <button class="action-btn save" @click="save">保存到本机</button>
              <button class="action-btn reset" @click="reset">清除并重置</button>
            </div>
            <div class="hint">保存后下次启动自动应用，重置后恢复默认行为</div>
          </section>

          <!-- 快速预设 -->
          <section class="section">
            <div class="section-title">快速预设</div>
            <div class="action-row">
              <button class="action-btn preset" @click="applyPreset('innerHeight')">用 innerHeight</button>
              <button class="action-btn preset" @click="applyPreset('dvh')">用 100dvh</button>
              <button class="action-btn preset" @click="applyPreset('clear')">清除高度</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { applyDebugOverrides, DEBUG_STORAGE_KEY, getDebugOverrides } from '../config.js'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['update:visible'])

function close() { emit('update:visible', false) }

const info = reactive({
  innerW: 0, innerH: 0, screenW: 0, screenH: 0,
  dpr: 0, vvH: 0, vh100: 0, dvh100: 0
})

const form = reactive({
  appHeight: null,
  safeTop: null,
  safeBottom: null
})

function refreshInfo() {
  info.innerW = window.innerWidth
  info.innerH = window.innerHeight
  info.screenW = window.screen.width
  info.screenH = window.screen.height
  info.dpr = window.devicePixelRatio || 0
  info.vvH = window.visualViewport ? window.visualViewport.height : 0
  // 测量 100vh / 100dvh 的实际像素
  const el = document.documentElement
  info.vh100 = parseFloat(getComputedStyle(el).getPropertyValue('--test-vh') || '0') || 0
  info.dvh100 = parseFloat(getComputedStyle(el).getPropertyValue('--test-dvh') || '0') || 0
  // 用一个临时元素测量
  measureVh()
}

function measureVh() {
  const tmp = document.createElement('div')
  tmp.style.cssText = 'position:absolute;left:-9999px;top:0;width:0;height:100vh;'
  document.body.appendChild(tmp)
  info.vh100 = tmp.offsetHeight
  tmp.remove()
  const tmp2 = document.createElement('div')
  tmp2.style.cssText = 'position:absolute;left:-9999px;top:0;width:0;height:100dvh;'
  document.body.appendChild(tmp2)
  info.dvh100 = tmp2.offsetHeight
  tmp2.remove()
}

function setAppHeight(v) {
  if (v === null || v === '' || isNaN(v)) {
    document.documentElement.style.removeProperty('--app-height')
  } else {
    document.documentElement.style.setProperty('--app-height', v + 'px')
  }
}
function setSafeTop(v) {
  if (v === null || v === '' || isNaN(v)) {
    document.documentElement.style.removeProperty('--ncm-safe-top')
  } else {
    document.documentElement.style.setProperty('--ncm-safe-top', v + 'px')
  }
}
function setSafeBottom(v) {
  if (v === null || v === '' || isNaN(v)) {
    document.documentElement.style.removeProperty('--ncm-safe-bottom')
  } else {
    document.documentElement.style.setProperty('--ncm-safe-bottom', v + 'px')
  }
}

function collectCurrent() {
  const cs = getComputedStyle(document.documentElement)
  const ah = cs.getPropertyValue('--app-height').trim()
  const st = cs.getPropertyValue('--ncm-safe-top').trim()
  const sb = cs.getPropertyValue('--ncm-safe-bottom').trim()
  return {
    appHeight: ah ? parseFloat(ah) : null,
    safeTop: st ? parseFloat(st) : null,
    safeBottom: sb ? parseFloat(sb) : null
  }
}

function save() {
  const cur = collectCurrent()
  localStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(cur))
  alert('已保存，下次启动自动应用')
}

function reset() {
  localStorage.removeItem(DEBUG_STORAGE_KEY)
  document.documentElement.style.removeProperty('--app-height')
  document.documentElement.style.removeProperty('--ncm-safe-top')
  document.documentElement.style.removeProperty('--ncm-safe-bottom')
  form.appHeight = null
  form.safeTop = null
  form.safeBottom = null
  alert('已重置为默认行为')
}

function applyPreset(type) {
  if (type === 'innerHeight') {
    setAppHeight(window.innerHeight)
    form.appHeight = window.innerHeight
  } else if (type === 'dvh') {
    document.documentElement.style.removeProperty('--app-height')
    form.appHeight = null
  } else if (type === 'clear') {
    document.documentElement.style.removeProperty('--app-height')
    form.appHeight = null
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    refreshInfo()
    const cur = collectCurrent()
    // 首次进入（没有任何覆盖值）时，自动用 window.innerHeight 填入并应用一次
    if (cur.appHeight == null) {
      const innerH = window.innerHeight
      form.appHeight = innerH
      setAppHeight(innerH)
    } else {
      form.appHeight = cur.appHeight
    }
    form.safeTop = cur.safeTop
    form.safeBottom = cur.safeBottom
  }
})

onMounted(() => {
  refreshInfo()
})
</script>

<style scoped>
.debug-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  /* 高度限制在可见区域内，与 .ncm-app 一致 */
  height: var(--app-height, 100vh);
  height: var(--app-height, 100dvh);
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

@supports (height: 100dvh) {
  .debug-mask { height: var(--app-height, 100dvh); }
}

.debug-panel {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  background: #1a1a1c;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #eee;
}

.debug-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.debug-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
.close-btn {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(255,255,255,0.08); border: none; color: #fff;
  cursor: pointer; font-size: 18px; line-height: 1;
}

.debug-body {
  padding: 16px 18px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.section { margin-bottom: 20px; }
.section-title {
  font-size: 12px; color: rgba(255,255,255,0.5);
  margin-bottom: 10px; text-transform: uppercase;
  letter-spacing: 0.05em;
}

.data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}
.data-item {
  background: rgba(255,255,255,0.04);
  padding: 8px 10px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.data-item .label { font-size: 11px; color: rgba(255,255,255,0.5); }
.data-item .value { font-size: 14px; font-weight: 600; color: #fff; font-variant-numeric: tabular-nums; }

.refresh-btn {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: #fff; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px;
}

.field { margin-bottom: 14px; }
.field label {
  display: block; font-size: 13px; color: rgba(255,255,255,0.8); margin-bottom: 6px;
}
.input-row {
  display: flex; align-items: center; gap: 8px;
}
.input-row input {
  flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15);
  color: #fff; padding: 8px 10px; border-radius: 6px; font-size: 14px;
  font-variant-numeric: tabular-nums; min-width: 0;
}
.input-row input:focus { outline: none; border-color: var(--ncm-primary, #e74c3c); }
.unit { font-size: 12px; color: rgba(255,255,255,0.4); }
.set-btn {
  background: var(--ncm-primary, #e74c3c); border: none; color: #fff;
  padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px;
}
.hint { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 4px; }

.action-row {
  display: flex; gap: 8px; flex-wrap: wrap;
}
.action-btn {
  flex: 1; min-width: 80px;
  padding: 9px 12px; border-radius: 6px; cursor: pointer; font-size: 13px;
  border: 1px solid rgba(255,255,255,0.15);
}
.action-btn.save { background: var(--ncm-primary, #e74c3c); color: #fff; border: none; }
.action-btn.reset { background: rgba(255,255,255,0.06); color: #fff; }
.action-btn.preset { background: rgba(255,255,255,0.06); color: #fff; }

.debug-fade-enter-active, .debug-fade-leave-active { transition: opacity 0.2s; }
.debug-fade-enter-from, .debug-fade-leave-to { opacity: 0; }
</style>
