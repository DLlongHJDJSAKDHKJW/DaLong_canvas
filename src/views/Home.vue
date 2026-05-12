<template>
  <!-- Home page | 首页 -->
  <div class="min-h-screen h-screen overflow-y-auto bg-[var(--bg-primary)]">
    <!-- Header | 顶部导航 -->
    <AppHeader>
      <template #right>
        <button
          @click="showApiSettings = true"
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          title="API 设置"
        >
          <n-icon :size="20"><SettingsOutline /></n-icon>
        </button>
      </template>
    </AppHeader>

    <!-- Storage Setup | 存储设置 -->
    <div v-if="!projectsStore.isFileSystemMode" class="flex items-center justify-center min-h-[calc(100vh-65px)] p-6">
      <div class="text-center p-12 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] max-w-md">
        <n-icon :size="64" class="text-[var(--accent-color)] mb-4"><FolderOpenOutline /></n-icon>
        <h3 class="text-xl font-semibold text-[var(--text-primary)] mb-2">设置项目存储位置</h3>
        <p class="text-[var(--text-secondary)] mb-6">
          {{ isElectron() ? '选择一个文件夹来保存你的项目文件' : '选择一个文件夹来保存你的项目文件，推荐选择桌面文件夹' }}
        </p>
        <n-button type="primary" size="large" @click="handleChooseDirectory" :loading="projectsStore.isLoading">
          <template #icon><n-icon><FolderOutline /></n-icon></template>
          选择文件夹
        </n-button>
        <p v-if="!isElectron() && !isSupported" class="text-[var(--warning-color)] text-sm mt-4 flex items-center justify-center gap-1">
          <n-icon><WarningOutline /></n-icon>
          当前浏览器不支持文件系统 API，请使用 Chrome 或 Edge 浏览器
        </p>
      </div>
    </div>

    <!-- Main content | 主要内容 -->
    <main v-else class="max-w-5xl mx-auto px-4 py-8 md:py-16">
      <!-- Storage info | 存储位置信息 -->
      <div class="flex items-center gap-2 px-4 py-3 bg-[var(--bg-secondary)] rounded-lg mb-6 text-sm text-[var(--text-secondary)]">
        <n-icon class="text-[var(--accent-color)]"><FolderOutline /></n-icon>
        <span>存储位置: {{ projectsStore.dirName }}</span>
        <n-button text size="small" @click="handleChangeDirectory">更换</n-button>
        <n-button text size="small" @click="handleRefresh" :loading="projectsStore.isLoading">刷新</n-button>
      </div>

      <!-- Welcome section | 欢迎区域 -->
      <section class="text-center mb-12">
        <div class="flex items-center justify-center gap-4 mb-8">
          <img src="/logo.png" alt="Logo" class="w-12 h-12 md:w-16 md:h-16" />
          <h1 class="text-2xl md:text-4xl font-bold text-[var(--text-primary)]">欢迎来到大龙无限画布 v1.0.9</h1>
        </div>

        <!-- Input area | 输入区域 -->
        <div class="max-w-2xl mx-auto">
          <div class="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-4 shadow-sm">
            <textarea
              v-model="inputText"
              placeholder="输入你的创意，开始新项目"
              class="w-full bg-transparent resize-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] min-h-[80px]"
              @keydown.enter.ctrl="handleCreateWithInput"
            />
            <div class="flex items-center justify-between mt-2">
              <div class="flex items-center gap-2"></div>
              <div class="flex items-center gap-3">
                <button
                  @click="handleCreateWithInput"
                  class="w-8 h-8 rounded-xl bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] flex items-center justify-center transition-colors"
                >
                  <n-icon :size="20" color="white"><SendOutline /></n-icon>
                </button>
              </div>
            </div>
          </div>

          <!-- Quick suggestions | 快捷建议 -->
          <div class="flex flex-wrap items-center justify-center gap-2 mt-4">
            <span class="text-sm text-[var(--text-secondary)]">推荐：</span>
            <button
              v-for="tag in suggestions"
              :key="tag"
              @click="inputText = tag"
              class="px-3 py-1.5 text-sm rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors"
            >
              {{ tag }}
            </button>
          </div>
        </div>
      </section>

      <!-- My projects section | 我的项目区域 -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-[var(--text-primary)]">我的项目</h2>
          <div class="flex gap-2">
            <n-button @click="handleImportProject">
              <template #icon><n-icon><CloudUploadOutline /></n-icon></template>
              导入
            </n-button>
            <n-button type="primary" @click="handleCreateProject">
              <template #icon><n-icon><AddOutline /></n-icon></template>
              新建项目
            </n-button>
          </div>
        </div>

        <!-- Empty state | 空状态 -->
        <div v-if="projectsStore.projectList.length === 0" class="text-center py-12 bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-color)]">
          <n-icon :size="48" class="text-[var(--text-secondary)] mb-4"><FolderOpenOutline /></n-icon>
          <p class="text-[var(--text-secondary)] mb-4">还没有项目，创建一个开始吧</p>
          <n-button type="primary" @click="handleCreateProject">创建第一个项目</n-button>
        </div>

        <!-- Projects grid | 项目网格 -->
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            v-for="project in projectsStore.projectList"
            :key="project.id"
            class="group relative"
          >
            <!-- Project card | 项目卡片 -->
            <div
              @click="handleOpenProject(project.id)"
              class="cursor-pointer"
            >
              <div class="aspect-video rounded-xl overflow-hidden bg-[var(--bg-tertiary)] mb-2 border border-[var(--border-color)] relative">
                <div class="w-full h-full flex items-center justify-center">
                  <n-icon :size="32" class="text-[var(--text-secondary)]"><DocumentOutline /></n-icon>
                </div>
                <!-- Hover overlay | 悬浮遮罩 -->
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span class="text-white text-sm">打开项目</span>
                </div>
              </div>
              <p class="text-sm text-[var(--text-primary)] truncate">{{ project.name }}</p>
              <p class="text-xs text-[var(--text-secondary)]">{{ formatDate(project.updatedAt) }}</p>
            </div>

            <!-- Project actions | 项目操作 -->
            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <n-dropdown :options="projectActions" @select="(key) => handleProjectAction(key, project)" placement="bottom-end">
                <button
                  @click.stop
                  class="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow hover:bg-white dark:hover:bg-gray-800 transition-colors"
                >
                  <n-icon :size="16"><EllipsisHorizontalOutline /></n-icon>
                </button>
              </n-dropdown>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- API Settings Modal | API 设置弹窗 -->
    <!-- Global Quota Alert | 全局额度不足提示 -->
    <QuotaAlert />

    <ApiSettings v-model:show="showApiSettings" />

    <!-- Rename modal | 重命名弹窗 -->
    <n-modal v-model:show="showRenameModal" preset="dialog" title="重命名项目">
      <n-input v-model:value="renameValue" placeholder="请输入项目名称" @keyup.enter="confirmRename" />
      <template #action>
        <n-button @click="showRenameModal = false">取消</n-button>
        <n-button type="primary" @click="confirmRename">确定</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, h, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon, NDropdown, NModal, NInput, NButton, useDialog, useMessage } from 'naive-ui'
