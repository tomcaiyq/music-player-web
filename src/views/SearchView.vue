<template>
  <div class="search-view">
    <div class="search-panel">
      <!-- 搜索框 -->
      <div class="search-bar">
        <el-input
          v-model="query"
          placeholder="搜索音乐、歌手"
          size="large"
          clearable
          @keyup.enter="doSearch"
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" size="large" @click="doSearch" :loading="loading">搜索</el-button>
      </div>

      <!-- 结果标题 -->
      <div class="panel-header" v-if="searched">
        <h2>搜索结果</h2>
        <span class="result-count" v-if="results.length > 0">共 {{ totalResults }} 首</span>
      </div>

      <!-- 搜索结果列表 -->
      <div class="song-table" v-loading="loading" element-loading-text="搜索中...">
        <div v-if="!isMobile" class="table-header">
          <div class="col-index"></div>
          <div class="col-title">歌曲</div>
          <div class="col-artist">歌手</div>
          <div class="col-actions"></div>
        </div>
        <div
          v-for="(song, index) in results"
          :key="song.id"
          class="table-row"
          :class="{ even: index % 2 === 0, 'is-mobile': isMobile }"
          @dblclick="playSong(index)"
          @click="isMobile && playSong(index)"
        >
          <div class="col-index">{{ String(index + 1).padStart(2, '0') }}</div>
          <div class="col-title">
            <span class="song-name">{{ song.title }}</span>
            <span v-if="isMobile" class="song-artist-mobile">{{ song.artist }}</span>
          </div>
          <div v-if="!isMobile" class="col-artist">{{ song.artist }}</div>
          <div class="col-actions" :class="{ 'mobile-visible': isMobile }">
            <el-button text size="small" @click.stop="playSong(index)" class="action-btn" :loading="song._loading">
              <el-icon><VideoPlay /></el-icon>
            </el-button>
            <el-button text size="small" @click.stop="saveSong(index)" class="action-btn" :loading="song._saving">
              <el-icon><Collection /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="results.length === 0 && !loading && searched" class="empty-state">
          <el-empty description="未找到相关歌曲" :image-size="80" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { VideoPlay, Collection, Search } from '@element-plus/icons-vue'
import { usePlayer } from '../composables/usePlayer.js'
import { useMobile } from '../composables/useMobile.js'
import { proxyFetch, MUSIC_SOURCE, UA } from '../config.js'
import { addSong, saveLyrics } from '../db.js'
import { ElMessage } from 'element-plus'

const { isMobile } = useMobile()
const route = useRoute()
const { setSongs, playSong: playerPlaySong } = usePlayer()

const query = ref('')
const results = ref([])
const loading = ref(false)
const searched = ref(false)
const totalResults = ref(0)
const PAGE_SIZE = 20

onMounted(() => {
  if (route.query.q) {
    query.value = route.query.q
    doSearch()
  }
})

// 搜索歌曲
async function doSearch() {
  if (!query.value.trim()) return
  loading.value = true
  searched.value = true
  try {
    const allResults = []
    const seen = new Set()
    let page = 1
    let totalPages = 1

    while (allResults.length < PAGE_SIZE && page <= totalPages && page <= 10) {
      const url = `${MUSIC_SOURCE}/s/${encodeURIComponent(query.value)}?page=${page}`
      const html = await proxyFetch(url).then(r => r.text())

      const rowRe = /<tr>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<td>[\s\S]*?<a href="(\/play\/\d+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/g
      let m
      while ((m = rowRe.exec(html)) !== null) {
        const id = m[2].replace('/play/', '')
        if (!seen.has(id)) {
          seen.add(id)
          allResults.push({
            id,
            title: m[3].replace(/<[^>]*>/g, '').trim(),
            artist: m[4].replace(/<[^>]*>/g, '').trim()
          })
        }
      }

      if (page === 1) {
        const tailMatch = html.match(/href="[^"]*\?page=(\d+)"[^>]*>尾页/)
        if (tailMatch) totalPages = parseInt(tailMatch[1])
        else {
          const pageMatch = html.match(/共\s*(\d+)\s*页/)
          totalPages = pageMatch ? parseInt(pageMatch[1]) : 1
        }
      }
      page++
    }

    results.value = allResults.slice(0, PAGE_SIZE).map(s => ({ ...s, _loading: false, _saving: false, _downloading: false }))
    totalResults.value = results.value.length
  } catch (err) {
    ElMessage.error('搜索失败：' + err.message)
    results.value = []
  } finally {
    loading.value = false
  }
}

