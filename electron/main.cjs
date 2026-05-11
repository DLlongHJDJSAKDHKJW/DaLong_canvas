const path = require('path')
const fs = require('fs-extra')

// 禁用 Electron 安全警告（开发环境已知的安全配置）
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// 添加启动参数禁用某些安全特性
process.argv.push('--disable-features=RendererCodeIntegrity')
process.argv.push('--disable-site-isolation-trials')

// 尝试直接导入 Electron API
let app, BrowserWindow, ipcMain, dialog

try {
  const electron = require('electron')
  if (typeof electron === 'object' && electron.app) {
    ({ app, BrowserWindow, ipcMain, dialog } = electron)
  } else {
    // 如果 electron 是字符串，说明在错误的环境中运行
    console.error('Electron must be run through the electron executable')
    process.exit(1)
  }
} catch (e) {
  console.error('Failed to load Electron:', e)
  process.exit(1)
}

let mainWindow
let autoUpdater = null
let userDataPath
let projectsPath

// 添加命令行参数以允许文件拖拽
app.commandLine.appendSwitch('disable-features', 'RendererCodeIntegrity')
app.commandLine.appendSwitch('disable-site-isolation-trials')

// 只在生产环境加载 autoUpdater
if (!process.env.VITE_DEV_SERVER_URL) {
  try {
    autoUpdater = require('electron-updater').autoUpdater
    autoUpdater.autoDownload = true // 开启自动下载
  } catch (e) {
    console.log('AutoUpdater not available in development mode')
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      enableRemoteModule: false,
      enableBlinkFeatures: 'FileSystemAccessAPI',
      // 禁用拖拽保护
      disableBlinkFeatures: 'Auxclick'
    },
    icon: path.join(__dirname, '../public/logo.png'),
    backgroundColor: '#1a1a1c',
    show: false,
    acceptFirstMouse: true
  })

  // 移除默认应用菜单栏 (File, Edit, View, Window 等)
  mainWindow.setMenu(null)

  // 彻底禁止导航，防止拖拽文件导致页面跳转（节点消失的罪魁祸首）
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // 允许开发环境的热更新导航，阻止其他所有导航
    if (!process.env.VITE_DEV_SERVER_URL || !url.startsWith('http://localhost:5173')) {
      console.log('拦截非法导航:', url)
      event.preventDefault()
    }
  })

  // 阻止重定向
  mainWindow.webContents.on('will-redirect', (event, url) => {
    console.log('阻止重定向:', url)
    event.preventDefault()
  })

  // 阻止新窗口打开
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // 只在顶层做最基础的保护，不要拦截业务 drop
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.executeJavaScript(`
      window.addEventListener('dragover', (e) => e.preventDefault(), false)
      window.addEventListener('drop', (e) => e.preventDefault(), false)
    `)
  })

  // 开发环境加载 Vite 服务器，生产环境加载打包文件
  const isDev = !app.isPackaged

  if (isDev) {
    // 开发环境：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

}

app.whenReady().then(() => {
  // 初始化用户数据目录
  userDataPath = app.getPath('userData')
  projectsPath = path.join(userDataPath, 'projects')
  fs.ensureDirSync(projectsPath)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  // 自动更新事件打通(仅生产环境)
  if (autoUpdater) {
    autoUpdater.on('update-available', (info) => {
      mainWindow.webContents.send('update-available', info)
    })
    
    autoUpdater.on('update-not-available', (info) => {
      mainWindow.webContents.send('update-not-available', info)
    })

    autoUpdater.on('download-progress', (progressObj) => {
      mainWindow.webContents.send('update-download-progress', progressObj)
    })

    autoUpdater.on('update-downloaded', (info) => {
      mainWindow.webContents.send('update-downloaded', info)
    })
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// ==================== 路径处理助手 ====================

/**
 * 递归处理对象中的路径，实现绝对路径与占位符的转换
 * @param {any} obj - 要处理的对象
 * @param {string} search - 要查找的字符串
 * @param {string} replace - 要替换的字符串
 */
function processPaths(obj, search, replace) {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string' && obj.includes(search)) {
      return obj.split(search).join(replace)
    }
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => processPaths(item, search, replace))
  }

  const newObj = {}
  for (const key in obj) {
    newObj[key] = processPaths(obj[key], search, replace)
  }
  return newObj
}

// 标准化路径用于比较 (统一转为正斜杠)
function normalizeForCompare(p) {
  return p.replace(/\\/g, '/')
}

// ==================== IPC 处理器 ====================

// 选择项目目录
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: '选择项目保存位置',
    buttonLabel: '选择文件夹'
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const selectedPath = result.filePaths[0]
  // 更新全局项目路径
  projectsPath = selectedPath
  // 确保目录存在
  fs.ensureDirSync(projectsPath)
  return selectedPath
})