import {
  AddOutline,
  SendOutline,
  DocumentOutline,
  FolderOutline,
  FolderOpenOutline,
  EllipsisHorizontalOutline,
  CreateOutline,
  CopyOutline,
  SettingsOutline,
  TrashOutline,
  WarningOutline,
  CloudUploadOutline,
  DownloadOutline
} from '@vicons/ionicons5'
import { useProjectsStore } from '../stores/projects'
import { isFileSystemSupported, isElectron } from '../utils/fileSystem'
import ApiSettings from '../components/ApiSettings.vue'
import QuotaAlert from '../components/QuotaAlert.vue'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const dialog = useDialog()
const message = useMessage()
const projectsStore = useProjectsStore()

// Check if File System API is supported (always true in Electron)
// Always supported in Electron, check File System Access API in web
const isSupported = computed(() => isElectron() || isFileSystemSupported())

// API Settings state
const showApiSettings = ref(false)

// Input state
const inputText = ref('')

// Rename modal state
const showRenameModal = ref(false)
const renameValue = ref('')
const renameTargetId = ref(null)

// Suggestions tags
const suggestions = [
  '雨中魔法森林',
  '日式街面美食摄影',
  '瀑布水流飞溅',
  '雨天富声旁边花语'
]

// Project actions dropdown options
const projectActions = [
  { label: '重命名', key: 'rename', icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
  { label: '复制', key: 'duplicate', icon: () => h(NIcon, null, { default: () => h(CopyOutline) }) },
  { label: '导出', key: 'export', icon: () => h(NIcon, null, { default: () => h(DownloadOutline) }) },
  { type: 'divider' },
  { label: '删除', key: 'delete', icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }
]

// Initialize on mount
onMounted(async () => {
  await projectsStore.initialize()
  // 初始进入或从画布返回时，强制刷新一次列表
  if (projectsStore.isFileSystemMode) {
    await projectsStore.refreshProjects()
  }
  
  // 监听窗口焦点，当用户从外部文件夹切回程序时自动同步
  window.addEventListener('focus', handleWindowFocus)
})

onUnmounted(() => {
  window.removeEventListener('focus', handleWindowFocus)
})

// 窗口焦点处理
const handleWindowFocus = async () => {
  if (projectsStore.isFileSystemMode && !projectsStore.isLoading) {
    await projectsStore.refreshProjects()
  }
}

// Choose directory
async function handleChooseDirectory() {
  try {
    await projectsStore.chooseDirectory()
  } catch (err) {
    message.error(err.message || '选择文件夹失败')
  }
}

// Change directory
async function handleChangeDirectory() {
  dialog.warning({
    title: '更换存储位置',
    content: '更换文件夹后将加载新文件夹中的项目，确定要更换吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await projectsStore.changeDirectory()
      } catch (err) {
        message.error(err.message || '更换文件夹失败')
      }
    }
  })
}

