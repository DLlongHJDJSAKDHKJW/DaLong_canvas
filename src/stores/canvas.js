/**
 * Canvas store | 画布状态管理
 * Manages nodes, edges and canvas state
 */
import { ref, watch } from 'vue'
import { useProjectsStore } from './projects'
import { saveChat } from '../utils/fileSystem'

// Node ID counter | 节点ID计数器
let nodeId = 0
const getNodeId = () => `node_${nodeId++}`

// Current project ID | 当前项目ID
export const currentProjectId = ref(null)

// Nodes and edges | 节点和边
export const nodes = ref([])
export const edges = ref([])

// Viewport state | 视口状态
export const canvasViewport = ref({ x: 100, y: 50, zoom: 0.8 })

// Selected node | 选中的节点
export const selectedNode = ref(null)
 
// Chat history | 对话历史
export const conversationSessions = ref([
   { id: 'conversation_1', title: '新对话 1', draft: '', messages: [] }
])
export const activeConversationId = ref('conversation_1')

// Auto-save flag | 自动保存标志
let autoSaveEnabled = false
let saveTimeout = null

// History for undo/redo | 撤销/重做历史
const history = ref([])
const historyIndex = ref(-1)
const MAX_HISTORY = 50 // 增加历史记录容量
let isRestoring = false

// Position change threshold for history | 位置变化阈值
const POSITION_THRESHOLD = 2 // 降低阈值，轻微移动也会记录

// Batch operation tracking | 批量操作跟踪
let isBatchOperation = false
let batchStartState = null

/**
 * 清理节点数据用于历史保存（移除大型数据如 base64）
 */
const cleanNodeForHistory = (node) => {
  const cleanData = { ...node.data }
  // 移除大型数据
  delete cleanData.base64
  delete cleanData.thumbnail
  // 保留 url 但如果是 base64 则只保留前 100 字符作为标识
  if (cleanData.url && cleanData.url.startsWith('data:')) {
    cleanData._hasBase64Url = true
    cleanData.url = cleanData.url.substring(0, 100)
  }
  return {
    ...node,
    data: cleanData
  }
}

/**
 * Save current state to history | 保存当前状态到历史
 * @param {boolean} force - Force save even if batch operation | 强制保存，即使在批量操作中
 */
const saveToHistory = (force = false) => {
  if (isRestoring) return

  // If in batch operation and not forced, don't save | 如果在批量操作中且未强制保存，则不保存
  if (isBatchOperation && !force) return

  // 清理节点数据，移除大型 base64
  const cleanNodes = nodes.value.map(cleanNodeForHistory)

  const state = {
    nodes: JSON.parse(JSON.stringify(cleanNodes)),
    edges: JSON.parse(JSON.stringify(edges.value))
  }

  // Remove future history if we're not at the end | 如果不在末尾，删除未来历史
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }

  // Add new state | 添加新状态
  history.value.push(state)

  // Limit history size | 限制历史大小
  if (history.value.length > MAX_HISTORY) {
    history.value.shift()
  } else {
    historyIndex.value++
  }
}

/**
 * Start batch operation | 开始批量操作
 * Records the starting state for batch operations
 */
export const startBatchOperation = () => {
  isBatchOperation = true
  batchStartState = {
    nodes: JSON.parse(JSON.stringify(nodes.value)),
    edges: JSON.parse(JSON.stringify(edges.value))
  }
}

/**
 * End batch operation and save to history | 结束批量操作并保存到历史
 * Compares with start state to decide if save is needed
 */
export const endBatchOperation = () => {
  if (!isBatchOperation || !batchStartState) {
    isBatchOperation = false
    return
  }

  // Check if there are significant changes | 检查是否有显著变化
  const hasSignificantChanges = checkSignificantChanges(batchStartState, {
    nodes: nodes.value,
    edges: edges.value
  })

  if (hasSignificantChanges) {
    saveToHistory(true)
  }

  isBatchOperation = false
  batchStartState = null
}

/**
 * Check if changes are significant enough to save | 检查变化是否足够显著需要保存
 * @param {object} oldState - Previous state | 之前的状态
 * @param {object} newState - New state | 新状态
 * @returns {boolean} - Whether changes should be saved | 是否应该保存变化
 */
