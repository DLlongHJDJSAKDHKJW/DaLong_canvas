import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  isFileSystemSupported,
  getStoredDirectory,
  selectDirectory,
  saveProjectToFile,
  deleteProjectFile,
  loadProjectsFromDirectory,
  getDirName,
  clearStoredDirectory,
  isElectron,
  getProjects as getElectronProjects,
  saveProject as saveElectronProject,
  deleteProject as deleteElectronProject,
  renameProject as renameElectronProject
} from '@/utils/fileSystem'

const CURRENT_PROJECT_KEY = 'huobao-current-project'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref([])
  const currentProjectId = ref(localStorage.getItem(CURRENT_PROJECT_KEY) || null)
  const dirHandle = ref(null)
  const dirName = ref('')
  const isFileSystemMode = ref(false)
  const isLoading = ref(false)

  const currentProject = computed(() => {
    return projects.value.find(p => p.id === currentProjectId.value) || null
  })

  const projectList = computed(() => {
    return projects.value.map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }))
  })

  // 初始化 - 尝试获取已存储的文件夹
  async function initialize() {
    // Electron 环境：检查是否已设置项目目录
    if (isElectron()) {
      isLoading.value = true
      try {
        // 尝试获取已保存的项目目录路径
        const savedPath = localStorage.getItem('electron-projects-path')
        if (savedPath) {
          // 如果有保存的路径，直接加载项目
          dirName.value = savedPath
          isFileSystemMode.value = true
          projects.value = await getElectronProjects()
          return true
        } else {
          // 没有保存的路径，需要用户选择
          isFileSystemMode.value = false
          return false
        }
      } catch (err) {
        console.error('初始化 Electron 项目失败:', err)
        isFileSystemMode.value = false
      } finally {
        isLoading.value = false
      }
      return false
    }

    // Web 环境使用 File System Access API
    if (!isFileSystemSupported()) {
      console.warn('浏览器不支持 File System Access API')
      return false
    }

    isLoading.value = true
    try {
      const handle = await getStoredDirectory()
      if (handle) {
        dirHandle.value = handle
        dirName.value = getDirName(handle)
        isFileSystemMode.value = true
        await loadProjects()
        return true
      }
    } catch (err) {
      console.error('初始化文件系统失败:', err)
    } finally {
      isLoading.value = false
    }
    return false
  }

  // 选择保存文件夹
  async function chooseDirectory() {
    // Electron 环境
    if (isElectron()) {
      const path = await window.electronAPI.selectDirectory()
      if (path) {
        // 保存路径到 localStorage
        localStorage.setItem('electron-projects-path', path)
        dirName.value = path
        isFileSystemMode.value = true
        await loadProjects()
        return true
      }
      return false
    }

    // Web 环境
    if (!isFileSystemSupported()) {
      throw new Error('浏览器不支持 File System Access API，请使用 Chrome 或 Edge 浏览器')
    }

    const handle = await selectDirectory()
    if (handle) {
      dirHandle.value = handle
      dirName.value = getDirName(handle)
      isFileSystemMode.value = true
      await loadProjects()
      return true
    }
    return false
  }

  // 从文件夹加载项目
  async function loadProjects() {
    // Electron 环境
    if (isElectron()) {
      isLoading.value = true
      try {
        projects.value = await getElectronProjects()

        // 如果当前项目不存在于加载的项目中，清除选择
        if (currentProjectId.value && !projects.value.find(p => p.id === currentProjectId.value)) {
          currentProjectId.value = null
          localStorage.removeItem(CURRENT_PROJECT_KEY)
        }
      } catch (err) {
        console.error('加载项目失败:', err)
        throw err
      } finally {
        isLoading.value = false
      }
      return
    }

    // Web 环境
    if (!dirHandle.value) return

    isLoading.value = true
    try {
      projects.value = await loadProjectsFromDirectory(dirHandle.value)

      // 如果当前项目不存在于加载的项目中，清除选择
      if (currentProjectId.value && !projects.value.find(p => p.id === currentProjectId.value)) {
        currentProjectId.value = null
        localStorage.removeItem(CURRENT_PROJECT_KEY)
      }
    } catch (err) {
      console.error('加载项目失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 创建新项目
  async function createProject(name = '未命名项目') {
    const project = {
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      canvasData: {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      }
    }

    projects.value.unshift(project)

    // Electron 环境
    if (isElectron()) {
      // 转换为纯对象避免序列化错误
      const plainProject = JSON.parse(JSON.stringify(project))
      await saveElectronProject(plainProject)
      return project
    }

    // Web 环境
    if (isFileSystemMode.value && dirHandle.value) {
      await saveProjectToFile(dirHandle.value, project)
    }

    return project
  }

  // 保存项目
  async function saveProject(projectId, canvasData) {
    const project = projects.value.find(p => p.id === projectId)
    if (!project) return

    project.canvasData = canvasData
    project.updatedAt = new Date().toISOString()

    // Electron 环境
    if (isElectron()) {
      // 转换为纯对象避免序列化错误
      const plainProject = JSON.parse(JSON.stringify(project))
      await saveElectronProject(plainProject)
      return
    }

    // Web 环境
    if (isFileSystemMode.value && dirHandle.value) {
      await saveProjectToFile(dirHandle.value, project)
    }
  }

  // 更新项目名称
  async function updateProjectName(projectId, newName) {
    const project = projects.value.find(p => p.id === projectId)
    if (!project) return

    const oldName = project.name
    project.name = newName
    project.updatedAt = new Date().toISOString()

    // Electron 环境
    if (isElectron()) {
      // 先重命名文件
      await renameElectronProject(oldName, newName)
      // 再保存项目数据（更新内容）
      const plainProject = JSON.parse(JSON.stringify(project))
      await saveElectronProject(plainProject)
      return
    }

    // Web 环境
    if (isFileSystemMode.value && dirHandle.value) {
      // 删除旧文件，保存新文件
      try {
        await deleteProjectFile(dirHandle.value, { ...project, name: oldName })
      } catch (err) {
        // 忽略删除错误
      }
      await saveProjectToFile(dirHandle.value, project)
    }
  }

  // 删除项目
  async function deleteProject(projectId) {
    const index = projects.value.findIndex(p => p.id === projectId)
    if (index === -1) return

    const project = projects.value[index]

    // Electron 环境
    if (isElectron()) {
      await deleteElectronProject(projectId, project.name)
    } else if (isFileSystemMode.value && dirHandle.value) {
      // Web 环境
      await deleteProjectFile(dirHandle.value, project)
    }

    projects.value.splice(index, 1)

    if (currentProjectId.value === projectId) {
      currentProjectId.value = null
      localStorage.removeItem(CURRENT_PROJECT_KEY)
    }
  }

  // 设置当前项目
  function setCurrentProject(projectId) {
    currentProjectId.value = projectId
    if (projectId) {
      localStorage.setItem(CURRENT_PROJECT_KEY, projectId)
    } else {
      localStorage.removeItem(CURRENT_PROJECT_KEY)
    }
  }

  // 复制项目
  async function duplicateProject(projectId) {
    const project = projects.value.find(p => p.id === projectId)
    if (!project) return null

    const newProject = {
      ...JSON.parse(JSON.stringify(project)),
      id: generateId(),
      name: `${project.name} (副本)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    projects.value.unshift(newProject)

    // Electron 环境
    if (isElectron()) {
      // newProject 已经是纯对象，直接保存
      await saveElectronProject(newProject)
      return newProject
    }

    // Web 环境
    if (isFileSystemMode.value && dirHandle.value) {
      await saveProjectToFile(dirHandle.value, newProject)
    }

    return newProject
  }

  // 导出项目为 JSON
  function exportProject(projectId) {
    const project = projects.value.find(p => p.id === projectId)
    if (!project) return null
    return JSON.stringify(project, null, 2)
  }

  // 导入项目
  async function importProject(jsonString) {
    try {
      const project = JSON.parse(jsonString)

      // 验证项目格式
      if (!project.name || !project.canvasData) {
        throw new Error('无效的项目格式')
      }

      // 生成新 ID 避免冲突
      project.id = generateId()
      project.createdAt = new Date().toISOString()
      project.updatedAt = new Date().toISOString()

      projects.value.unshift(project)

      if (isFileSystemMode.value && dirHandle.value) {
        await saveProjectToFile(dirHandle.value, project)
      }

      return project
    } catch (err) {
      console.error('导入项目失败:', err)
      throw err
    }
  }

  // 更改存储文件夹
  async function changeDirectory() {
    return await chooseDirectory()
  }

  // 断开文件夹连接（切换回非文件系统模式）
  async function disconnectDirectory() {
    await clearStoredDirectory()
    dirHandle.value = null
    dirName.value = ''
    isFileSystemMode.value = false
    projects.value = []
    currentProjectId.value = null
    localStorage.removeItem(CURRENT_PROJECT_KEY)
  }

  // 刷新项目列表
  async function refreshProjects() {
    if (isElectron() || (isFileSystemMode.value && dirHandle.value)) {
      await loadProjects()
    }
  }

  // 生成唯一 ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  // 检查是否支持文件系统 API
  function checkFileSystemSupport() {
    return isFileSystemSupported()
  }

  return {
    // State
    projects,
    currentProjectId,
    currentProject,
    projectList,
    dirHandle,
    dirName,
    isFileSystemMode,
    isLoading,

    // Actions
    initialize,
    chooseDirectory,
    loadProjects,
    createProject,
    saveProject,
    updateProjectName,
    deleteProject,
    setCurrentProject,
    duplicateProject,
    exportProject,
    importProject,
    changeDirectory,
    disconnectDirectory,
    refreshProjects,
    checkFileSystemSupport
  }
})
