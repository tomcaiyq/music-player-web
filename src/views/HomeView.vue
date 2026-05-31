<template>
  <div class="home-view">
    <el-row :gutter="isMobile ? 0 : 20">
      <!-- 左侧歌曲列表 -->
      <el-col :span="isMobile ? 24 : 18">
        <div class="list-panel">
          <!-- 列表头 -->
          <div class="list-toolbar">
            <div class="toolbar-left">
              <h2>{{ listTitle }}</h2>
              <span class="song-count">共 {{ songs.length }} 首</span>
            </div>
            <div class="toolbar-right">
              <el-button type="primary" size="small" @click="playAll" :disabled="songs.length === 0">
                <el-icon><VideoPlay /></el-icon> 播放全部
              </el-button>
            </div>
          </div>

          <!-- 表格 -->
          <div class="song-table" v-loading="loading" element-loading-text="加载中...">
            <!-- 桌面端表头 -->
            <div v-if="!isMobile" class="table-header">
              <div class="col-index"></div>
              <div class="col-title">歌曲</div>
              <div class="col-artist">歌手</div>
              <div class="col-actions"></div>
            </div>
            <div
              v-for="(song, index) in songs"
              :key="song.id"
              class="table-row"
              :class="{
                active: song.id === playerState.currentSong?.id,
                even: index % 2 === 0,
                'is-mobile': isMobile
              }"
              @dblclick="playAt(index, $event)"
              @click="isMobile && playAt(index, $event)"
            >
              <div class="col-index">
                <span v-if="song.id !== playerState.currentSong?.id">{{ String(index + 1).padStart(2, '0') }}</span>
                <el-icon v-else class="playing-icon"><Headset /></el-icon>
              </div>
              <div class="col-title" @click.stop="playAt(index, $event)">
                <div class="song-cover" v-if="getCoverUrl(song)" :ref="el => setCoverRef(el, index)">
                  <img :src="getCoverUrl(song)" :alt="song.title" />
                </div>
                <div class="song-cover placeholder" v-else :ref="el => setCoverRef(el, index)">
                  <el-icon :size="14"><Headset /></el-icon>
                </div>
                <div class="song-info">
                  <span class="song-name">
                    {{ song.title || song.filename }}
                    <el-icon v-if="favSet.has(song.id)" :size="10" class="fav-icon-small"><StarFilled /></el-icon>
                  </span>
                  <!-- 移动端：歌手名跟在标题下面 -->
                  <span v-if="isMobile" class="song-artist-mobile">
                    {{ song.artist || '未知歌手' }}
                  </span>
                </div>
              </div>
              <div v-if="!isMobile" class="col-artist" @click.stop="playAt(index, $event)">{{ song.artist || '未知歌手' }}</div>
              <div class="col-actions" :class="{ 'mobile-visible': isMobile }">
                <!-- 桌面端：展开的按钮 -->
                <template v-if="!isMobile">
                  <el-button text size="small" @click.stop="toggleFav(song)" class="action-btn" :class="{ 'is-fav': favSet.has(song.id) }">
                    <el-icon :style="{ color: favSet.has(song.id) ? '#C20C0C' : '' }"><StarFilled /></el-icon>
                  </el-button>
                  <el-button text size="small" @click.stop="removeSong(song.id)" class="action-btn del-btn">
                    <el-icon><DeleteFilled /></el-icon>
                  </el-button>
                </template>
                <!-- 移动端：点击打开底部菜单 -->
                <el-button v-else text size="small" @click.stop="openMobileMenu(song, index)" class="action-btn menu-btn">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-if="songs.length === 0 && !loading" class="empty-state">
              <el-empty :description="emptyText" :image-size="80" />
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 移动端底部菜单 -->
    <el-drawer
      v-model="showMobileMenu"
      direction="btt"
      size="auto"
      :show-close="false"
      :with-header="false"
      class="mobile-menu-drawer"
    >
      <div class="mobile-menu-header">
        <div class="mobile-menu-cover" v-if="getCoverUrl(mobileMenuSong)">
          <img :src="getCoverUrl(mobileMenuSong)" :alt="mobileMenuSong?.title" />
        </div>
        <div class="mobile-menu-cover placeholder" v-else>
          <el-icon :size="20"><Headset /></el-icon>
        </div>
        <div class="mobile-menu-info">
          <div class="mobile-menu-title">{{ mobileMenuSong?.title || mobileMenuSong?.filename }}</div>
          <div class="mobile-menu-artist">{{ mobileMenuSong?.artist || '未知歌手' }}</div>
        </div>
      </div>
      <div class="mobile-menu-list">
        <div class="mobile-menu-item" @click="handleMenuCommand('favorite', mobileMenuSong, mobileMenuIndex)">
          <el-icon :size="18" :style="{ color: favSet.has(mobileMenuSong?.id) ? '#C20C0C' : '' }"><StarFilled /></el-icon>
          <span>{{ favSet.has(mobileMenuSong?.id) ? '取消收藏' : '收藏' }}</span>
        </div>
        
        <div class="mobile-menu-item danger" @click="handleMenuCommand('remove', mobileMenuSong, mobileMenuIndex)">
          <el-icon :size="18"><DeleteFilled /></el-icon>
          <span>移除</span>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { StarFilled, DeleteFilled, VideoPlay, Timer, Headset, MoreFilled } from '@element-plus/icons-vue'
