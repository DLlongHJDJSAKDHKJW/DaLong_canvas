/**
 * 文件系统工具类
 * 兼容 Web 和 Electron 环境
 */

// ==================== 环境检测 ====================

// 检测是否在 Electron 环境
export const isElectron = () => {
  return window.electronAPI?.isElectron === true
}

// 检测是否支持 File System Access API (Web)
export function isFileSystemSupported() {
  return !isElectron() && 'showDirectoryPicker' in window
}

// ==================== Electron 环境 API ====================

/**
 * 保存文件到本地 (Electron)
 * @param {File} file - 文件对象
 * @param {string} projectId - 项目 ID
 * @returns {Promise<string>} 文件路径
 */
export const saveFile = async (file, projectName) => {
  if (isElectron()) {
    // Electron 环境：保存到本地文件系统
    const type = file.type.startsWith('video/') ? 'video' : 'image'
    const savedPath = localStorage.getItem('electron-projects-path')
    
    // 构建保存参数
    const saveParams = {
      fileName: file.name,
      type,
      projectName, // 传递项目名称用于定位文件夹
      customPath: savedPath
    }

    // 优先使用 file.path 直接通过系统路径复制，避免内存爆炸
    if (file.path) {
      saveParams.sourcePath = file.path
    } else {
      // 回退方案：读取为 Buffer
      const arrayBuffer = await file.arrayBuffer()
      saveParams.buffer = Array.from(new Uint8Array(arrayBuffer))
    }

    const result = await window.electronAPI.saveFile(saveParams)

    if (result.success) {
      // 标准化路径：统一为正斜杠，并确保开头不重复斜杠
      let normalizedPath = result.path.replace(/\\/g, '/')
      if (normalizedPath.startsWith('/')) {
        normalizedPath = normalizedPath.substring(1)
      }
      return `file:///${normalizedPath}`
    } else {
      throw new Error(result.error || '保存文件失败')
    }
  } else {
    // Web 环境：使用 Object URL
    return URL.createObjectURL(file)
  }
}

/**
 * 下载网络图片到本地 (Electron)
 * @param {string} url - 图片 URL
 * @param {string} projectId - 项目 ID
 * @returns {Promise<string>} 本地文件路径或原 URL
 */
export const downloadImage = async (url, projectName) => {
  if (isElectron() && (url.startsWith('http') || url.startsWith('data:'))) {
    // Electron 环境：下载到本地
    const savedPath = localStorage.getItem('electron-projects-path')
    const result = await window.electronAPI.downloadImage(url, projectName, savedPath)

    if (result.success) {
      // 标准化路径：统一为正斜杠，并确保包含 file:/// 三斜杠
      let normalizedPath = result.path.replace(/\\/g, '/')
      // 确保路径以 / 开头（Windows 盘符前加 /）
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath
      }
      return `file://${normalizedPath}`
    } else {
      console.error('下载图片失败:', result.error)
      return url // 失败时返回原 URL
    }
  } else {
    // Web 环境或本地文件：直接返回
    return url
  }
}

/**
 * 获取所有项目 (Electron)
 * @returns {Promise<Array>} 项目列表
 */
export const getProjects = async () => {
  if (isElectron()) {
    // 从 localStorage 获取用户选择的路径
    const savedPath = localStorage.getItem('electron-projects-path')
    return await window.electronAPI.getProjects(savedPath)
  } else {
    // Web 环境：从 localStorage 读取
    const data = localStorage.getItem('projects')
    return data ? JSON.parse(data) : []
  }
}

/**
 * 保存项目 (Electron)
 * @param {Object} project - 项目数据
 * @returns {Promise<Object>} 保存结果
 */
export const saveProject = async (project) => {
  if (isElectron()) {
    const savedPath = localStorage.getItem('electron-projects-path')
    // 将响应式对象转换为纯对象，避免序列化错误
    const plainProject = JSON.parse(JSON.stringify(project))
    return await window.electronAPI.saveProject(plainProject, savedPath)
  } else {
    // Web 环境：保存到 localStorage
    const projects = await getProjects()
    const index = projects.findIndex(p => p.id === project.id)

    if (index >= 0) {
      projects[index] = project
    } else {
      projects.push(project)
    }

    localStorage.setItem('projects', JSON.stringify(projects))
    return { success: true }
  }
}

/**
 * 删除项目 (Electron)
 * @param {string} projectId - 项目 ID
 * @param {string} projectName - 项目名称
 * @returns {Promise<Object>} 删除结果
 */
export const deleteProject = async (projectId, projectName) => {
  if (isElectron()) {
    const savedPath = localStorage.getItem('electron-projects-path')
    return await window.electronAPI.deleteProject(projectId, projectName, savedPath)
  } else {
    // Web 环境：从 localStorage 删除
    const projects = await getProjects()
    const filtered = projects.filter(p => p.id !== projectId)
    localStorage.setItem('projects', JSON.stringify(filtered))
    return { success: true }
  }
}

