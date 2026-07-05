import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SearchView from '../views/SearchView.vue'
import SettingsView from '../views/SettingsView.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/search', component: SearchView },
  { path: '/settings', component: SettingsView }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
