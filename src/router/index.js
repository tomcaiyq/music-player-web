import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SearchView from '../views/SearchView.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/search', component: SearchView }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
