<template>
  <div class="home-view">
    <!-- 头部：标题 + 计数 + 主操作 -->
    <header class="page-head">
      <div class="head-meta">
        <h1 class="page-title">{{ listTitle }}</h1>
        <div class="page-sub">
          <span class="count tnum">{{ songs.length }}</span>
          <span class="count-label">首歌曲</span>
        </div>
      </div>
      <div class="head-actions">
        <button class="primary-btn" @click="playAll" :disabled="songs.length === 0">
          <NcmIcon name="play" :size="16" />
          <span>播放全部</span>
        </button>
      </div>
    </header>

    <!-- 列表 -->
    <div class="song-list" v-loading="loading" element-loading-text="加载中...">
      <!-- 桌面端表头 -->
      <div v-if="!isMobile && songs.length > 0" class="row row-head">
        <div class="cell cell-index">#</div>
        <div class="cell cell-title">歌曲</div>
        <div class="cell cell-artist">歌手</div>
        <div class="cell cell-actions"></div>
      </div>

      <div
        v-for="(song, index) in songs"
        :key="song.id"
        class="row"
        :class="{
          active: song.id === playerCurrentSong?.id,
          'is-mobile': isMobile
        }"
        @dblclick="playAt(index, $event)"
        @click="isMobile && playAt(index, $event)"
      >
        <!-- 索引 / 播放指示 -->
        <div class="cell cell-index">
          <span v-if="song.id !== playerCurrentSong?.id" class="idx-text tnum">{{ String(index + 1).padStart(2, '0') }}</span>
          <div v-else class="playing-wave" :class="{ paused: !isPlayerPlaying }">
            <span></span><span></span><span></span><span></span>
          </div>
        </div>

        <!-- 标题 + 封面 -->
        <div class="cell cell-title" @click.stop="playAt(index, $event)">
          <div class="song-cover" :ref="el => setCoverRef(el, index)">
            <img v-if="getCoverUrl(song)" :src="getCoverUrl(song)" :alt="song.title" />
            <NcmIcon v-else name="headset" :size="14" />
          </div>
          <div class="song-info">
            <span class="song-name">
              {{ song.title || song.filename }}
              <NcmIcon v-if="favSet.has(song.id)" name="star-filled" :size="11" class="fav-mark" />
            </span>
            <span v-if="isMobile" class="song-artist-mobile">
              {{ song.artist || '未知歌手' }}
            </span>
          </div>
        </div>

        <!-- 歌手 -->
        <div v-if="!isMobile" class="cell cell-artist" @click.stop="playAt(index, $event)">
          {{ song.artist || '未知歌手' }}
        </div>

        <!-- 操作 -->
        <div class="cell cell-actions" :class="{ 'mobile-visible': isMobile }">
          <template v-if="!isMobile">
            <button class="icon-btn" @click.stop="toggleFav(song)" :class="{ 'is-fav': favSet.has(song.id) }">
              <NcmIcon name="star-filled" :size="16" />
            </button>
            <button class="icon-btn danger" @click.stop="removeSong(song.id)">
              <NcmIcon name="delete-filled" :size="16" />
            </button>
          </template>
          <button v-else class="icon-btn" @click.stop="openMobileMenu(song, index)">
            <NcmIcon name="more-filled" :size="18" />
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="songs.length === 0 && !loading" class="empty-state">
        <div class="empty-mark">
          <NcmIcon name="headset" :size="40" />
        </div>
        <div class="empty-text">{{ emptyText }}</div>
      </div>
    </div>

    <!-- 移动端底部菜单 -->
    <el-drawer
      v-model="showMobileMenu"
      direction="btt"
      size="auto"
      :show-close="false"
      :with-header="false"
      class="mobile-menu-drawer"
    >
      <div class="mobile-menu-handle"></div>
      <div class="mobile-menu-header">
        <div class="mobile-menu-cover">
          <img v-if="getCoverUrl(mobileMenuSong)" :src="getCoverUrl(mobileMenuSong)" :alt="mobileMenuSong?.title" />
          <NcmIcon v-else name="headset" :size="20" />
        </div>
        <div class="mobile-menu-info">
          <div class="mobile-menu-title">{{ mobileMenuSong?.title || mobileMenuSong?.filename }}</div>
          <div class="mobile-menu-artist">{{ mobileMenuSong?.artist || '未知歌手' }}</div>
        </div>
      </div>
      <div class="mobile-menu-list">
        <div class="mobile-menu-item" @click="handleMenuCommand('favorite', mobileMenuSong, mobileMenuIndex)">
          <NcmIcon name="star-filled" :size="18" :style="{ color: favSet.has(mobileMenuSong?.id) ? 'var(--ncm-primary)' : '' }" />
          <span>{{ favSet.has(mobileMenuSong?.id) ? '取消收藏' : '收藏' }}</span>
        </div>
        <div class="mobile-menu-item danger" @click="handleMenuCommand('remove', mobileMenuSong, mobileMenuIndex)">
          <NcmIcon name="delete-filled" :size="18" />
          <span>移除</span>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import NcmIcon from '../components/NcmIcon.vue'
