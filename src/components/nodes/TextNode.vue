<template>
  <!-- Text node | 文本节点 -->
  <div class="text-node-wrapper" @mousemove="handleMouseMove" @mouseleave="handleMouseLeave">
    <!-- Text container | 文本容器 -->
    <div
      class="text-node"
      :class="{ 'selected': data.selected, 'editing': isEditing }"
      :style="nodeStyle"
      @dblclick="startEditing"
    >
      <textarea
        ref="textareaRef"
        v-model="localText"
        class="text-input"
        :class="{ 'editing': isEditing }"
        placeholder="双击编辑文本..."
        :readonly="!isEditing"
        @input="handleTextChange"
        @blur="stopEditing"
        @wheel.stop
        @mousedown.stop="handleTextareaMousedown"
        @selectstart.stop
      ></textarea>

      <!-- Resize handle | 缩放手柄 -->
      <div
        v-if="data.selected && !isEditing"
        class="resize-handle"
        @mousedown.stop="startResize"
      ></div>
    </div>

    <!-- Handles | 连接点 - 移到外层 wrapper -->
    <Handle
      type="source"
      :position="Position.Right"
      id="right"
      class="handle-dot right"
      :style="rightHandleStyle"
    />
    <Handle
      type="target"
      :position="Position.Left"
      id="left"
      class="handle-dot left"
      :style="leftHandleStyle"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { updateNode, removeNode } from '../../stores/canvas'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  id: String,
  data: Object
})

const { viewport } = useVueFlow()

// 获取画布缩放比例
const zoom = computed(() => viewport.value?.zoom || 1)

// 本地文本状态
const localText = ref(props.data.text || '')
const textareaRef = ref(null)
const isEditing = ref(false)

// 缩放相关状态
const isResizing = ref(false)
const resizeStartPos = ref({ x: 0, y: 0 })
const resizeStartSize = ref({ width: 0, height: 0 })

// 动画状态
const isAnimating = ref(true)

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

// 监听 props 变化
watch(() => props.data.text, (newText) => {
  if (newText !== localText.value) {
    localText.value = newText || ''
  }
})

// 节点样式
const nodeStyle = computed(() => {
  const width = props.data.width || 300
  const height = props.data.height || 200
  return {
    width: `${width}px`,
    height: `${height}px`,
    minWidth: '200px',
    minHeight: '100px',
    border: isEditing.value
      ? '3px solid #10b981'
      : props.data.selected
        ? '3px solid #818cf8'
        : '2px solid rgba(255, 255, 255, 0.08)',
    boxShadow: isEditing.value
      ? '0 0 12px rgba(16, 185, 129, 0.6), 0 0 24px rgba(16, 185, 129, 0.4), 0 0 48px rgba(16, 185, 129, 0.2)'
      : props.data.selected
        ? '0 0 12px rgba(99, 102, 241, 0.6), 0 0 24px rgba(99, 102, 241, 0.4), 0 0 48px rgba(99, 102, 241, 0.2)'
        : 'none'
  }
})

// 组件挂载时触发动画
onMounted(() => {
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
})

// 开始编辑
const startEditing = () => {
  isEditing.value = true
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

// 停止编辑
const stopEditing = () => {
  isEditing.value = false
}

// 处理 textarea 的 mousedown（编辑模式下阻止拖动）
const handleTextareaMousedown = (e) => {
  if (isEditing.value) {
    e.stopPropagation()
  }
}

// 文本变化处理
const handleTextChange = () => {
  updateNode(props.id, {
    text: localText.value,
    label: localText.value.substring(0, 20) || '文本'
  })
}

// 开始缩放
const startResize = (e) => {
  e.preventDefault()
  e.stopPropagation()

  isResizing.value = true
  resizeStartPos.value = { x: e.clientX, y: e.clientY }
  resizeStartSize.value = {
    width: props.data.width || 300,
    height: props.data.height || 200
  }

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

// 处理缩放
const handleResize = (e) => {
  if (!isResizing.value) return

  const deltaX = (e.clientX - resizeStartPos.value.x) / zoom.value
  const deltaY = (e.clientY - resizeStartPos.value.y) / zoom.value

  const newWidth = Math.max(200, resizeStartSize.value.width + deltaX)
  const newHeight = Math.max(100, resizeStartSize.value.height + deltaY)

  updateNode(props.id, {
    width: newWidth,
    height: newHeight
  })
}

// 停止缩放
const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}
</script>

<style scoped>
.text-node-wrapper {
  position: relative;
  /* 移除这里的动画，防止在入场瞬间干扰 Handle 的几何坐标计算 */
}

/* 文本节点容器 */
.text-node {
  position: relative;
  background: rgba(30, 30, 32, 0.95);
  border-radius: 16px;
  transition: all 0.2s;
  background: rgba(30, 30, 32, 0.95);
  animation: scaleIn 0.15s ease-out;
  transform-origin: center center;
}

@keyframes scaleIn {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.text-node.selected {
  /* border and box-shadow handled in inline nodeStyle */
}

.text-node.editing {
  /* border and box-shadow handled in inline nodeStyle */
}

/* 文本输入框 */
.text-input {
  width: 100%;
  height: 100%;
  padding: 16px;
  background: transparent;
  border: none;
  outline: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  line-height: 1.6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  resize: none;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.text-input::-webkit-scrollbar {
  width: 8px;
}

.text-input::-webkit-scrollbar-track {
  background: transparent;
}

.text-input::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.text-input::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.text-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.text-input:not(.editing) {
  cursor: default;
  user-select: none;
  pointer-events: none;
}

.text-input.editing {
  cursor: text;
  user-select: text;
  pointer-events: auto;
}

/* 缩放手柄 */
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
  border-right: 2px solid rgba(255, 255, 255, 0.3);
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
}

.resize-handle:hover::after {
  border-color: rgba(255, 255, 255, 0.6);
}

/* 连接点样式 */
.handle-dot {
  width: 16px !important;
  height: 16px !important;
  background: #6366f1 !important;
  border: 3px solid #1a1a1c !important;
  border-radius: 50% !important;
  transition: all 0.2s;
  transform-origin: center center !important;
  position: absolute !important;
  z-index: 100 !important;
}

.handle-dot:hover {
  transform: scale(1.35) !important;
  background: #4f46e5 !important;
  box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.15) !important;
}

.handle-dot.right {
  right: -8px !important;
}

.handle-dot.left {
  left: -8px !important;
}
</style>