// 获取用户数据路径
ipcMain.handle('get-user-data-path', () => {
  return userDataPath
})

// 获取所有项目列表 (兼容新旧两种模式)
ipcMain.handle('get-projects', async (event, customPath) => {
  try {
    const targetPath = customPath || projectsPath
    if (!await fs.pathExists(targetPath)) return []

    const projects = []
    const items = await fs.readdir(targetPath, { withFileTypes: true })

    for (const item of items) {
      if (item.isDirectory()) {
        // 新模式：子目录/project.json
        const projectFile = path.join(targetPath, item.name, 'project.json')
        if (await fs.pathExists(projectFile)) {
            let project;
            try {
              project = await fs.readJSON(projectFile)
            } catch (jsonErr) {
              console.error(`解析项目文件失败 (可能文件损坏): ${item.name}`, jsonErr)
              continue // 跳过损坏的项目
            }
            
            // 记录所在目录名
            project._dirName = item.name
            
            // 读取独立的对话记录 (chat.json)
            const chatFile = path.join(targetPath, item.name, 'chat.json')
            if (await fs.pathExists(chatFile)) {
              try {
                const chatData = await fs.readJSON(chatFile)
                if (project.canvasData) {
                  project.canvasData.chatData = chatData
                }
              } catch (err) {
                console.error(`读取对话文件失败: ${item.name}`, err)
              }
            }
            
            // ！！！路径动态还原！！！
            const currentRoot = normalizeForCompare(`file:///${path.join(targetPath, item.name)}`)
            project = processPaths(project, '$PROJECT_ROOT$', currentRoot)
            
            projects.push(project)
        }
      } else if (item.isFile() && item.name.endsWith('.json') && item.name !== 'chat.json') {
        // 旧模式：直接在根目录的 .json 
        const projectFile = path.join(targetPath, item.name)
        try {
          const project = await fs.readJSON(projectFile)
          projects.push(project)
        } catch (err) {
          console.error(`读取旧版项目文件失败: ${item.name}`, err)
        }
      }
    }

    return projects
  } catch (error) {
    console.error('获取项目列表失败:', error)
    return []
  }
})