import { usePlayer } from '../composables/usePlayer.js'
import { useMobile } from '../composables/useMobile.js'
import { DEFAULT_COVER } from '../config.js'
import { getAllSongs, getFavorites, getFavoriteSet, toggleFavorite as dbToggleFav, deleteSong as dbDeleteSong } from '../db.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const { isMobile } = useMobile()

const {
  currentSong: playerCurrentSong,
  isPlaying: isPlayerPlaying,
  currentIndex: playerIndex,
  songs: playerSongList,
  setSongs,
  playAt: playerPlayAt,
  playSongById: playerPlaySongById,
  setShowLyrics
} = usePlayer()

// 获取封面 URL（无封面时使用默认封面）
function getCoverUrl(song) {
  if (!song) return DEFAULT_COVER
  if (song.coverBlob) return URL.createObjectURL(song.coverBlob)
  if (song.cover) return song.cover
  return DEFAULT_COVER
}

const songs = ref([])
const favSongs = ref([])
const favSet = ref(new Set())
const loading = ref(false)

// 封面元素引用
const coverRefs = new Map()
function setCoverRef(el, index) {
  if (el) {
    coverRefs.set(index, el)
  } else {
    coverRefs.delete(index)
  }
}

// 移动端菜单状态
const showMobileMenu = ref(false)
const mobileMenuSong = ref(null)
const mobileMenuIndex = ref(-1)

const listTitle = computed(() => {
  if (route.query.tab === 'favorites') return '我喜欢的'
  return '音乐列表'
})

const emptyText = computed(() => {
  if (route.query.tab === 'favorites') return '还没有收藏歌曲'
  return '还没有任何音乐'
})

onMounted(async () => {
  await loadData()
})

watch(() => route.query.tab, async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const tab = route.query.tab
    if (tab === 'favorites') {
      songs.value = await getFavorites()
    } else {
      songs.value = await getAllSongs()
    }
    favSet.value = await getFavoriteSet()
    favSongs.value = await getFavorites()
  } finally {
    loading.value = false
  }
}

