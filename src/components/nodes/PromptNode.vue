<template>
  <div
    class="prompt-node-wrapper"
    :class="{ 'selected': data.selected, 'editing': isEditing }"
    :style="nodeStyle"
    @wheel="handleWheel"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <!-- Input Handle on the left | 左侧输入点 -->
    <Handle
      type="target"
      :position="Position.Left"
      class="prompt-handle-left"
      :style="leftHandleStyle"
    />

    <div class="prompt-node-content" @dblclick="startEditing">
      <!-- Text area | 文本区域 -->
      <div class="prompt-body">
        <textarea
          ref="textareaRef"
          v-model="localContent"
          placeholder="双击编辑或点击下方按钮提取..."
          class="prompt-textarea"
          :class="{ 'editing': isEditing }"
          :readonly="!isEditing"
          @input="handleInput"
          @blur="stopEditing"
          @wheel.stop
          :disabled="loading"
        ></textarea>
        
        <!-- Loading overlay | 加载遮罩 -->
        <div v-if="loading" class="prompt-loading-overlay">
          <div class="loading-spinner"></div>
          <span>GPT-5.4 智能分析中...</span>
        </div>
      </div>

      <!-- Footer Buttons | 底部功能按钮 -->
      <div class="prompt-footer" @mousedown.stop>
        <button 
          class="extract-btn scene" 
          :disabled="loading || !hasInputImage"
          @click="extractPrompt('scene')"
        >
          <n-icon :size="16"><FilmOutline /></n-icon>
          <span>提取场景</span>
        </button>
        <button 
          class="extract-btn character" 
          :disabled="loading || !hasInputImage"
          @click="extractPrompt('character')"
        >
          <n-icon :size="16"><PersonOutline /></n-icon>
          <span>提取角色</span>
        </button>
      </div>

      <!-- Resize handle | 缩放手柄 -->
      <div
        v-if="data.selected && !isEditing"
        class="resize-handle"
        @mousedown.stop="startResize"
      ></div>
    </div>

    <!-- Output Handle on the right | 右侧输出点 -->
    <Handle
      type="source"
      :position="Position.Right"
      class="prompt-handle-right"
      :style="rightHandleStyle"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon } from 'naive-ui'
import { 
  FilmOutline, 
  PersonOutline
} from '@vicons/ionicons5'
import { updateNode, edges, nodes } from '../../stores/canvas'
import { useChat } from '../../hooks/useApi'

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    required: true
  }
})

const { updateNodeInternals } = useVueFlow()
const localContent = ref(props.data.content || '')
const textareaRef = ref(null)
const isEditing = ref(false)

// 缩放相关状态
const isResizing = ref(false)
const resizeStartPos = ref({ x: 0, y: 0 })
const resizeStartSize = ref({ width: 0, height: 0 })

// 节点样式
const nodeStyle = computed(() => {
  const width = props.data.width || 320
  const height = props.data.height || 360
  return {
    width: `${width}px`,
    height: `${height}px`,
    minWidth: '280px',
    minHeight: '240px',
    border: isEditing.value
      ? '3px solid #10b981'
      : props.data.selected
        ? '3px solid #818cf8'
        : '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: isEditing.value
      ? '0 0 12px rgba(16, 185, 129, 0.6), 0 0 24px rgba(16, 185, 129, 0.4), 0 0 48px rgba(16, 185, 129, 0.2)'
      : props.data.selected
        ? '0 0 12px rgba(99, 102, 241, 0.6), 0 0 24px rgba(99, 102, 241, 0.4), 0 0 48px rgba(99, 102, 241, 0.2)'
        : '0 10px 30px rgba(0, 0, 0, 0.3)'
  }
})

// ==================== Handle 靠近放大 ====================
const mouseXFrac = ref(0.5)
const mouseYFrac = ref(0.5)
const isMouseOnNode = ref(false)

const handleMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  mouseXFrac.value = ((e.clientX - rect.left) / rect.width)
  mouseYFrac.value = ((e.clientY - rect.top) / rect.height)
  isMouseOnNode.value = true
}

const handleMouseLeave = () => {
  isMouseOnNode.value = false
}

