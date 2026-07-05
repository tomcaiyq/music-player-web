import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 5173

// 代理 yymp3.com 歌曲页面
app.use('/api/yymp3', createProxyMiddleware({
  target: 'https://www.yymp3.com',
  changeOrigin: true,
  pathRewrite: { '^/api/yymp3': '' }
}))

// 代理 ting123.yymp3.net MP3 文件
app.use('/api/ting123', createProxyMiddleware({
  target: 'https://ting123.yymp3.net',
  changeOrigin: true,
  pathRewrite: { '^/api/ting123': '' }
}))

// 静态文件（生产构建后的 dist）
app.use(express.static(path.join(__dirname, 'dist')))

// SPA 路由回退
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`🎵 音乐播放器运行在 http://localhost:${PORT}`)
})