import { usePlayer } from '../composables/usePlayer.js'
import { useMobile } from '../composables/useMobile.js'
import { getAllSongs, getFavorites, getFavoriteSet, toggleFavorite as dbToggleFav, deleteSong as dbDeleteSong } from '../db.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const { isMobile } = useMobile()

const {
  state: playerState,
  rawState,
  setSongs,
  playSong: playerPlaySong,
  playSongById: playerPlaySongById,
  setShowLyrics
} = usePlayer()

// 获取封面 URL
function getCoverUrl(song) {
  if (!song) return ''
  if (song.coverBlob) return URL.createObjectURL(song.coverBlob)
  if (song.cover) return song.cover
  return ''
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
  playerPlaySong(0)
  setShowLyrics(true, { x: 60, y: window.innerHeight - 60 })
}

function playAt(index, event) {
  const song = songs.value[index]
  if (!song) return

  const origin = getCoverOrigin(index)

  // 如果点击的是当前正在播放的歌曲，直接打开歌词页
  if (playerState.currentSong && song.id === playerState.currentSong.id) {
    setShowLyrics(true, origin)
    return
  }

  // 否则切歌并打开歌词页
  setSongs(songs.value)
  playerPlaySong(index)
  setShowLyrics(true, origin)
}

function playById(id) {
  // 如果点击的是当前正在播放的歌曲，直接打开歌词页
  if (playerState.currentSong && id === playerState.currentSong.id) {
    setShowLyrics(true, { x: window.innerWidth / 2, y: window.innerHeight / 2 })
    return
  }

  // 否则切歌并打开歌词页
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
      // 将歌曲添加到下一首播放位置
      const currentIdx = rawState.currentIndex
      if (currentIdx >= 0) {
        rawState.songs.splice(currentIdx + 1, 0, song)
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
.home-view { padding: 20px; height: 100%; }

/* ===== 列表面板 ===== */
.list-panel {
  background: var(--ncm-bg-card);
  border-radius: var(--ncm-radius-lg);
  overflow: hidden;
  box-shadow: var(--ncm-shadow);
  border: 1px solid var(--ncm-border);
}

.list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--ncm-border);
  background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%);
}

.toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.toolbar-left h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--ncm-text-primary);
  margin: 0;
}

.song-count {
  font-size: 12px;
  color: var(--ncm-text-tertiary);
}

/* ===== 表格 ===== */
.song-table {
  min-height: 200px;
}

.table-header {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--ncm-border);
  font-size: 12px;
  color: var(--ncm-text-tertiary);
  font-weight: 600;
  letter-spacing: 0.5px;
}

.table-row {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid var(--ncm-border-light);
  cursor: pointer;
  transition: var(--ncm-transition-fast);
}

.table-row:hover {
  background: var(--ncm-bg-hover);
}

.table-row.active {
  background: var(--ncm-bg-active);
}

.table-row.active .song-name {
  color: var(--ncm-primary);
}

.table-row.active .col-index {
  color: var(--ncm-primary);
}

.col-index {
  width: 40px;
  font-size: 13px;
  color: var(--ncm-text-placeholder);
  flex-shrink: 0;
  text-align: center;
}

.playing-icon {
  color: var(--ncm-primary);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.col-title {
  flex: 1;
  min-width: 0;
  padding-right: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.song-cover {
  width: 42px;
  height: 42px;
  border-radius: var(--ncm-radius-sm);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--ncm-bg-input);
  transition: var(--ncm-transition-fast);
}

.table-row:hover .song-cover {
  transform: scale(1.05);
}

.song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-cover.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ncm-text-placeholder);
}