const checkSignificantChanges = (oldState, newState) => {
  const oldNodes = oldState.nodes || []
  const newNodes = newState.nodes || []

  // Check for added or removed nodes | 检查添加或删除的节点
  if (oldNodes.length !== newNodes.length) {
    return true
  }

  // Check for new nodes (by comparing IDs) | 检查新节点
  const oldNodeIds = new Set(oldNodes.map(n => n.id))
  const newNodeIds = new Set(newNodes.map(n => n.id))

  // Nodes added | 添加的节点
  for (const id of newNodeIds) {
    if (!oldNodeIds.has(id)) {
      return true
    }
  }

  // Nodes removed | 删除的节点
  for (const id of oldNodeIds) {
    if (!newNodeIds.has(id)) {
      return true
    }
  }

  // Check position changes for existing nodes | 检查现有节点的位置变化
  for (const newNode of newNodes) {
    const oldNode = oldNodes.find(n => n.id === newNode.id)
    if (oldNode) {
      const dx = Math.abs(newNode.position.x - oldNode.position.x)
      const dy = Math.abs(newNode.position.y - oldNode.position.y)

      // If any node moved beyond threshold, save | 如果任何节点移动超过阈值，则保存
      if (dx > POSITION_THRESHOLD || dy > POSITION_THRESHOLD) {
        return true
      }
    }
  }

  // Check for edge changes | 检查边的变化
  const oldEdges = oldState.edges || []
  const newEdges = newState.edges || []

  if (oldEdges.length !== newEdges.length) {
    return true
  }

  return false
}

// Add a new node | 添加新节点
export const addNode = (type, position = { x: 100, y: 100 }, data = {}, shouldSave = false) => {
  const id = getNodeId()
  const now = Date.now()
  const newNode = {
    id,
    type,
    position,
    data: {
      ...getDefaultNodeData(type),
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    }
  }
  nodes.value = [...nodes.value, newNode]
  
  if (shouldSave) {
    manualSaveHistory()
  }
  
  return id
}

// Update node data | 更新节点数据
export const updateNodeData = (id, data) => {
  const now = Date.now()
  nodes.value = nodes.value.map(node =>
    node.id === id ? { ...node, data: { ...node.data, ...data, updatedAt: now } } : node
  )
}

/**
 * Add multiple nodes in batch | 批量添加多个节点
 * Uses batch operation to group all node additions into one history entry
 * @param {Array} nodeSpecs - Array of node specs [{ type, position, data }, ...]
 * @param {boolean} autoBatch - Whether to auto-manage batch operation (default: true)
 * @returns {Array} - Array of created node IDs | 创建的节点ID数组
 */
export const addNodes = (nodeSpecs, autoBatch = true) => {
  if (!nodeSpecs || nodeSpecs.length === 0) return []

  // Start batch operation if auto | 如果自动管理则开始批量操作
  if (autoBatch) {
    startBatchOperation()
  }

  const ids = []
  const now = Date.now()

  nodeSpecs.forEach(spec => {
    const { type, position = { x: 100, y: 100 }, data = {} } = spec
    const id = getNodeId()
    const newNode = {
      id,
      type,
      position,
      data: {
        ...getDefaultNodeData(type),
        ...data,
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now
      }
    }
    nodes.value = [...nodes.value, newNode]
    ids.push(id)
  })

  // End batch operation if auto | 如果自动管理则结束批量操作并保存到历史
  if (autoBatch) {
    endBatchOperation()
  }

  return ids
}

// Get default data for node type | 获取节点类型的默认数据
const getDefaultNodeData = (type) => {
  switch (type) {
    case 'image':
      return {
        url: '',
        label: '图片'
      }
    case 'text':
      return {
        text: '',
        label: '文本',
        width: 300,
        height: 200
      }
    case 'video':
      return {
        url: '',
        label: '视频',
        width: 400,
        height: 300
      }
    case 'hdConfig':
      return {
        model: 'topazlabs',
        subModel: 'general',
        scale: 2,
        outputUrl: null,
        label: '高清'
      }
    case 'promptExtract':
      return {
        content: '',
        label: '提示词提取',
        width: 320,
        height: 320
      }
    default:
      return {}
  }
}

// Vue Flow 根属性白名单 | Vue Flow root property whitelist
const FLOW_ROOT_KEYS = ['position', 'parentNode', 'zIndex', 'selected', 'draggable', 'hidden', 'selectable', 'connectable', 'type', 'style', 'class']

