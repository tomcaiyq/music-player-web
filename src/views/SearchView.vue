<template>
  <div class="search-view">
    <!-- 头部：标题 + 搜索框 -->
    <header class="page-head">
      <h1 class="page-title">发现音乐</h1>
      <p class="page-sub">搜索歌曲、歌手，发现你的下一首循环</p>

      <div class="search-bar">
        <div class="search-input-wrap">
          <NcmIcon name="search" :size="18" class="search-icon" />
          <input
            v-model="query"
            placeholder="搜索音乐、歌手"
            class="search-input"
            @keyup.enter="doSearch"
          />
          <button v-if="query" class="clear-btn" @click="query = ''">
            <NcmIcon name="close" :size="14" />
          </button>
        </div>
        <button class="primary-btn search-btn" @click="doSearch" :disabled="loading">
          <NcmIcon v-if="!loading" name="search" :size="16" class="search-icon-mobile" />
          <span v-if="!loading" class="btn-text">搜索</span>
          <span v-else class="loading-dot"></span>
        </button>
      </div>
    </header>

    <!-- 结果标题 -->
    <div class="result-head" v-if="searched">
      <h2 class="result-title">搜索结果</h2>
      <span class="result-count tnum" v-if="results.length > 0">共 {{ totalResults }} 首</span>
    </div>

    <!-- 结果列表 -->
    <div class="song-list" v-loading="loading" element-loading-text="搜索中...">
      <div v-if="!isMobile && results.length > 0" class="row row-head">
        <div class="cell cell-index">#</div>
        <div class="cell cell-title">歌曲</div>
        <div class="cell cell-artist">歌手</div>
        <div class="cell cell-actions"></div>
      </div>

      <div
        v-for="(song, index) in results"
        :key="song.id"
        class="row"
        :class="{ 'is-mobile': isMobile, unavailable: song._unavailable }"
        @dblclick="!song._unavailable && playSong(index)"
        @click="isMobile && !song._unavailable && playSong(index)"
      >
        <div class="cell cell-index">
          <span class="idx-text tnum">{{ String(index + 1).padStart(2, '0') }}</span>
        </div>
        <div class="cell cell-title">
          <div class="song-cover">
            <img v-if="song.pic" :src="song.pic" :alt="song.title" @error="handleImageError($event)" />
            <NcmIcon v-else name="headset" :size="14" />
          </div>
          <div class="song-info">
            <span class="song-name">{{ song.title }}</span>
            <span v-if="isMobile" class="song-artist-mobile">{{ song.artist }}</span>
          </div>
        </div>
        <div v-if="!isMobile" class="cell cell-artist">{{ song.artist }}</div>
        <div class="cell cell-actions" :class="{ 'mobile-visible': isMobile }">
          <!-- 桌面端：直接显示按钮 -->
          <template v-if="!isMobile">
            <button v-if="!song._unavailable" class="icon-btn primary" @click.stop="playSong(index)" :disabled="song._loading">
              <NcmIcon v-if="!song._loading" name="play" :size="16" />
              <span v-else class="mini-dot"></span>
            </button>
            <button v-if="!song._unavailable" class="icon-btn" @click.stop="saveSong(index)" :disabled="song._saving">
              <NcmIcon v-if="!song._saving" name="collection" :size="16" />
              <span v-else class="mini-dot"></span>
            </button>
            <span v-else class="unavailable-text">不可用</span>
          </template>
          <!-- 移动端：MoreFilled 菜单按钮 -->
          <button
            v-else
            class="icon-btn mobile-menu-btn"
            @click.stop="openMobileMenu(song, index)"
            :disabled="song._unavailable"
          >
            <NcmIcon name="more-filled" :size="18" />
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="results.length === 0 && !loading && searched" class="empty-state">
        <div class="empty-mark">
          <NcmIcon name="search" :size="40" />
        </div>
        <div class="empty-text">未找到相关歌曲</div>
      </div>

      <!-- 初始提示 -->
      <div v-if="results.length === 0 && !loading && !searched" class="hint-state">
        <div class="hint-suggestions">
          <div class="hint-group">
            <div class="hint-label">华语流行</div>
            <div class="suggestions">
              <button class="suggestion" v-for="word in cnSuggestions" :key="word" @click="query = word; doSearch()">{{ word }}</button>
            </div>
          </div>
          <div class="hint-group">
            <div class="hint-label">欧美流行</div>
            <div class="suggestions">
              <button class="suggestion" v-for="word in enSuggestions" :key="word" @click="query = word; doSearch()">{{ word }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 移动端歌曲操作抽屉 -->
    <transition name="drawer-fade">
      <div v-if="isMobile && mobileMenu.visible" class="mobile-menu-mask" @click="mobileMenu.visible = false">
        <transition name="menu-slide">
          <div v-if="mobileMenu.visible" class="mobile-menu-drawer" @click.stop>
            <div class="drawer-handle" @click="mobileMenu.visible = false"></div>
            <div class="menu-song-info" v-if="mobileMenu.song">
              <div class="menu-song-cover">
                <img v-if="mobileMenu.song.pic" :src="mobileMenu.song.pic" alt="" />
                <NcmIcon v-else name="headset" :size="24" />
              </div>
              <div class="menu-song-text">
                <div class="menu-song-title">{{ mobileMenu.song.title }}</div>
                <div class="menu-song-artist">{{ mobileMenu.song.artist }}</div>
              </div>
            </div>
            <div class="menu-list">
              <button class="menu-item" @click="handleMenuAction('play')" :disabled="mobileMenu.song?._loading">
                <NcmIcon name="play" :size="18" />
                <span>{{ mobileMenu.song?._loading ? '加载中...' : '播放' }}</span>
              </button>
              <button class="menu-item" @click="handleMenuAction('save')" :disabled="mobileMenu.song?._saving">
                <NcmIcon name="collection" :size="18" />
                <span>{{ mobileMenu.song?._saving ? '保存中...' : '保存到我的' }}</span>
              </button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import NcmIcon from '../components/NcmIcon.vue'
import { usePlayer } from '../composables/usePlayer.js'
import { useMobile } from '../composables/useMobile.js'
import { addSong } from '../db.js'
import { ElMessage } from 'element-plus'
import { SONG_SEARCH_API, SEARCH_API_ID, SEARCH_API_KEY, MP3_BASE_URL, DEFAULT_COVER, proxyUrl, unifiedFetch } from '../config.js'

const { isMobile } = useMobile()
const route = useRoute()
const { setSongs, playAt } = usePlayer()

const query = ref('')
const results = ref([])
const loading = ref(false)
const searched = ref(false)
const totalResults = ref(0)
const cnSuggestions = [
  '周杰伦', '林俊杰', '邓紫棋', '陈奕迅',
  '王菲', '张学友', '五月天', '孙燕姿',
  '薛之谦', '李荣浩', '毛不易', '华晨宇'
]
const enSuggestions = [
  'Taylor Swift', 'Ed Sheeran', 'Adele', 'Bruno Mars'
]

// 移动端歌曲菜单抽屉
const mobileMenu = ref({
  visible: false,
  song: null,
  index: -1
})

function openMobileMenu(song, index) {
  mobileMenu.value = { visible: true, song: { ...song }, index }
}

function handleMenuAction(action) {
  const { index } = mobileMenu.value
  mobileMenu.value.visible = false
  if (action === 'play') {
    playSong(index)
  } else if (action === 'save') {
    saveSong(index)
  }
}

onMounted(() => {
  if (route.query.q) {
    query.value = route.query.q
    doSearch()
  }
})

// 构建 MP3 播放地址
function buildMp3Url(filePath) {
  if (!filePath) return ''
  return MP3_BASE_URL + '/' + filePath.replace(/\.wma$/i, '.mp3')
}

// 从歌曲页面抓取 $song_data 获取 MP3 地址 + 歌词页 URL（需走 CORS 代理）
async function fetchSongMetaFromPage(pageUrl) {
  const html = await unifiedFetch(proxyUrl(pageUrl)).then(r => r.text())

  // MP3 地址
  let audioUrl = ''
  const audioMatch = html.match(/\$song_data\[\d+\]\s*=\s*"([^"]*)"/)
  if (audioMatch) {
    const parts = audioMatch[1].split('|')
    if (parts.length >= 5) {
      audioUrl = buildMp3Url(parts[4])
    }
  }

  // 歌词页 URL（HTML 中的 <a href="/Songword/xx/xxxxx.htm">）
  let lyricUrl = ''
  const lyricMatch = html.match(/href=["']([^"']*\/Songword\/[^"']+\.htm)["']/i)
  if (lyricMatch) {
    const u = lyricMatch[1]
    lyricUrl = u.startsWith('http') ? u : 'https://www.yymp3.com' + u
  }

  return { audioUrl, lyricUrl }
}

// 从歌词页抓取 LRC 文本（<div id="lrc"> 内的 <br> 分隔行）
async function fetchLyricsFromPage(lyricUrl) {
  if (!lyricUrl) return ''
  try {
    const html = await unifiedFetch(proxyUrl(lyricUrl)).then(r => r.text())
    const match = html.match(/id=["']lrc["'][^>]*>([\s\S]*?)<\/div>/i)
    if (!match) return ''
    return match[1]
      .split(/<br\s*\/?>/i)
      .map(line => line.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean)
      .join('\n')
  } catch (e) {
    console.warn('获取歌词失败:', e.message)
    return ''
  }
}

// 搜索歌曲
async function doSearch() {
  if (!query.value.trim()) return
  loading.value = true
  searched.value = true
  try {
    const url = `${SONG_SEARCH_API}?id=${SEARCH_API_ID}&key=${SEARCH_API_KEY}&type=3&words=${encodeURIComponent(query.value)}`
    const data = await unifiedFetch(url).then(r => r.json())

    if (data.code === 200 && Array.isArray(data.songs)) {
      results.value = data.songs
        .filter(s => s.url)  // 过滤掉 url 为空的记录
        .map((s, i) => ({
          id: `hz_${i}`,
          title: s.name || '未知标题',
          artist: s.singer || '未知歌手',
          pageUrl: s.url || '',
          audioUrl: '',
          lyricUrl: '',
          lrc: '',
          _loading: false,
          _saving: false,
          _unavailable: false
        }))
      totalResults.value = results.value.length

      if (results.value.length === 0) {
        ElMessage.info('未找到相关歌曲')
      }
    } else {
      throw new Error('搜索结果格式错误')
    }
  } catch (err) {
    ElMessage.error('搜索失败：' + err.message)
    results.value = []
  } finally {
    loading.value = false
  }
}

function handleImageError(event) {
  event.target.src = DEFAULT_COVER
}

// 播放歌曲
async function playSong(index) {
  const song = results.value[index]
  if (!song) return
  song._loading = true
  try {
    // 拉取音频地址 + 歌词 URL（已缓存则跳过）
    let audioUrl = song.audioUrl
    let lyricUrl = song.lyricUrl
    if (!audioUrl || !lyricUrl) {
      const meta = await fetchSongMetaFromPage(song.pageUrl)
      if (!audioUrl) audioUrl = meta.audioUrl
      if (!lyricUrl) {
        lyricUrl = meta.lyricUrl
        song.lyricUrl = lyricUrl
      }
    }
    if (!audioUrl) throw new Error('未获取到播放地址')
    song.audioUrl = audioUrl

    try {
      const testResp = await unifiedFetch(proxyUrl(audioUrl), { method: 'HEAD' })
      if (!testResp.ok) {
        song._unavailable = true
        const nextIndex = findNextAvailable(index + 1)
        if (nextIndex !== -1) {
          ElMessage.warning(`${song.title} 资源不可用，尝试播放下一首`)
          await playSong(nextIndex)
        } else {
          ElMessage.error('没有可播放的歌曲')
        }
        return
      }
    } catch (e) {
      // HEAD 请求失败，继续尝试播放
    }

    let audioBlob = null
    try {
      const audioResp = await unifiedFetch(proxyUrl(audioUrl))
      if (!audioResp.ok) {
        song._unavailable = true
        const nextIndex = findNextAvailable(index + 1)
        if (nextIndex !== -1) {
          ElMessage.warning(`${song.title} 资源不可用，尝试播放下一首`)
          await playSong(nextIndex)
        } else {
          ElMessage.error('没有可播放的歌曲')
        }
        return
      }
      audioBlob = await audioResp.blob()
    } catch (e) {
      console.warn('缓存音频失败:', e.message)
    }

    // 拉取歌词（失败不阻塞播放）
    let lrc = song.lrc
    if (!lrc && lyricUrl) {
      lrc = await fetchLyricsFromPage(lyricUrl)
      song.lrc = lrc
    }

    const playerSongs = results.value.map(s => ({
      id: `online_${s.id}`,
      title: s.title,
      artist: s.artist,
      audioUrl: '',
      audioBlob: null,
      cover: DEFAULT_COVER,
      lrc: '',
      duration: '--:--',
      _unavailable: s._unavailable || false
    }))

    playerSongs[index].audioUrl = audioUrl
    playerSongs[index].audioBlob = audioBlob
    playerSongs[index].title = song.title
    playerSongs[index].artist = song.artist
    playerSongs[index].lrc = lrc

    await addSong({
      title: song.title,
      artist: song.artist,
      album: '',
      duration: '',
      cover: DEFAULT_COVER,
      audioUrl,
      downloadUrl: audioUrl,
      audioBlob,
      coverBlob: null,
      lrc
    })

    setSongs(playerSongs)
    playAt(index)
  } catch (err) {
    ElMessage.error('播放失败：' + err.message)
  } finally {
    song._loading = false
  }
}

function findNextAvailable(startIndex) {
  const len = results.value.length
  for (let i = 0; i < len; i++) {
    const idx = (startIndex + i) % len
    if (!results.value[idx]._unavailable) {
      return idx
    }
  }
  return -1
}

async function saveSong(index) {
  const song = results.value[index]
  if (!song) return
  song._saving = true
  try {
    // 拉取音频地址 + 歌词 URL
    let audioUrl = song.audioUrl
    let lyricUrl = song.lyricUrl
    if (!audioUrl || !lyricUrl) {
      const meta = await fetchSongMetaFromPage(song.pageUrl)
      if (!audioUrl) audioUrl = meta.audioUrl
      if (!lyricUrl) {
        lyricUrl = meta.lyricUrl
        song.lyricUrl = lyricUrl
      }
    }
    if (!audioUrl) throw new Error('未获取到播放地址')
    song.audioUrl = audioUrl

    let audioBlob = null
    try {
      const audioResp = await unifiedFetch(proxyUrl(audioUrl))
      audioBlob = await audioResp.blob()
    } catch (e) {
      console.warn('下载音频失败:', e.message)
    }

    // 拉取歌词
    let lrc = song.lrc
    if (!lrc && lyricUrl) {
      lrc = await fetchLyricsFromPage(lyricUrl)
      song.lrc = lrc
    }

    await addSong({
      title: song.title,
      artist: song.artist,
      album: '',
      duration: '',
      cover: DEFAULT_COVER,
      audioUrl,
      downloadUrl: audioUrl,
      audioBlob,
      coverBlob: null,
      lrc
    })

    ElMessage.success('添加成功')
  } catch (err) {
    ElMessage.error('保存失败：' + err.message)
  } finally {
    song._saving = false
  }
}
</script>

<style scoped>
.search-view {
  padding: 32px 40px calc(var(--ncm-player-bar-height) + 48px);
  min-height: 100%;
}

/* ===== 头部 ===== */
.page-head {
  margin-bottom: 28px;
}

.page-title {
  font-size: var(--ncm-text-3xl);
  font-weight: 700;
  color: var(--ncm-text-primary);
  letter-spacing: -0.02em;
  margin: 0 0 6px;
  line-height: 1.1;
}

.page-sub {
  font-size: var(--ncm-text-md);
  color: var(--ncm-text-tertiary);
  margin: 0 0 20px;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  max-width: 560px;
}

.search-icon {
  position: absolute;
  left: 16px;
  color: var(--ncm-text-tertiary);
  pointer-events: none;
  z-index: 1;
}

.search-input {
  width: 100%;
  height: 44px;
  padding: 0 44px 0 44px;
  border-radius: var(--ncm-radius-full);
  background: var(--ncm-bg-input);
  border: 1px solid var(--ncm-border);
  color: var(--ncm-text-primary);
  font-size: var(--ncm-text-md);
  outline: none;
  transition: var(--ncm-transition-fast);
  font-family: inherit;
}

.search-input::placeholder {
  color: var(--ncm-text-tertiary);
}

.search-input:hover {
  border-color: var(--ncm-border-strong);
}

.search-input:focus {
  border-color: var(--ncm-primary);
  box-shadow: 0 0 0 4px var(--ncm-primary-soft);
}

.clear-btn {
  position: absolute;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--ncm-bg-hover);
  border: none;
  color: var(--ncm-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--ncm-transition-fast);
}

.clear-btn:hover {
  color: var(--ncm-text-primary);
  background: var(--ncm-bg-active);
}

.primary-btn {
  height: 44px;
  padding: 0 22px;
  border-radius: var(--ncm-radius-full);
  background: var(--ncm-primary);
  color: #fff;
  border: none;
  font-size: var(--ncm-text-md);
  font-weight: 500;
  cursor: pointer;
  transition: var(--ncm-transition-fast);
  box-shadow: 0 4px 14px var(--ncm-primary-glow);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
}

.primary-btn:hover:not(:disabled) {
  background: var(--ncm-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px var(--ncm-primary-glow);
}

.primary-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.loading-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  animation: ncm-spin 0.8s linear infinite;
}

/* ===== 结果标题 ===== */
.result-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  padding-top: 8px;
  border-top: 1px solid var(--ncm-border);
  padding-top: 24px;
}

.result-title {
  font-size: var(--ncm-text-xl);
  font-weight: 600;
  color: var(--ncm-text-primary);
  margin: 0;
}

.result-count {
  font-size: var(--ncm-text-sm);
  color: var(--ncm-text-tertiary);
}

/* ===== 列表（与 HomeView 一致） ===== */
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

.row.unavailable {
  opacity: 0.45;
  cursor: not-allowed;
}

.row.unavailable:hover {
  background: transparent;
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

.idx-text {
  font-variant-numeric: tabular-nums;
  transition: color 0.15s;
}

.row:hover .idx-text {
  color: var(--ncm-text-secondary);
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
  display: block;
  font-weight: 500;
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

.row:hover .cell-actions {
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

.icon-btn.primary:hover {
  color: var(--ncm-primary);
}

.icon-btn:disabled {
  cursor: wait;
  opacity: 0.7;
}

.mini-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--ncm-text-secondary);
  animation: ncm-spin 0.8s linear infinite;
}

.unavailable-text {
  font-size: var(--ncm-text-xs);
  color: var(--ncm-text-tertiary);
}

/* ===== 空状态 ===== */
.empty-state,
.hint-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
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

.hint-suggestions {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hint-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hint-label {
  font-size: var(--ncm-text-xs);
  color: var(--ncm-text-quaternary);
  margin-bottom: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 500;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.suggestion {
  height: 32px;
  padding: 0 16px;
  border-radius: var(--ncm-radius-full);
  background: var(--ncm-bg-elevated);
  border: 1px solid var(--ncm-border);
  color: var(--ncm-text-secondary);
  font-size: var(--ncm-text-sm);
  cursor: pointer;
  transition: var(--ncm-transition-fast);
  font-family: inherit;
}

.suggestion:hover {
  background: var(--ncm-bg-active);
  border-color: var(--ncm-primary);
  color: var(--ncm-primary);
  transform: translateY(-1px);
}

/* ===== 移动端 ===== */
@media (max-width: 768px) {
  .search-view { padding: 16px 16px calc(var(--ncm-player-bar-height-mobile) + var(--ncm-tabbar-height-mobile) + var(--ncm-safe-bottom) + 32px); }

  .page-title { font-size: var(--ncm-text-2xl); }
  .page-sub { font-size: var(--ncm-text-sm); margin-bottom: 16px; }

  .search-bar {
    gap: 8px;
  }

  .search-input {
    height: 40px;
    font-size: var(--ncm-text-sm);
  }

  .primary-btn {
    height: 40px;
    padding: 0 16px;
    min-width: 64px;
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

  .song-artist-mobile {
    font-size: var(--ncm-text-xs);
    color: var(--ncm-text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 3px;
    display: block;
  }

  .cell-actions.mobile-visible {
    opacity: 1 !important;
    width: auto;
    gap: 0;
  }

  .cell-actions.mobile-visible .icon-btn {
    width: 36px;
    height: 36px;
  }

  .cell-actions.mobile-visible .icon-btn:active {
    opacity: 0.6;
    transform: none;
  }
}

/* ===== 移动端搜索按钮改为图标内嵌 ===== */
.search-icon-mobile {
  display: none;
}

@media (max-width: 768px) {
  .primary-btn.search-btn {
    width: 44px;
    height: 44px;
    min-width: 44px;
    padding: 0;
    justify-content: center;
  }

  .search-btn .btn-text {
    display: none;
  }

  .search-btn .search-icon-mobile {
    display: inline-flex;
  }

  .row.is-mobile {
    padding: 12px 8px;
    min-height: 56px;
  }

  .cell-actions.mobile-visible .icon-btn,
  .mobile-menu-btn {
    width: 40px !important;
    height: 40px !important;
  }

  .suggestion {
    height: 36px;
    padding: 0 14px;
  }
}

/* ===== 移动端歌曲菜单抽屉 ===== */
.mobile-menu-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
  z-index: 1150;
}

.mobile-menu-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--ncm-bg-elevated);
  border-top-left-radius: var(--ncm-radius-xl);
  border-top-right-radius: var(--ncm-radius-xl);
  padding: 8px 0 calc(env(safe-area-inset-bottom, 0) + 16px);
  z-index: 1200;
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.5);
}

.mobile-menu-drawer .drawer-handle {
  width: 40px;
  height: 4px;
  background: var(--ncm-border-strong);
  border-radius: 2px;
  margin: 8px auto 16px;
}

.menu-song-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px 16px;
  border-bottom: 1px solid var(--ncm-border);
}

.menu-song-cover {
  width: 48px;
  height: 48px;
  border-radius: var(--ncm-radius-sm);
  background: var(--ncm-bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  color: var(--ncm-text-tertiary);
}

.menu-song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.menu-song-title {
  font-size: var(--ncm-text-md);
  font-weight: 500;
  color: var(--ncm-text-primary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-song-artist {
  font-size: var(--ncm-text-sm);
  color: var(--ncm-text-tertiary);
}

.menu-list {
  padding: 8px 0;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  background: transparent;
  border: none;
  color: var(--ncm-text-primary);
  font-size: var(--ncm-text-md);
  font-family: inherit;
  cursor: pointer;
  transition: var(--ncm-transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.menu-item:active {
  background: var(--ncm-bg-hover);
}

.menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-fade-enter-active { transition: opacity 0.3s var(--ncm-ease); }
.menu-fade-leave-active { transition: opacity 0.2s var(--ncm-ease); }
.menu-fade-enter-from, .menu-fade-leave-to { opacity: 0; }

.menu-slide-enter-active { animation: menuSlideUp 0.35s var(--ncm-ease-out); }
.menu-slide-leave-active { animation: menuSlideUp 0.25s var(--ncm-ease) reverse; }

@keyframes menuSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.drawer-fade-enter-active { transition: opacity 0.3s var(--ncm-ease); }
.drawer-fade-leave-active { transition: opacity 0.2s var(--ncm-ease); }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; }
</style>