const handleProximityScale = (side) => {
  if (!isMouseOnNode.value) return 1
  const distX = side === 'left' ? mouseXFrac.value : (1 - mouseXFrac.value)
  const distY = Math.abs(mouseYFrac.value - 0.5)
  const dist = Math.sqrt(distX * distX + distY * distY)
  return Math.max(1, 1.6 - dist * 1.5)
}

const leftHandleStyle = computed(() => ({
  top: '50%', marginTop: '-8px', left: '-8px',
  transform: `scale(${handleProximityScale('left')})`,
  transition: isMouseOnNode.value ? 'transform 0.08s linear' : 'transform 0.3s ease-out'
}))

const rightHandleStyle = computed(() => ({
  top: '50%', marginTop: '-8px', right: '-8px',
  transform: `scale(${handleProximityScale('right')})`,
  transition: isMouseOnNode.value ? 'transform 0.08s linear' : 'transform 0.3s ease-out'
}))
// ==================================================

// 编辑模式切换
const startEditing = () => {
  isEditing.value = true
  updateNode(props.id, { draggable: false })
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

const stopEditing = () => {
  isEditing.value = false
  updateNode(props.id, { draggable: true })
}

// 缩放逻辑
const startResize = (event) => {
  isResizing.value = true
  resizeStartPos.value = { x: event.clientX, y: event.clientY }
  resizeStartSize.value = { 
    width: props.data.width || 320, 
    height: props.data.height || 360 
  }

  window.addEventListener('mousemove', handleResize)
  window.addEventListener('mouseup', stopResize)
}

const handleResize = (event) => {
  if (!isResizing.value) return

  const dx = event.clientX - resizeStartPos.value.x
  const dy = event.clientY - resizeStartPos.value.y

  const newWidth = Math.max(280, resizeStartSize.value.width + dx)
  const newHeight = Math.max(240, resizeStartSize.value.height + dy)

  updateNode(props.id, { 
    width: newWidth, 
    height: newHeight 
  })
  
  // 必须触发内部更新以同步连线位置
  updateNodeInternals(props.id)
}

const stopResize = () => {
  isResizing.value = false
  window.removeEventListener('mousemove', handleResize)
  window.removeEventListener('mouseup', stopResize)
}

// 滚轮处理：仅在编辑模式下阻止冒泡，方便滚动查看长文本而不缩放画布
const handleWheel = (event) => {
  if (isEditing.value) {
    event.stopPropagation()
  }
}

// 检测是否有图片输入
const inputImages = computed(() => {
  const incomingEdges = edges.value.filter(e => e.target === props.id)
  const images = []
  
  for (const edge of incomingEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (sourceNode?.type === 'image' && sourceNode.data?.url) {
      images.push(sourceNode.data.url)
    }
  }
  return images
})

const hasInputImage = computed(() => inputImages.value.length > 0)

// AI Chat Hook
const {
  loading,
  currentResponse,
  send: sendChat
} = useChat({
  model: 'gpt-5.4',
  systemPrompt: '你是一个顶级的视觉艺术专家和生图提示词架构师。'
})

// 监听 AI 响应并更新内容
watch(currentResponse, (newVal) => {
  if (newVal) {
    localContent.value = newVal
    // 流式更新期间不触发历史记录保存，防止卡顿
    updateNode(props.id, { content: newVal }, false)
  }
})

// 监听加载状态，结束时保存一次历史
watch(loading, (isLoading) => {
  if (!isLoading && localContent.value) {
    // 传输结束，统一保存一次历史记录
    manualSaveHistory()
  }
})

const handleInput = () => {
  updateNode(props.id, { content: localContent.value }, true)
}

// 提取提示词
const extractPrompt = async (type) => {
  if (!hasInputImage.value || loading.value) return

  const imageUrl = inputImages.value[0]
  let systemPrompt = ''
  let userPrompt = ''

  const commonRequirements = `要求输出内容必须包含以下板块，且每个板块都要极其详尽：
1. 【画面总体描述】：对画面的核心内容、艺术风格、情感基调进行一段 200 字左右的深度中文分析。
2. 【场景细节描述】：详细拆解背景、环境、建筑、道具等视觉元素（中文）。
3. 【主体/角色特征】：如果是人物则分析外貌、服饰、材质；如果是物体则分析结构与质感（中文）。
4. 【光影/色彩描述】：分析光路方向、光影对比度、色调分布及氛围感（中文）。
5. 【中文生图提示词】：将视觉元素转化为高质量的中文 Prompts。
6. 【英文生图提示词】：将上述元素转化为最专业的 Midjourney/Stable Diffusion 英文提示词。
7. 【反向提示词】：提供详细的 Negative Prompt（包含英文）。
请严格按上述序号和标题输出，不要有任何开场白。`

  if (type === 'scene') {
    systemPrompt = `你是一个顶级的电影美术指导和视觉专家。请深度分析这张图片的场景设计。${commonRequirements}`
    userPrompt = '请全方位提取这张图片的场景、光影、风格提示词及反向提示词。'
  } else {
    systemPrompt = `你是一个资深的游戏角色设计师和原画专家。请深度分析图中的核心角色或主体。${commonRequirements}`
    userPrompt = '请全方位提取这张图片的角色细节、服装、质感提示词及反向提示词。'
  }

  try {
    localContent.value = ''
    await sendChat(userPrompt, true, {
      systemPrompt,
      images: [imageUrl]
    })
  } catch (err) {
    window.$message?.error('提取失败: ' + err.message)
  }
}

// 同步初始内容
watch(() => props.data.content, (newVal) => {
  if (newVal !== localContent.value) {
    localContent.value = newVal || ''
  }
})
</script>

<style scoped>
.prompt-node-wrapper {
  background: rgba(26, 26, 28, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  transition: border-color 0.3s, box-shadow 0.3s;
  position: relative;
  display: flex;
}

/* 选中状态 - 由 inline nodeStyle 控制 */
.prompt-node-wrapper.selected {
  /* border and box-shadow handled in inline nodeStyle */
}

/* 编辑状态 - 由 inline nodeStyle 控制 */
.prompt-node-wrapper.editing {
  /* border and box-shadow handled in inline nodeStyle */
}

.prompt-node-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
}

.prompt-body {
  position: relative;
  flex: 1;
  background: rgba(0, 0, 0, 0.1);
  display: flex;
}

.prompt-textarea {
  width: 100%;
  height: 100%;
  padding: 20px;
  background: transparent;
  border: none;
  resize: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  line-height: 1.6;
  font-family: inherit;
  outline: none;
  overflow-y: auto;
}

.prompt-textarea.editing {
  cursor: text;
}

.prompt-textarea:not(.editing) {
  cursor: default;
}

.prompt-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(26, 26, 28, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #6366f1;
  font-size: 13px;
  font-weight: 500;
  z-index: 5;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.prompt-footer {
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.extract-btn {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
}

.extract-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.4);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.extract-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Resize Handle - 同文本节点 */
.resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 20px;
  height: 20px;
  cursor: nwse-resize;
  z-index: 10;
}

.resize-handle::after {
  content: '';
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 10px;
  height: 10px;
  border-right: 2px solid rgba(255, 255, 255, 0.2);
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.resize-handle:hover::after {
  border-color: rgba(255, 255, 255, 0.6);
}

/* Handles */
.prompt-handle-left {
  width: 16px !important;
  height: 16px !important;
  background: #6366f1 !important;
  border: 3px solid #1a1a1c !important;
  border-radius: 50% !important;
  margin-top: -8px !important;
  position: absolute !important;
  left: -8px !important;
  z-index: 100 !important;
  transform-origin: center center !important;
  transition: all 0.2s;
}

.prompt-handle-left:hover {
  transform: scale(1.35) !important;
  background: #4f46e5 !important;
  box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.15) !important;
}

.prompt-handle-right {
  width: 16px !important;
  height: 16px !important;
  background: #6366f1 !important;
  border: 3px solid #1a1a1c !important;
  border-radius: 50% !important;
  margin-top: -8px !important;
  position: absolute !important;
  right: -8px !important;
  z-index: 100 !important;
  transform-origin: center center !important;
  transition: all 0.2s;
}

.prompt-handle-right:hover {
  transform: scale(1.35) !important;
  background: #4f46e5 !important;
  box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.15) !important;
}
</style>