// Update node data | 更新节点数据
export const updateNode = (id, updates, triggerSave = false) => {
  const nodeIndex = nodes.value.findIndex(n => n.id === id)
  if (nodeIndex === -1) return

  const node = nodes.value[nodeIndex]
  const dataUpdates = {}
  const rootUpdates = {}

  // 智能分发属性：根属性去 root，其余去 data
  Object.keys(updates).forEach(key => {
    if (FLOW_ROOT_KEYS.includes(key)) {
      rootUpdates[key] = updates[key]
    } else if (key === 'data') {
      // 如果明确传了 data 对象，则进行合并
      Object.assign(dataUpdates, updates[key])
    } else {
      // 其余所有业务属性（如 loading, url, label）都归入 data
      dataUpdates[key] = updates[key]
    }
  })

  // 更新 data (保持响应性)
  if (Object.keys(dataUpdates).length > 0) {
    node.data = { ...node.data, ...dataUpdates }
  }
  
  // 更新根属性
  Object.assign(node, rootUpdates)

  // 只在重要更新时触发保存
  if (triggerSave) {
    manualSaveHistory()
    debouncedSave()
  }
}

/**
 * 物理删除节点关联的本地文件（带引用检查）
 * @param {Array} nodesToDelete - 准备删除的节点对象数组
 */
const deleteNodeFiles = (nodesToDelete) => {
  if (!window.electronAPI?.deleteFile) return

  nodesToDelete.forEach(node => {
    const url = node.data?.url
    // 只处理本地 file:// 路径
    if (typeof url === 'string' && url.startsWith('file://')) {
      // 检查剩余节点中是否还有人在使用这个文件
      const isStillUsed = nodes.value.some(n => 
        !nodesToDelete.some(tn => tn.id === n.id) && n.data?.url === url
      )
      
      if (!isStillUsed) {
        console.log('[CanvasStore] 准备物理删除未使用的文件:', url)
        window.electronAPI.deleteFile(url)
      }
    }
  })
}

// Remove node | 删除节点
export const removeNode = (id) => {
  const nodeToDelete = nodes.value.find(n => n.id === id)
  if (nodeToDelete) {
    deleteNodeFiles([nodeToDelete])
    nodes.value = nodes.value.filter(node => node.id !== id)
    edges.value = edges.value.filter(edge => edge.source !== id && edge.target !== id)
    manualSaveHistory()
  }
}

// Remove multiple nodes | 批量删除节点
export const removeNodes = (ids = []) => {
  const idSet = new Set(ids)
  if (idSet.size === 0) return

  const nodesToDelete = nodes.value.filter(node => idSet.has(node.id))
  deleteNodeFiles(nodesToDelete)

  nodes.value = nodes.value.filter(node => !idSet.has(node.id))
  edges.value = edges.value.filter(edge => !idSet.has(edge.source) && !idSet.has(edge.target))
  manualSaveHistory()
}

// Duplicate node | 复制节点
export const duplicateNode = (id) => {
  const sourceNode = nodes.value.find(node => node.id === id)
  if (!sourceNode) return null

  const newId = getNodeId()

  // Calculate max z-index | 计算最大层级
  const maxZIndex = Math.max(0, ...nodes.value.map(n => n.zIndex || 0))

  const newNode = {
    id: newId,
    type: sourceNode.type,
    position: {
      x: sourceNode.position.x + 50,
      y: sourceNode.position.y + 50
    },
    data: { ...sourceNode.data },
    zIndex: maxZIndex + 1
  }
  nodes.value = [...nodes.value, newNode]
  return newId
}

// Add edge | 添加边
export const addEdge = (params) => {
  const newEdge = {
    id: `edge_${params.source}_${params.target}`,
    ...params
  }
  edges.value = [...edges.value, newEdge]
  // 不再自动保存历史
}

/**
 * Add multiple edges in batch | 批量添加多条边
 * Uses batch operation to group all edge additions into one history entry
 * @param {Array} edgeSpecs - Array of edge specs [{ source, target, sourceHandle, targetHandle, type, data }, ...]
 * @param {boolean} autoBatch - Whether to auto-manage batch operation (default: true)
 * @returns {Array} - Array of created edge IDs | 创建的边ID数组
 */
export const addEdges = (edgeSpecs, autoBatch = true) => {
  if (!edgeSpecs || edgeSpecs.length === 0) return []

  // Start batch operation if auto | 如果自动管理则开始批量操作
  if (autoBatch) {
    startBatchOperation()
  }

  const ids = []

  edgeSpecs.forEach(params => {
    const newEdge = {
      id: `edge_${params.source}_${params.target}`,
      ...params
    }
    edges.value = [...edges.value, newEdge]
    ids.push(newEdge.id)
  })

  // End batch operation if auto | 如果自动管理则结束批量操作并保存到历史
  if (autoBatch) {
    endBatchOperation()
  }

  return ids
}