// Refresh projects
async function handleRefresh() {
  try {
    await projectsStore.refreshProjects()
    message.success('刷新成功')
  } catch (err) {
    message.error('刷新失败')
  }
}

// Format date
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now - d

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// Handle project action
const handleProjectAction = async (key, project) => {
  switch (key) {
    case 'rename':
      renameTargetId.value = project.id
      renameValue.value = project.name
      showRenameModal.value = true
      break
    case 'duplicate':
      try {
        await projectsStore.duplicateProject(project.id)
        message.success('项目已复制')
      } catch (err) {
        message.error('复制失败')
      }
      break
    case 'export':
      handleExportProject(project.id)
      break
    case 'delete':
      dialog.warning({
        title: '删除项目',
        content: `确定要删除项目「${project.name}」吗？此操作不可恢复。`,
        positiveText: '删除',
        negativeText: '取消',
        onPositiveClick: async () => {
          try {
            await projectsStore.deleteProject(project.id)
            message.success('项目已删除')
          } catch (err) {
            message.error('删除失败')
          }
        }
      })
      break
  }
}

// Confirm rename
const confirmRename = async () => {
  if (renameTargetId.value && renameValue.value.trim()) {
    try {
      await projectsStore.updateProjectName(renameTargetId.value, renameValue.value.trim())
      message.success('已重命名')
    } catch (err) {
      message.error('重命名失败')
    }
  }
  showRenameModal.value = false
  renameTargetId.value = null
  renameValue.value = ''
}

// Create new project
const handleCreateProject = async () => {
  try {
    const project = await projectsStore.createProject('未命名项目')
    projectsStore.setCurrentProject(project.id)
    router.push(`/canvas/${project.id}`)
  } catch (err) {
    message.error('创建项目失败')
  }
}

// Create project with input text
const handleCreateWithInput = async () => {
  const name = inputText.value.trim() || '未命名项目'
  try {
    const project = await projectsStore.createProject(name)
    projectsStore.setCurrentProject(project.id)
    sessionStorage.setItem('dalong-canvas-initial-prompt', inputText.value.trim())
    inputText.value = ''
    router.push(`/canvas/${project.id}`)
  } catch (err) {
    message.error('创建项目失败')
  }
}

// Open existing project
const handleOpenProject = (projectId) => {
  projectsStore.setCurrentProject(projectId)
  router.push(`/canvas/${projectId}`)
}

// Export project
function handleExportProject(projectId) {
  const project = projectsStore.projects.find(p => p.id === projectId)
  if (!project) return

  const json = projectsStore.exportProject(projectId)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name}.json`
  a.click()
  URL.revokeObjectURL(url)
  message.success('导出成功')
}

// Import project
function handleImportProject() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const text = await file.text()
      await projectsStore.importProject(text)
      message.success('导入成功')
    } catch (err) {
      message.error(err.message || '导入失败，请检查文件格式')
    }
  }
  input.click()
}
</script>
