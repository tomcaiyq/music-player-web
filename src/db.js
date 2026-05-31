import Dexie from 'dexie'

const db = new Dexie('CloudMusic')

db.version(1).stores({
  songs: '++id, title, artist, album, addedAt',
  favorites: 'songId, addedAt',
  lyrics: 'songId'
})

// ===== 歌曲 =====

export async function getAllSongs() {
  return db.songs.orderBy('addedAt').reverse().toArray()
}

export async function getSong(id) {
  return db.songs.get(id)
}

export async function addSong(song) {
  const id = await db.songs.add({
    title: song.title || '未知标题',
    artist: song.artist || '未知歌手',
    album: song.album || '',
    duration: song.duration || '',
    cover: song.cover || '',
    lrc: song.lrc || '',
    audioUrl: song.audioUrl || '',
    downloadUrl: song.downloadUrl || '',
    audioBlob: song.audioBlob || null,
    coverBlob: song.coverBlob || null,
    addedAt: Date.now()
  })
  return id
}

export async function deleteSong(id) {
  await db.transaction('rw', db.songs, db.favorites, db.lyrics, async () => {
    await db.songs.delete(id)
    await db.favorites.delete(id)
    await db.lyrics.delete(id)
  })
}

// ===== 收藏 =====

export async function getFavorites() {
  const favs = await db.favorites.orderBy('addedAt').reverse().toArray()
  const songIds = favs.map(f => f.songId)
  if (songIds.length === 0) return []
  const songs = await db.songs.bulkGet(songIds)
  return songs.filter(Boolean).map((s, i) => ({ ...s, addedAt: favs[i].addedAt }))
}

export async function isFavorite(songId) {
  const fav = await db.favorites.get(songId)
  return !!fav
}

export async function getFavoriteSet() {
  const favs = await db.favorites.toArray()
  return new Set(favs.map(f => f.songId))
}

export async function toggleFavorite(songId) {
  const existing = await db.favorites.get(songId)
  if (existing) {
    await db.favorites.delete(songId)
    return false
  } else {
    await db.favorites.put({ songId, addedAt: Date.now() })
    return true
  }
}

// ===== 歌词 =====

export async function getLyrics(songId) {
  const record = await db.lyrics.get(songId)
  return record?.lrc || ''
}

export async function saveLyrics(songId, lrc) {
  await db.lyrics.put({ songId, lrc })
}

export { db }
