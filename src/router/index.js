/**
 * Router configuration | 路由配置
 */
import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/canvas/:id?',
    name: 'Canvas',
    component: () => import('../views/Canvas.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
