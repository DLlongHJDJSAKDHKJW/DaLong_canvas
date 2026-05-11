import { saveFile } from '../utils/fileSystem'
import { saveProject } from '../stores/canvas'

export function useFileDrop({ 
  projectName, 
  canvasContainerRef, 
  screenToFlowCoordinate, 
  addNode, 
  updateNode, 
  bringNodeToFront,
  viewport
}) {
  const getViewportCenterPosition = () => {
    const vp = viewport.value
    const viewportCenterX = -vp.x / vp.zoom + (window.innerWidth / 2) / vp.zoom
    const viewportCenterY = -vp.y / vp.zoom + (window.innerHeight / 2) / vp.zoom

    return {
      x: viewportCenterX - 100,
      y: viewportCenterY - 100
    }
  }

  // 预先获取真实的分辨率
  const getMediaDimensions = (file) => {
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file)
      const isImage = file.type.startsWith('image/')
      
      if (isImage) {
        const img = new Image()
        img.onload = () => resolve({ width: img.width, height: img.height, url: objectUrl })
        img.onerror = () => resolve({ width: 400, height: 300, url: objectUrl })
        img.src = objectUrl
      } else {
        const video = document.createElement('video')
        video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight, url: objectUrl })
        video.onerror = () => resolve({ width: 400, height: 300, url: objectUrl })
        video.src = objectUrl
      }
    })
  }

  // 计算合理的初始缩放尺寸
  const calculateInitialSize = (width, height, maxInitialWidth = 400) => {
    let nodeWidth = width || maxInitialWidth
    let nodeHeight = height || 300
    if (width > maxInitialWidth) {
      nodeWidth = maxInitialWidth
      nodeHeight = (height / width) * maxInitialWidth
    }
    return { nodeWidth: Math.round(nodeWidth), nodeHeight: Math.round(nodeHeight) }
  }

  // 文件导入处理 (点击上传)
  const handleImportFile = async () => {
    if (!window.electronAPI?.openFileDialog) {
      console.error('文件选择功能仅在 Electron 环境下可用')
      return
    }

    try {
      const result = await window.electronAPI.openFileDialog({
        filters: [
          { name: '图片和视频', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov'] },
          { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
          { name: '视频', extensions: ['mp4', 'webm', 'mov'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return
      }

      const filePath = result.filePaths[0]
      const fileName = filePath.split(/[\\/]/).pop()
      const ext = fileName.split('.').pop().toLowerCase()

      // 判断文件类型
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
      const isVideo = ['mp4', 'webm', 'mov'].includes(ext)

      if (!isImage && !isVideo) {
        console.error('不支持的文件类型:', ext)
        return
      }

      const centerPosition = getViewportCenterPosition()
      const nodeType = isImage ? 'image' : 'video'

      // 先创建一个 Loading 占位节点
      const nodeId = addNode(nodeType, centerPosition, {
        url: null,
        loading: true,
        loadingText: '导入中...',
        width: 400,
        height: 300
      })
      bringNodeToFront(nodeId)

      // 保存文件到项目目录
      const savedResult = await window.electronAPI.saveFile({
        sourcePath: filePath,
        fileName: fileName,
        projectName: projectName.value, // 加入项目名称以定位文件夹
        type: isImage ? 'image' : 'video'
      })

      if (!savedResult.success) {
        console.error('文件保存失败')
        return
      }

      const fileUrl = `file://${savedResult.path}`

      // 获取真实宽高
      if (isImage) {
        const img = new Image()
        img.onload = () => {
          const { nodeWidth, nodeHeight } = calculateInitialSize(img.width, img.height)
          updateNode(nodeId, {
            url: fileUrl,
            loading: false,
            loadingText: undefined,
            width: nodeWidth,
            height: nodeHeight
          }, true)
          saveProject()
        }
        img.src = fileUrl
      } else {
        const video = document.createElement('video')
        video.onloadedmetadata = () => {
          const { nodeWidth, nodeHeight } = calculateInitialSize(video.videoWidth, video.videoHeight)
          updateNode(nodeId, {
            url: fileUrl,
            loading: false,
            loadingText: undefined,
            width: nodeWidth,
            height: nodeHeight
          }, true)
          saveProject()
        }
        video.src = fileUrl
      }
    } catch (error) {
      console.error('文件导入失败:', error)
    }
  }

  // 拖拽相关处理
  const onDragOver = (event) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
  }

  const onDrop = async (event) => {
    event.preventDefault()
    event.stopPropagation()

    const files = event.dataTransfer?.files

    if (!files || files.length === 0) {
      return
    }

    const file = files[0]
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      window.$message?.warning('只支持拖放图片或视频文件')
      return
    }

    // 获取拖放位置对应的画布坐标
    const container = canvasContainerRef.value
    if (!container) return

    // 使用 Vue Flow 提供的 screenToFlowCoordinate 直接转换 client 坐标，最为精准
    const canvasPos = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })

    window.$message?.success(`${isVideo ? '视频' : '图片'}解析中...`)

    // 1. 获取真实分辨率
    const { width, height, url: tempUrl } = await getMediaDimensions(file)
    const { nodeWidth, nodeHeight } = calculateInitialSize(width, height)

    // 让鼠标位于节点的正中心
    const centeredPos = {
      x: canvasPos.x - nodeWidth / 2,
      y: canvasPos.y - nodeHeight / 2
    }

    const nodeType = isVideo ? 'video' : 'image'

    // 2. 立即创建占位节点，指定确切的宽高
    const nodeId = addNode(nodeType, centeredPos, {
      url: null,
      loading: true,
      loadingText: '导入中...',
      fileName: file.name,
      fileType: file.type,
      width: nodeWidth,
      height: nodeHeight,
      label: file.name.replace(/\.[^/.]+$/, '') || (isVideo ? '视频' : '图片')
    })

    bringNodeToFront(nodeId)

    // 3. 异步持久化到项目目录 (Electron 专用)
    try {
      const savedUrl = await saveFile(file, projectName.value)
      updateNode(nodeId, { 
        url: savedUrl,
        loading: false,
        loadingText: undefined
      }, true)
      
      await saveProject()
      
      // 延迟释放占位图
      setTimeout(() => {
        URL.revokeObjectURL(tempUrl)
      }, 10000)
    } catch (error) {
      console.error('拖拽保存文件失败:', error)
      URL.revokeObjectURL(tempUrl)
    }
  }

  return {
    handleImportFile,
    onDragOver,
    onDrop
  }
}