/**
 * 重命名项目 (Electron)
 * @param {string} oldName - 旧项目名称
 * @param {string} newName - 新项目名称
 * @returns {Promise<Object>} 重命名结果
 */
export const renameProject = async (oldName, newName) => {
  if (isElectron()) {
    const savedPath = localStorage.getItem('electron-projects-path')
    return await window.electronAPI.renameProject(oldName, newName, savedPath)
  } else {
    // Web 环境不需要重命名文件
    return { success: true }
  }
}

/**
 * 保存对话记录 (Electron)
 * @param {Object} chatData - 对话数据
 * @param {string} projectName - 项目名称
 * @returns {Promise<Object>} 保存结果
 */
export const saveChat = async (chatData, projectName) => {
  if (isElectron()) {
    const savedPath = localStorage.getItem('electron-projects-path')
    // 将响应式对象转换为纯对象，避免克隆错误 (An object could not be cloned)
    const plainChatData = JSON.parse(JSON.stringify(chatData))
    return await window.electronAPI.saveChat(plainChatData, projectName, savedPath)
  } else {
    return { success: true }
  }
}

// ==================== Web 环境 API (File System Access API) ====================

const DB_NAME = 'huobao-canvas-fs'
const STORE_NAME = 'fileHandles'
const DIR_HANDLE_KEY = 'projectsDir'

// 打开 IndexedDB（用于存储文件夹句柄）
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

// 保存文件夹句柄到 IndexedDB
async function saveDirHandle(handle) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(handle, DIR_HANDLE_KEY)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// 从 IndexedDB 获取文件夹句柄
async function getDirHandle() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(DIR_HANDLE_KEY)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

// 选择文件夹
export async function selectDirectory() {
  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'desktop'
    })
    await saveDirHandle(handle)
    return handle
  } catch (err) {
    if (err.name === 'AbortError') {
      return null // 用户取消
    }
    throw err
  }
}

// 获取已保存的文件夹句柄（需要重新请求权限）
export async function getStoredDirectory() {
  const handle = await getDirHandle()
  if (!handle) return null

  // 检查权限
  const permission = await handle.queryPermission({ mode: 'readwrite' })
  if (permission === 'granted') {
    return handle
  }

  // 请求权限
  const requestPermission = await handle.requestPermission({ mode: 'readwrite' })
  if (requestPermission === 'granted') {
    return handle
  }

  return null
}

// 获取或选择文件夹
export async function getOrSelectDirectory() {
  let handle = await getStoredDirectory()
  if (!handle) {
    handle = await selectDirectory()
  }
  return handle
}

// 保存项目到文件
export async function saveProjectToFile(dirHandle, project) {
  const fileName = `${sanitizeFileName(project.name)}_${project.id}.json`
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(project, null, 2))
  await writable.close()
  return fileName
}

// 删除项目文件
export async function deleteProjectFile(dirHandle, project) {
  const fileName = `${sanitizeFileName(project.name)}_${project.id}.json`
  try {
    await dirHandle.removeEntry(fileName)
  } catch (err) {
    // 文件可能不存在，忽略错误
    console.warn('删除文件失败:', err)
  }
}

// 读取文件夹中的所有项目
export async function loadProjectsFromDirectory(dirHandle) {
  const projects = []

  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.json')) {
      try {
        const file = await entry.getFile()
        const content = await file.text()
        const project = JSON.parse(content)
        // 验证是否为有效的项目文件
        if (project.id && project.name && project.canvasData) {
          projects.push(project)
        }
      } catch (err) {
        console.warn(`读取文件 ${entry.name} 失败:`, err)
      }
    }
  }

  // 按更新时间排序
  projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  return projects
}

// 清理文件名（移除不合法字符）
function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50)
}

// 获取文件夹路径名称
export function getDirName(handle) {
  return handle?.name || ''
}

// 清除存储的文件夹句柄
export async function clearStoredDirectory() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(DIR_HANDLE_KEY)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// ==================== 通用工具函数 ====================

/**
 * 规范化文件路径
 * @param {string} filePath - 文件路径
 * @returns {string} 规范化后的路径
 */
export const normalizeFilePath = (filePath) => {
  if (!filePath) return ''
  return filePath
}

/**
 * 获取文件的显示名称
 * @param {string} filePath - 文件路径
 * @returns {string} 文件名
 */
export const getFileName = (filePath) => {
  if (!filePath) return ''

  // 移除 file:// 协议
  const path = filePath.replace('file://', '')

  // 获取最后一个路径分隔符后的内容
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1]
}