// Update edge data | 更新边数据
export const updateEdge = (id, data) => {
  edges.value = edges.value.map(edge =>
    edge.id === id ? { ...edge, data: { ...edge.data, ...data } } : edge
  )
}

// Remove edge | 删除边
export const removeEdge = (id) => {
  edges.value = edges.value.filter(edge => edge.id !== id)
}

// Clear canvas | 清空画布
export const clearCanvas = () => {
  nodes.value = []
  edges.value = []
  nodeId = 0
}

// Initialize with sample data | 使用示例数据初始化
export const initSampleData = () => {
  clearCanvas()
  
  // Add text node | 添加文本节点
  addNode('text', { x: 150, y: 150 }, {
    content: '一只金毛寻回犬在草地上奔跑，摇着尾巴，脸上带着快乐的表情。它的毛发在阳光下闪耀，眼神充满了对自由的渴望，全身散发着阳光、友善的气息。',
    label: '文本输入'
  })
  
  // Add image config node | 添加文生图配置节点
    addNode('imageConfig', { x: 450, y: 150 }, {
      prompt: '',
      model: 'doubao-seedream-4.5',
      ratio: '16:9 | 4张 | 高清',
      label: '文生图'
    })
  
  // Add edge between nodes | 添加节点之间的边
  addEdge({
    source: 'node_0',
    target: 'node_1',
    sourceHandle: 'right',
    targetHandle: 'left'
  })
}

/**
 * Load project data | 加载项目数据
 * @param {string} projectId - Project ID | 项目ID
 */
export const loadProject = (projectId) => {
  // 1. 立即锁定：禁用自动保存并标记正在恢复，防止加载过程中的数据变动触发误保存
  autoSaveEnabled = false
  isRestoring = true
  
  // 2. 立即清理：在加载新数据前彻底清空当前画布，确保没有上一个项目的残留
  clearCanvas()
  currentProjectId.value = projectId

  // 3. 获取并深拷贝数据
  const projectsStore = useProjectsStore()
  const project = projectsStore.projects.find(p => p.id === projectId)
  const canvasData = project?.canvasData

  if (canvasData) {
    // 深度克隆画布数据，彻底切断内存引用，防止项目间数据污染
    const dataClone = JSON.parse(JSON.stringify(canvasData))

    // Restore nodes | 恢复节点
    const loadedNodes = dataClone.nodes || []
    nodes.value = loadedNodes
      .filter(node => node && typeof node.type === 'string') // 彻底清洗脏数据
      .map(node => {
      // 抹除失效的 blob 预览地址
      if (node.data?.url && typeof node.data.url === 'string' && node.data.url.startsWith('blob:')) {
        return { ...node, data: { ...node.data, url: '' } }
      }
      return node
    })

    edges.value = dataClone.edges || []
    canvasViewport.value = dataClone.viewport || { x: 100, y: 50, zoom: 0.8 }

    // Restore chat history | 恢复对话历史 (从克隆数据中读取)
    if (dataClone.chatData) {
      conversationSessions.value = dataClone.chatData.sessions || [
        { id: 'conversation_1', title: '新对话 1', draft: '', messages: [] }
      ]
      activeConversationId.value = dataClone.chatData.activeId || 'conversation_1'
    } else {
      conversationSessions.value = [
        { id: 'conversation_1', title: '新对话 1', draft: '', messages: [] }
      ]
      activeConversationId.value = 'conversation_1'
    }

    // Update node ID counter | 更新节点ID计数器
    const maxId = nodes.value.reduce((max, node) => {
      const match = node.id.match(/node_(\d+)/)
      if (match) {
        return Math.max(max, parseInt(match[1], 10))
      }
      return max
    }, -1)
    nodeId = maxId + 1
  } else {
    // Empty project | 空项目
    clearCanvas()
  }

  // Initialize history with current state | 用当前状态初始化历史
  history.value = [{
    nodes: JSON.parse(JSON.stringify(nodes.value)),
    edges: JSON.parse(JSON.stringify(edges.value))
  }]
  historyIndex.value = 0

  // Enable auto-save after loading | 加载后启用自动保存
  setTimeout(() => {
    autoSaveEnabled = true
    isRestoring = false
  }, 100)
}

/**
 * Save current project | 保存当前项目
 */