function getCoverOrigin(index) {
  const el = coverRefs.get(index)
  if (el) {
    const rect = el.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

function playAll() {
  setSongs(songs.value)
  playerPlayAt(0)
  setShowLyrics(true, { x: 60, y: window.innerHeight - 60 })
}

function playAt(index, event) {
  const song = songs.value[index]
  if (!song) return

  const origin = getCoverOrigin(index)

  // 如果点击的是当前正在播放的歌曲，打开歌词页
  if (playerCurrentSong?.value && song.id === playerCurrentSong?.value.id) {
    // 刷新页面后 audio.src 为空，需要重新播放
    if (!isPlayerPlaying.value) {
      playerPlayAt(index)
    } else {
      setShowLyrics(true, origin)
    }
    return
  }

  // 否则切歌：移动端仅切歌不打开歌词页，桌面端切歌同时打开歌词页
  setSongs(songs.value)
  playerPlayAt(index)
  if (!isMobile.value) {
    setShowLyrics(true, origin)
  }
}

function playById(id) {
  if (playerCurrentSong?.value && id === playerCurrentSong?.value.id) {
    setShowLyrics(true, { x: window.innerWidth / 2, y: window.innerHeight / 2 })
    return
  }
  setSongs(songs.value)
  playerPlaySongById(id)
  setShowLyrics(true, { x: window.innerWidth / 2, y: window.innerHeight / 2 })
}

async function toggleFav(song) {
  await dbToggleFav(song.id)
  favSet.value = await getFavoriteSet()
  favSongs.value = await getFavorites()
  ElMessage.success(favSet.value.has(song.id) ? '已添加到我喜欢的' : '已取消收藏')
}

async function removeSong(id) {
  try {
    await ElMessageBox.confirm('确定要删除这首歌曲吗？', '提示', { type: 'warning' })
  } catch { return }
  try {
    await dbDeleteSong(id)
    ElMessage.success('删除成功')
    await loadData()
  } catch (e) {
    ElMessage.error('删除失败：' + (e.message || '未知错误'))
  }
}

function openMobileMenu(song, index) {
  mobileMenuSong.value = song
  mobileMenuIndex.value = index
  showMobileMenu.value = true
}

function handleMenuCommand(command, song, index) {
  showMobileMenu.value = false
  switch (command) {
    case 'favorite':
      toggleFav(song)
      break
    case 'playNext':
      const currentIdx = playerIndex?.value
      if (currentIdx >= 0) {
        playerSongList.splice(currentIdx + 1, 0, song)
        ElMessage.success('已添加到下一首播放')
      } else {
        playAt(index)
      }
      break
    case 'remove':
      removeSong(song.id)
      break
  }
}
</script>

<style scoped>
.home-view {
  padding: 32px 40px calc(var(--ncm-player-bar-height) + 48px);
  min-height: 100%;
}

/* ===== 头部 ===== */
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
}

.head-meta {
  display: flex;
  align-items: baseline;
  gap: 16px;
  min-width: 0;
}

.page-title {
  font-size: var(--ncm-text-3xl);
  font-weight: 700;
  color: var(--ncm-text-primary);
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.1;
}

.page-sub {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: var(--ncm-text-tertiary);
  font-size: var(--ncm-text-sm);
}

.count {
  font-weight: 600;
  color: var(--ncm-text-secondary);
}

.count-label {
  letter-spacing: 0.02em;
}

.head-actions {
  display: flex;
  gap: 8px;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: var(--ncm-radius-full);
  background: var(--ncm-primary);
  color: #fff;
  border: none;
  font-size: var(--ncm-text-md);
  font-weight: 500;
  cursor: pointer;
  transition: var(--ncm-transition-fast);
  box-shadow: 0 4px 14px var(--ncm-primary-glow);
}

.primary-btn:hover:not(:disabled) {
  background: var(--ncm-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px var(--ncm-primary-glow);
}

.primary-btn:active:not(:disabled) {
  transform: translateY(0);
}

.primary-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

/* ===== 列表 ===== */
.song-list {
  min-height: 200px;
}

.row {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: var(--ncm-radius-sm);
  cursor: pointer;
  transition: background 0.15s var(--ncm-ease);
  position: relative;
}

.row:hover {
  background: var(--ncm-bg-hover);
}

.row.active {
  background: var(--ncm-bg-active);
}

.row.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: var(--ncm-primary);
  border-radius: 0 2px 2px 0;
}

.row-head {
  padding: 8px 12px;
  border-bottom: 1px solid var(--ncm-border);
  border-radius: 0;
  font-size: var(--ncm-text-xs);
  color: var(--ncm-text-tertiary);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: default;
  background: transparent;
}

.row-head:hover {
  background: transparent;
}

.cell {
  display: flex;
  align-items: center;
  min-width: 0;
}

.cell-index {
  width: 48px;
  flex-shrink: 0;
  justify-content: center;
  color: var(--ncm-text-tertiary);
  font-size: var(--ncm-text-md);
}

.row-head .cell-index {
  color: var(--ncm-text-quaternary);
}

.idx-text {
  font-variant-numeric: tabular-nums;
  transition: color 0.15s;
}

.row:hover .idx-text {
  color: var(--ncm-text-secondary);
}

.row.active .cell-index {
  color: var(--ncm-primary);
}

/* 播放波形 */
.playing-wave {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
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

.cell-title {
  flex: 1;
  min-width: 0;
  padding-right: 16px;
  gap: 12px;
}

.song-cover {
  width: 40px;
  height: 40px;
  border-radius: var(--ncm-radius-sm);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--ncm-bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ncm-text-tertiary);
  transition: transform 0.2s var(--ncm-ease-out);
  box-shadow: var(--ncm-shadow-sm);
}

.row:hover .song-cover {
  transform: scale(1.06);
}

.song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-info {
  min-width: 0;
  flex: 1;
}

.song-name {
  font-size: var(--ncm-text-md);
  color: var(--ncm-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.row.active .song-name {
  color: var(--ncm-primary);
}

.fav-mark {
  color: var(--ncm-primary);
  flex-shrink: 0;
}

.cell-artist {
  width: 180px;
  font-size: var(--ncm-text-md);
  color: var(--ncm-text-secondary);
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-head .cell-artist {
  color: var(--ncm-text-quaternary);
  font-weight: 600;
}

.cell-actions {
  width: 96px;
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.18s var(--ncm-ease);
}

.row:hover .cell-actions,
.row.active .cell-actions {
  opacity: 1;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--ncm-radius-sm);
  background: transparent;
  border: none;
  color: var(--ncm-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--ncm-transition-fast);
}

.icon-btn:hover {
  background: var(--ncm-bg-hover);
  color: var(--ncm-text-primary);
  transform: translateY(-1px);
}

.icon-btn.is-fav {
  color: var(--ncm-primary);
}

.icon-btn.danger:hover {
  color: #ff5a5a;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  gap: 16px;
}

.empty-mark {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--ncm-bg-elevated);
  border: 1px solid var(--ncm-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ncm-text-tertiary);
}

.empty-text {
  font-size: var(--ncm-text-md);
  color: var(--ncm-text-tertiary);
}

/* ===== 移动端 ===== */
@media (max-width: 768px) {
  .home-view { padding: 16px 16px calc(var(--ncm-player-bar-height-mobile) + var(--ncm-tabbar-height-mobile) + 32px); }

  .page-head {
    margin-bottom: 16px;
  }

  .page-title {
    font-size: var(--ncm-text-2xl);
  }

  .row.is-mobile {
    padding: 10px 8px;
    gap: 0;
  }

  .row.is-mobile .cell-index {
    width: 32px;
    font-size: var(--ncm-text-sm);
  }

  .row.is-mobile .cell-title {
    gap: 12px;
    padding-right: 8px;
  }

  .row.is-mobile .song-cover {
    width: 44px;
    height: 44px;
  }

  .row.is-mobile .song-name {
    font-size: var(--ncm-text-md);
  }

  .song-artist-mobile {
    font-size: var(--ncm-text-xs);
    color: var(--ncm-text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 3px;
    display: block;
  }

  .col-actions.mobile-visible,
  .cell-actions.mobile-visible {
    opacity: 1 !important;
    width: auto;
    gap: 0;
  }

  .cell-actions.mobile-visible .icon-btn {
    width: 40px;
    height: 40px;
  }

  .cell-actions.mobile-visible .icon-btn:active {
    opacity: 0.6;
    transform: none;
  }

  .row.is-mobile {
    min-height: 56px;
    padding: 10px 8px;
  }
}

/* 移动端底部菜单 */
.mobile-menu-drawer :deep(.el-drawer) {
  border-radius: var(--ncm-radius-lg) var(--ncm-radius-lg) 0 0 !important;
  overflow: hidden;
}

.mobile-menu-drawer :deep(.el-drawer__body) {
  padding: 0;
  display: flex;
  flex-direction: column;
  background: var(--ncm-bg-elevated);
}

.mobile-menu-handle {
  width: 40px;
  height: 4px;
  background: var(--ncm-border-strong);
  border-radius: 2px;
  margin: 10px auto 4px;
}

.mobile-menu-header {
  padding: 12px 16px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--ncm-border);
}

.mobile-menu-cover {
  width: 48px;
  height: 48px;
  border-radius: var(--ncm-radius-sm);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--ncm-bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ncm-text-tertiary);
}

.mobile-menu-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mobile-menu-info {
  flex: 1;
  min-width: 0;
}

.mobile-menu-title {
  font-size: var(--ncm-text-lg);
  font-weight: 600;
  color: var(--ncm-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-menu-artist {
  font-size: var(--ncm-text-sm);
  color: var(--ncm-text-tertiary);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-menu-list {
  padding: 8px 12px 16px;
}

.mobile-menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 12px;
  font-size: var(--ncm-text-md);
  color: var(--ncm-text-primary);
  cursor: pointer;
  border-radius: var(--ncm-radius-sm);
  transition: background 0.15s;
}

.mobile-menu-item:active {
  background: var(--ncm-bg-hover);
}

.mobile-menu-item.danger {
  color: #ff5a5a;
}
</style>
