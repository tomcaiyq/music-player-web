<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="fillColor"
    :stroke="strokeColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="ncm-icon"
    aria-hidden="true"
    v-html="paths[name] || ''"
  />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
  filled: { type: Boolean, default: false }
})

// 实心图标集合（用 fill 表达）
const filledIcons = new Set(['play', 'star-filled', 'pause-solid'])

const isFilled = computed(() => props.filled || filledIcons.has(props.name))

const fillColor = computed(() => (isFilled.value ? 'currentColor' : 'none'))
const strokeColor = computed(() => (isFilled.value ? 'none' : 'currentColor'))
const strokeWidth = computed(() => (isFilled.value ? 0 : 1.6))

// 所有图标的 SVG path 内容
// 风格：24x24 viewBox，1.6px 细线，圆角端点，与黑胶复古暖红主题契合
const paths = {
  // 耳机（品牌标识用）
  headset: `
    <path d="M4 13 Q4 5 12 5 Q20 5 20 13" />
    <path d="M4 13 L4 17 Q4 18.5 5.5 18.5 L7.5 18.5 Q8.5 18.5 8.5 17.5 L8.5 14 Q8.5 13 7.5 13 Z" />
    <path d="M20 13 L20 17 Q20 18.5 18.5 18.5 L16.5 18.5 Q15.5 18.5 15.5 17.5 L15.5 14 Q15.5 13 16.5 13 Z" />
  `,

  // 搜索
  search: `
    <circle cx="11" cy="11" r="6.5" />
    <path d="M15.8 15.8 L20.5 20.5" />
  `,

  // 关闭
  close: `
    <path d="M6 6 L18 18" />
    <path d="M18 6 L6 18" />
  `,

  // 首页
  home: `
    <path d="M3.5 11.5 L12 4 L20.5 11.5" />
    <path d="M5.5 10.5 L5.5 19.5 Q5.5 20 6 20 L18 20 Q18.5 20 18.5 19.5 L18.5 10.5" />
    <path d="M10 20 L10 15 L14 15 L14 20" />
  `,

  // 收藏 - 空心
  star: `
    <path d="M12 3.5 L14.3 9 L20.2 9.4 L15.7 13.2 L17.2 18.9 L12 15.6 L6.8 18.9 L8.3 13.2 L3.8 9.4 L9.7 9 Z" />
  `,

  // 收藏 - 实心
  'star-filled': `
    <path d="M12 3.5 L14.3 9 L20.2 9.4 L15.7 13.2 L17.2 18.9 L12 15.6 L6.8 18.9 L8.3 13.2 L3.8 9.4 L9.7 9 Z" />
  `,

  // 用户
  user: `
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5 Q4.5 14 12 14 Q19.5 14 19.5 20.5" />
  `,

  // 播放（实心圆角三角形）
  play: `
    <path d="M8 5.5 Q8.3 5.5 8.6 5.7 L18.2 11.2 Q18.8 11.6 18.8 12 Q18.8 12.4 18.2 12.8 L8.6 18.3 Q8.3 18.5 8 18.5 Q7.2 18.5 7.2 17.5 L7.2 6.5 Q7.2 5.5 8 5.5 Z" />
  `,

  // 暂停（两条圆角竖线 - 实心）
  'pause-solid': `
    <rect x="6.5" y="5" width="3.5" height="14" rx="1.2" />
    <rect x="14" y="5" width="3.5" height="14" rx="1.2" />
  `,

  // 暂停（线条版）
  pause: `
    <path d="M8 5 L8 19" />
    <path d="M16 5 L16 19" />
  `,

  // 上一首
  'caret-left': `
    <path d="M18 5.5 L9 12 L18 18.5" />
    <path d="M6 5 L6 19" />
  `,

  // 下一首
  'caret-right': `
    <path d="M6 5.5 L15 12 L6 18.5" />
    <path d="M18 5 L18 19" />
  `,

  // 播放列表
  list: `
    <path d="M4 7 L14 7" />
    <path d="M4 12 L14 12" />
    <path d="M4 17 L11 17" />
    <circle cx="18" cy="7" r="1.8" />
    <circle cx="18" cy="12" r="1.8" />
    <circle cx="18" cy="17" r="1.8" />
  `,

  // 顺序播放（三条横线）
  operation: `
    <path d="M4 7 L20 7" />
    <path d="M4 12 L20 12" />
    <path d="M4 17 L20 17" />
  `,

  // 随机播放
  'magic-stick': `
    <path d="M4 7 L7 7 Q10 7 12 12 Q14 17 17 17 L20 17" />
    <path d="M4 17 L7 17 Q10 17 12 12 Q14 7 17 7 L20 7" />
    <path d="M17 14.5 L20 17 L17 19.5" />
    <path d="M17 4.5 L20 7 L17 9.5" />
  `,

  // 单曲循环（一体化路径：上半圆右箭头 + 下半圆左箭头，无缝连接）
  'refresh-left': `
    <path d="M6.5 9 L17.5 9 Q20.5 9 20.5 12 Q20.5 15 17.5 15 L13 15" />
    <path d="M10.5 12 L13 15 L10.5 18" />
    <path d="M17.5 15 L6.5 15 Q3.5 15 3.5 12 Q3.5 9 6.5 9 L11 9" />
    <path d="M13.5 12 L11 9 L13.5 6" />
  `,

  // 单曲循环（带"1"嵌在中间，一体化图标）—— 整体加高 + 1 字更窄
  'repeat-one': `
    <path d="M7 5.5 L17 5.5 Q20.5 5.5 20.5 9 Q20.5 11 19.2 11.8" />
    <path d="M16.8 10 L19.2 12.5 L21.8 10" />
    <path d="M17 18.5 L7 18.5 Q3.5 18.5 3.5 15 Q3.5 13 4.8 12.2" />
    <path d="M7.2 14 L4.8 11.5 L2.2 14" />
    <path d="M11.8 15 L11.8 9.5 Q11.8 9.1 11.5 9.1 Q11.2 9.1 10.9 9.4" />
    <path d="M10.9 9.4 Q11.4 9.1 11.8 9.1 Q12.4 9.1 12.4 9.8 L12.4 15" />
  `,

  // 音量（喇叭）
  microphone: `
    <path d="M4 9.5 L8 9.5 L13 5 L13 19 L8 14.5 L4 14.5 Z" />
    <path d="M16 8.5 Q18 12 16 15.5" />
    <path d="M18.5 6 Q21.5 12 18.5 18" />
  `,

  // 静音
  mute: `
    <path d="M4 9.5 L8 9.5 L13 5 L13 19 L8 14.5 L4 14.5 Z" />
    <path d="M16.5 9.5 L21 14" />
    <path d="M21 9.5 L16.5 14" />
  `,

  // 删除（垃圾桶）
  delete: `
    <path d="M4 7 L20 7" />
    <path d="M9 5 L15 5" />
    <path d="M6 7 L7 20 Q7 20.5 7.5 20.5 L16.5 20.5 Q17 20.5 17 20 L18 7" />
    <path d="M10 11 L10 17" />
    <path d="M14 11 L14 17" />
  `,

  // 删除 - 实心
  'delete-filled': `
    <path d="M3.5 6.5 L20.5 6.5 L20.5 7.5 L19 7.5 L17.8 20.3 Q17.7 21 17 21 L7 21 Q6.3 21 6.2 20.3 L5 7.5 L3.5 7.5 Z" />
    <path d="M9 4.5 L15 4.5 Q15.5 4.5 15.5 5 L15.5 6.5 L8.5 6.5 L8.5 5 Q8.5 4.5 9 4.5 Z" />
  `,

  // 更多（三个竖点）
  'more-filled': `
    <circle cx="12" cy="5" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="12" cy="19" r="1.6" />
  `,

  // 收藏夹（文件夹）
  collection: `
    <path d="M3.5 6.5 Q3.5 5.5 4.5 5.5 L9 5.5 L11 7.5 L19.5 7.5 Q20.5 7.5 20.5 8.5 L20.5 18 Q20.5 19 19.5 19 L4.5 19 Q3.5 19 3.5 18 Z" />
    <path d="M3.5 10 L20.5 10" />
  `,

  // 时长（时钟）
  timer: `
    <circle cx="12" cy="12.5" r="7.5" />
    <path d="M12 8.5 L12 12.5 L15 14" />
    <path d="M9 3.5 L15 3.5" />
  `,

  // 音符（备用）
  music: `
    <path d="M9 18 Q9 20 7 20 Q5 20 5 18 Q5 16 7 16 Q9 16 9 18 L9 8 L18 5 L18 15 Q18 17 16 17 Q14 17 14 15 Q14 13 16 13 Q18 13 18 15" />
  `,

  // 唱片（备用）
  disc: `
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="2.5" />
  `,
}
</script>

<style scoped>
.ncm-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