.song-info {
  min-width: 0;
  flex: 1;
}

.song-name {
  font-size: 13px;
  color: var(--ncm-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  font-weight: 500;
}

.col-artist {
  width: 120px;
  font-size: 13px;
  color: var(--ncm-text-secondary);
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.fav-icon-small {
  color: var(--ncm-primary);
  flex-shrink: 0;
  margin-left: 6px;
}

.col-actions {
  width: 80px;
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.table-row:hover .col-actions {
  opacity: 1;
}

.action-btn {
  color: var(--ncm-text-tertiary) !important;
  padding: 6px !important;
  transition: var(--ncm-transition-fast);
}

.action-btn:hover {
  color: var(--ncm-text-primary) !important;
}

.action-btn.is-fav {
  color: var(--ncm-primary) !important;
}

.del-btn:hover {
  color: #F56C6C !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}

/* ===== 右侧面板 ===== */
.side-panel { display: flex; flex-direction: column; gap: 16px; }

.side-card {
  background: var(--ncm-bg-card);
  border-radius: var(--ncm-radius-md);
  box-shadow: var(--ncm-shadow);
  overflow: hidden;
  transition: var(--ncm-transition);
  border: 1px solid var(--ncm-border);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--ncm-text-primary);
  border-bottom: 1px solid var(--ncm-border);
}

.card-body { padding: 4px 0; }

.empty-fav {
  padding: 30px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--ncm-text-placeholder);
}

.fav-list { max-height: 360px; overflow-y: auto; }

.fav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  transition: var(--ncm-transition-fast);
}

.fav-item:hover { background: var(--ncm-bg-hover); }
.fav-item.active .fav-name { color: var(--ncm-primary); }
.fav-info { min-width: 0; flex: 1; }
.fav-name { display: block; font-size: 13px; color: var(--ncm-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fav-artist { display: block; font-size: 11px; color: var(--ncm-text-tertiary); margin-top: 2px; }
.fav-dur { font-size: 11px; color: var(--ncm-text-placeholder); margin-left: 12px; flex-shrink: 0; }

/* ===== 移动端 ===== */
@media (max-width: 768px) {
  .home-view { padding: 0; }
  .list-panel { border-radius: 0; box-shadow: none; }
  .list-toolbar { padding: 14px 16px; }
  .toolbar-left h2 { font-size: 16px; }

  .table-row.is-mobile {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    gap: 12px;
  }

  .table-row.is-mobile .col-index {
    width: 28px;
    font-size: 12px;
    flex-shrink: 0;
    text-align: center;
  }

  .table-row.is-mobile .col-title {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .table-row.is-mobile .song-cover {
    width: 40px;
    height: 40px;
  }

  .table-row.is-mobile .song-info {
    flex: 1;
    min-width: 0;
  }

  .song-artist-mobile {
    font-size: 11px;
    color: var(--ncm-text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 3px;
    margin-top: 2px;
  }

  .col-actions.mobile-visible {
    opacity: 1 !important;
    width: auto;
    display: flex;
    align-items: center;
    gap: 0;
    flex-shrink: 0;
  }

  .col-actions.mobile-visible .action-btn {
    padding: 10px !important;
  }

  .col-actions.mobile-visible .action-btn:active {
    opacity: 0.6;
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
  background: var(--ncm-bg-main);
}

.mobile-menu-header {
  padding: 12px 12px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--ncm-border);
}

.mobile-menu-cover {
  width: 44px;
  height: 44px;
  border-radius: var(--ncm-radius-sm);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--ncm-bg-input);
}

.mobile-menu-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mobile-menu-cover.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ncm-text-placeholder);
}

.mobile-menu-info {
  flex: 1;
  min-width: 0;
}

.mobile-menu-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--ncm-text-inverse);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-menu-artist {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-menu-list {
  padding: 8px 12px 12px;
}

.mobile-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  font-size: 14px;
  color: var(--ncm-text-inverse);
  cursor: pointer;
  border-radius: var(--ncm-radius-md);
  transition: var(--ncm-transition-fast);
}

.mobile-menu-item:active {
  background: rgba(255,255,255,0.1);
}

.mobile-menu-item.danger {
  color: #F56C6C;
}
</style>