export const saveProject = async () => {
  if (!currentProjectId.value) return
  const projectsStore = useProjectsStore()
  const chatData = {
    sessions: conversationSessions.value,
    activeId: activeConversationId.value
  }

  try {
    // 1. 保存画布主数据到 project.json
    await projectsStore.saveProject(currentProjectId.value, {
      nodes: nodes.value,
      edges: edges.value,
      viewport: canvasViewport.value,
      chatData // 暂时保留在这里传递，让 projectsStore 配合
    })

    // 2. 保存对话数据到 chat.json
    const project = projectsStore.projects.find(p => p.id === currentProjectId.value)
    if (project?.name) {
      await saveChat(chatData, project.name)
    }
  } catch (error) {
    console.error('[CanvasStore] 保存项目失败:', error)
  }
}

/**
 * Debounced auto-save | 防抖动自动保存
 */
let isSaving = false
const debouncedSave = () => {
  if (!autoSaveEnabled || !currentProjectId.value || isSaving) return

  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }

  saveTimeout = setTimeout(async () => {
    isSaving = true
    try {
      await saveProject()
    } finally {
      isSaving = false
    }
  }, 2000) // 增加到 2 秒减少保存频率
}

/**
 * Update viewport and save | 更新视口并保存
 */
export const updateViewport = (viewport) => {
  canvasViewport.value = viewport
  debouncedSave()
}

/**
 * Undo last action | 撤销上一步操作
 */
export const undo = () => {
  if (historyIndex.value <= 0) {
    window.$message?.info('没有可撤销的操作')
    return false
  }
  
  historyIndex.value--
  restoreState(history.value[historyIndex.value])
  return true
}

/**
 * Redo last undone action | 重做上一步撤销的操作
 */
export const redo = () => {
  if (historyIndex.value >= history.value.length - 1) {
    window.$message?.info('没有可重做的操作')
    return false
  }
  
  historyIndex.value++
  restoreState(history.value[historyIndex.value])
  return true
}

/**
 * Restore state from history | 从历史恢复状态
 */
const restoreState = (state) => {
  isRestoring = true

  // 保护机制：提取当前画布上已生成的“成果”节点
  // 这些节点包含：已有 URL 的图片/视频，或已有内容的提示词提取卡片
  const protectedNodes = nodes.value.filter(n => {
    if (n.type === 'image' || n.type === 'video') return !!n.data?.url
    if (n.type === 'promptExtract') return !!n.data?.content
    return false
  })

  // 深拷贝目标状态
  const newNodes = JSON.parse(JSON.stringify(state.nodes))
  const newEdges = JSON.parse(JSON.stringify(state.edges))

  // 将当前画布上的“保护节点”合并到待恢复的状态中
  protectedNodes.forEach(pNode => {
    const existingIndex = newNodes.findIndex(n => n.id === pNode.id)
    
    if (existingIndex === -1) {
      // 1. 如果目标状态里完全没有这个成果节点（例如撤销到了它被创建之前），则强制将其保留到新状态中
      newNodes.push(JSON.parse(JSON.stringify(pNode)))
    } else {
      // 2. 如果目标状态里有这个节点，但内容是空的（例如撤销到了它生成内容之前），则恢复其内容
      const targetNode = newNodes[existingIndex]
      if (pNode.type === 'image' || pNode.type === 'video') {
        if (!targetNode.data?.url && pNode.data?.url) {
          targetNode.data.url = pNode.data.url
        }
      } else if (pNode.type === 'promptExtract') {
        if (!targetNode.data?.content && pNode.data?.content) {
          targetNode.data.content = pNode.data.content
        }
      }
    }
  })

  // 执行恢复
  nodes.value = newNodes
  edges.value = newEdges
  
  setTimeout(() => {
    isRestoring = false
  }, 100)
}

/**
 * Check if can undo | 检查是否可以撤销
 */
export const canUndo = () => historyIndex.value > 0

/**
 * Check if can redo | 检查是否可以重做
 */
export const canRedo = () => historyIndex.value < history.value.length - 1

/**
 * Manually save current state to history | 手动保存当前状态到历史
 * Used for edge deletions and other operations not covered by automatic saves
 */
export const manualSaveHistory = () => {
  saveToHistory(true) // 强制保存，确保不被任何逻辑跳过
}

// Watch for changes and auto-save (deep watch to catch nested property changes)
// 监听变化并自动保存（开启深度监听以捕捉消息内容等深层属性变化）
watch([nodes, edges, conversationSessions, activeConversationId], () => {
  debouncedSave()
}, { deep: true })
