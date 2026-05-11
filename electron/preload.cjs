const { contextBridge, ipcRenderer } = require('electron')

// 在页面加载前设置拖拽事件
window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, true)

  document.addEventListener('drop', (e) => {
    e.preventDefault()
  }, true)

  document.addEventListener('dragenter', (e) => {
    e.preventDefault()
  }, true)
})

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 选择项目目录
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  // 打开文件对话框
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),

  // 获取用户数据路径
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

  // 项目管理
  getProjects: (customPath) => ipcRenderer.invoke('get-projects', customPath),
  saveProject: (project, customPath) => ipcRenderer.invoke('save-project', project, customPath),
  deleteProject: (projectId, projectName, customPath) => ipcRenderer.invoke('delete-project', projectId, projectName, customPath),
  renameProject: (oldName, newName, customPath) => ipcRenderer.invoke('rename-project', oldName, newName, customPath),
  saveChat: (chatData, projectName, customPath) => ipcRenderer.invoke('save-chat', chatData, projectName, customPath),

  // 文件管理
  saveFile: (fileData) => ipcRenderer.invoke('save-file', fileData),
  downloadImage: (url, projectName, customPath) => ipcRenderer.invoke('download-image', url, projectName, customPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),

  // 自动更新
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (event, info) => callback(info)),
  onUpdateProgress: (callback) => ipcRenderer.on('update-download-progress', (event, progress) => callback(progress)),
  onUpdateReady: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),


  // 平台检测
  isElectron: true,
  platform: process.platform
})