// 保存项目 (画布数据) 到独立文件夹
ipcMain.handle('save-project', async (event, project, customPath) => {
  try {
    const targetPath = customPath || projectsPath
    const safeFolderName = project.name.replace(/[<>:"/\\|?*]/g, '_')
    const projectDir = path.join(targetPath, safeFolderName)
    
    await fs.ensureDir(projectDir)
    const projectFile = path.join(projectDir, 'project.json')

    // ！！！路径脱敏保存！！！
    const currentRoot = normalizeForCompare(`file:///${projectDir}`)
    const portableProject = processPaths(project, currentRoot, '$PROJECT_ROOT$')

    // 剔除对话数据，对话数据现在独立存放 (精准删除 canvasData 内部的副本)
    if (portableProject.canvasData) {
      delete portableProject.canvasData.chatData
    }

    await fs.writeJSON(projectFile, portableProject, { spaces: 2 })

    return { success: true, path: projectFile, dirPath: projectDir }
  } catch (error) {
    console.error('保存项目失败:', error)
    return { success: false, error: error.message }
  }
})

// 保存对话记录到独立文件 (chat.json)
ipcMain.handle('save-chat', async (event, chatData, projectName, customPath) => {
  try {
    const targetPath = customPath || projectsPath
    const safeFolderName = projectName.replace(/[<>:"/\\|?*]/g, '_')
    const projectDir = path.join(targetPath, safeFolderName)
    
    await fs.ensureDir(projectDir)
    const chatFile = path.join(projectDir, 'chat.json')

    await fs.writeJSON(chatFile, chatData, { spaces: 2 })

    return { success: true, path: chatFile }
  } catch (error) {
    console.error('保存对话记录失败:', error)
    return { success: false, error: error.message }
  }
})

// 删除项目 (删除整个项目文件夹)
ipcMain.handle('delete-project', async (event, projectId, projectName, customPath) => {
  try {
    const targetPath = customPath || projectsPath
    const safeFolderName = projectName.replace(/[<>:"/\\|?*]/g, '_')
    const projectDir = path.join(targetPath, safeFolderName)

    // 尝试删除文件夹
    if (await fs.pathExists(projectDir)) {
      await fs.remove(projectDir)
    } else {
      // 兼容旧模式：删除单个 .json 文件
      const oldFile = path.join(targetPath, `${safeFolderName}.json`)
      if (await fs.pathExists(oldFile)) {
        await fs.remove(oldFile)
      }
    }
    return { success: true }
  } catch (error) {
    console.error('删除项目失败:', error)
    return { success: false, error: error.message }
  }
})

// 重命名项目 (重命名物理文件夹)
ipcMain.handle('rename-project', async (event, oldName, newName, customPath) => {
  try {
    const targetPath = customPath || projectsPath
    const oldSafeName = oldName.replace(/[<>:"/\\|?*]/g, '_')
    const newSafeName = newName.replace(/[<>:"/\\|?*]/g, '_')

    const oldDir = path.join(targetPath, oldSafeName)
    const newDir = path.join(targetPath, newSafeName)

    if (await fs.pathExists(oldDir)) {
      await fs.rename(oldDir, newDir)
    } else {
      // 兼容旧模式：重命名单个 .json 文件
      const oldFile = path.join(targetPath, `${oldSafeName}.json`)
      const newFile = path.join(targetPath, `${newSafeName}.json`)
      if (await fs.pathExists(oldFile)) {
        await fs.rename(oldFile, newFile)
      }
    }
    return { success: true }
  } catch (error) {
    console.error('重命名项目失败:', error)
    return { success: false, error: error.message }
  }
})

// 保存文件（图片/视频）
ipcMain.handle('open-file-dialog', async (event, options) => {
  const { dialog } = require('electron')
  try {
    const result = await dialog.showOpenDialog(mainWindow, options)
    return result
  } catch (error) {
    console.error('打开文件对话框失败:', error)
    throw error
  }
})

ipcMain.handle('save-file', async (event, fileData) => {
  try {
    const { buffer, projectName, fileName, type, customPath, sourcePath } = fileData

    // 决定项目根目录
    const targetPath = customPath || projectsPath
    let projectDir = targetPath
    
    if (projectName) {
      const safeFolderName = projectName.replace(/[<>:"/\\|?*]/g, '_')
      projectDir = path.join(targetPath, safeFolderName)
    }

    // 保存到该项目文件夹下的 media 目录
    const mediaDir = path.join(projectDir, 'media')
    await fs.ensureDir(mediaDir)

    // 生成唯一文件名
    const ext = path.extname(fileName)
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`
    const filePath = path.join(mediaDir, uniqueName)

    // 如果提供了源文件路径，直接复制文件
    if (sourcePath) {
      await fs.copyFile(sourcePath, filePath)
    } else {
      await fs.writeFile(filePath, Buffer.from(buffer))
    }

    return { success: true, path: filePath }
  } catch (error) {
    console.error('保存文件失败:', error)
    return { success: false, error: error.message }
  }
})

// 删除物理文件
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') return { success: false }

    console.log('[Main] 收到删除请求:', filePath)
    
    // 移除所有的 file: 前缀和开头的斜杠，直到看到盘符
    let cleanPath = filePath.replace(/^file:\/+/i, '')
    
    // 处理 Windows 盘符 (如 /E:/... -> E:/...)
    // 如果路径是 /E:/... 这种格式，去掉开头的 /
    if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(cleanPath)) {
      cleanPath = cleanPath.substring(1)
    }

    // 统一将正斜杠转回系统的反斜杠 (Windows 下)
    const finalPath = path.normalize(cleanPath)
    console.log('[Main] 转换后的物理路径:', finalPath)

    if (await fs.pathExists(finalPath)) {
      await fs.remove(finalPath)
      console.log('[Main] 物理文件已成功删除:', finalPath)
    } else {
      console.warn('[Main] 文件不存在，跳过删除:', finalPath)
    }
    return { success: true }
  } catch (error) {
    console.error('删除文件失败:', error)
    return { success: false, error: error.message }
  }
})

// 下载网络图片到本地
ipcMain.handle('download-image', async (event, url, projectName, customPath) => {
  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const targetPath = customPath || projectsPath
    let projectDir = targetPath

    if (projectName) {
      const safeFolderName = projectName.replace(/[<>:"/\\|?*]/g, '_')
      projectDir = path.join(targetPath, safeFolderName)
    }

    // 统一保存到对应项目的 media 文件夹
    const mediaDir = path.join(projectDir, 'media')
    await fs.ensureDir(mediaDir)

    const fileName = `generated-${Date.now()}.png`
    const filePath = path.join(mediaDir, fileName)

    await fs.writeFile(filePath, buffer)

    return { success: true, path: filePath }
  } catch (error) {
    console.error('下载图片失败:', error)
    return { success: false, error: error.message }
  }
})

// 读取文件
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const buffer = await fs.readFile(filePath)
    return { success: true, buffer: buffer.toString('base64') }
  } catch (error) {
    console.error('读取文件失败:', error)
    return { success: false, error: error.message }
  }
})

// 安装更新及下载控制
ipcMain.handle('check-for-updates', () => {
  if (autoUpdater) { return autoUpdater.checkForUpdates() }
  return null
})

ipcMain.handle('download-update', () => {
  if (autoUpdater) { return autoUpdater.downloadUpdate() }
  return null
})

ipcMain.handle('install-update', () => {
  if (autoUpdater) { autoUpdater.quitAndInstall() }
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})