// 获取歌曲详情和播放地址
async function fetchSongDetail(songId) {
  const url = `${MUSIC_SOURCE}/play/${songId}`
  const html = await proxyFetch(url).then(r => r.text())

  const extractVar = (name) => {
    const re = new RegExp(`window\\.${name}\\s*=\\s*'([^']*)'`)
    const m = html.match(re)
    return m ? m[1] : ''
  }

  const title = extractVar('mp3_title') || '未知标题'
  const artist = extractVar('mp3_author') || '未知歌手'
  let cover = extractVar('mp3_cover') || ''
  // 如果是相对路径，补全域名
  if (cover && cover.startsWith('/')) {
    cover = MUSIC_SOURCE + cover
  }
  const playId = extractVar('play_id') || ''

  // 解码 mp3_extra_url（歌曲海的高品质源）
  const rawExtraUrl = extractVar('mp3_extra_url') || ''
  let downloadUrl = ''
  if (rawExtraUrl) {
    try {
      downloadUrl = atob(rawExtraUrl.replace(/#/g, 'H').replace(/%/g, 'S'))
    } catch { /* ignore */ }
  }

  // 歌词
  let lrc = ''
  const lrcMatch = html.match(/<div[^>]*id="content-lrc2"[^>]*>([\s\S]*?)<\/div>/)
  if (lrcMatch) {
    lrc = lrcMatch[1].replace(/<br\s*\/?>/g, '\n').replace(/<[^>]*>/g, '').trim()
  }

  // 获取 MP3 URL
  let audioUrl = ''
  if (playId) {
    try {
      const apiRes = await proxyFetch(`${MUSIC_SOURCE}/api/music`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Custom-Header': 'SecretKey'
        },
        body: `id=${encodeURIComponent(playId)}&type=0`
      }).then(r => r.json())

      if (apiRes.code === 200 && apiRes.data?.url) {
        audioUrl = apiRes.data.url
        // 如果是相对路径，补全域名
        if (audioUrl.startsWith('/')) {
          audioUrl = MUSIC_SOURCE + audioUrl
        }
      }
    } catch (e) {
      console.error('Music API error:', e.message)
    }
  }

  if (!audioUrl) {
    audioUrl = extractVar('mp3_url') || ''
    // 如果是相对路径，补全域名
    if (audioUrl && audioUrl.startsWith('/')) {
      audioUrl = MUSIC_SOURCE + audioUrl
    }
  }

  return { title, artist, cover, audioUrl, downloadUrl, lrc }
}

// 播放歌曲
async function playSong(index) {
  const song = results.value[index]
  if (!song) return
  song._loading = true
  try {
    const detail = await fetchSongDetail(song.id)
    if (!detail.audioUrl) throw new Error('未获取到播放地址')

    const playerSongs = results.value.map(s => ({
      id: `online_${s.id}`,
      title: s.title,
      artist: s.artist,
      audioUrl: '',
      cover: '',
      lrc: '',
      duration: '--:--'
    }))

    playerSongs[index].audioUrl = detail.audioUrl
    playerSongs[index].title = detail.title || song.title
    playerSongs[index].artist = detail.artist || song.artist
    playerSongs[index].cover = detail.cover
    playerSongs[index].lrc = detail.lrc || ''

    setSongs(playerSongs)
    playerPlaySong(index)
  } catch (err) {
    ElMessage.error('播放失败：' + err.message)
  } finally {
    song._loading = false
  }
}

// 保存到本地库
async function saveSong(index) {
  const song = results.value[index]
  if (!song) return
  song._saving = true
  try {
    const detail = await fetchSongDetail(song.id)
    if (!detail.audioUrl) throw new Error('未获取到播放地址')

    // 保存到 IndexedDB（只保存 URL，不下载 blob）
    const songId = await addSong({
      title: detail.title || song.title,
      artist: detail.artist || song.artist,
      album: '',
      duration: '',
      cover: detail.cover,
      audioUrl: detail.audioUrl,
      downloadUrl: detail.downloadUrl || '',
      audioBlob: null,
      coverBlob: null,
      lrc: detail.lrc || ''
    })

    // 保存歌词
    if (detail.lrc) {
      await saveLyrics(songId, detail.lrc)
    }

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
  padding: 20px;
  height: 100%;
}

.search-panel {
  background: var(--ncm-bg-card);
  border-radius: var(--ncm-radius-lg);
  box-shadow: var(--ncm-shadow);
  overflow: hidden;
  transition: var(--ncm-transition);
  border: 1px solid var(--ncm-border);
}

.panel-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--ncm-border);
}

.panel-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--ncm-text-primary);
  margin: 0;
}

.result-count {
  font-size: 12px;
  color: var(--ncm-text-tertiary);
}

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

.col-index {
  width: 40px;
  font-size: 13px;
  color: var(--ncm-text-placeholder);
  flex-shrink: 0;
  text-align: center;
}

.col-title {
  flex: 1;
  min-width: 0;
  padding-right: 16px;
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
}

.col-actions {
  width: 80px;
  display: flex;
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
  color: var(--ncm-primary) !important;
}

.empty-state {
  padding: 80px 20px;
}

/* 搜索框 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--ncm-border);
  background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%);
}

.search-input {
  flex: 1;
}

/* 移动端 */
@media (max-width: 768px) {
  .search-view { padding: 0; }
  .search-panel { border-radius: 0; box-shadow: none; }

  .search-bar {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    gap: 10px;
    flex-wrap: wrap;
  }

  .search-bar .el-button { order: 3; }

  .table-row.is-mobile {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    gap: 10px;
    cursor: pointer;
  }

  .table-row.is-mobile:active {
    background: var(--ncm-bg-hover);
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
    flex-direction: column;
    gap: 2px;
  }

  .song-artist-mobile {
    font-size: 11px;
    color: var(--ncm-text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    padding: 8px !important;
  }

  .col-actions.mobile-visible .action-btn:active {
    opacity: 0.6;
  }
}
</style>
