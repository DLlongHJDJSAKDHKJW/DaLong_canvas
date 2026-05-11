import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router'
import './stores/theme'

// 过滤 Vue Flow 的"缺少父节点"警告（由已删除的分组节点残留引用导致）
const originalWarn = console.warn
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('[Vue Flow]: Node is missing a parent')) return
  originalWarn.apply(console, args)
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
