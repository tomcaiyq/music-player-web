import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    proxy: {
      // 代理 yymp3.com 歌曲页面（用于抓取 $song_data）
      '/api/yymp3': {
        target: 'https://www.yymp3.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/yymp3/, '')
      },
      // 代理 ting123.yymp3.net MP3 文件
      '/api/ting123': {
        target: 'https://ting123.yymp3.net',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/ting123/, '')
      }
    }
  }
})