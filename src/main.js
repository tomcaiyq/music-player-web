import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/variables.css'
import App from './App.vue'
import router from './router'
import { initSafeArea } from './config.js'

const app = createApp(App)
app.use(router)
app.use(ElementPlus)
app.mount('#app')

// 初始化原生平台安全区（状态栏 + 底部导航栏），Web/Tauri 端为 no-op
initSafeArea()
