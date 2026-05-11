<template>
  <!-- 透明的宽线段用于检测悬停 -->
  <path
    :d="path"
    fill="none"
    stroke="transparent"
    stroke-width="30"
    style="pointer-events: stroke; cursor: pointer;"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  />

  <!-- 底层线段 - 发光效果 -->
  <path
    v-if="isTargetSelected"
    :d="path"
    fill="none"
    stroke="rgba(99, 102, 241, 0.3)"
    stroke-width="8"
    stroke-linecap="round"
    style="pointer-events: none; filter: blur(4px);"
  />

  <!-- 实际显示的线段 -->
  <path
    :d="path"
    fill="none"
    :stroke="isHovered ? '#ef4444' : (isTargetSelected ? '#6366f1' : 'rgba(99, 102, 241, 0.6)')"
    :stroke-width="isTargetSelected ? 2.5 : 2"
    stroke-linecap="round"
    style="pointer-events: none;"
  />

  <!-- 电流动画层 -->
  <path
    v-if="isTargetSelected"
    :d="path"
    fill="none"
    stroke="url(#electricGradient)"
    stroke-width="3"
    stroke-linecap="round"
    stroke-dasharray="8 12"
    class="electric-flow"
    style="pointer-events: none;"
  />

  <!-- 电流光点动画 -->
  <circle
    v-if="isTargetSelected"
    r="4"
    fill="#a5b4fc"
    class="electric-dot"
    style="filter: drop-shadow(0 0 4px #6366f1);"
  >
    <animateMotion
      :path="path"
      dur="1s"
      repeatCount="indefinite"
    />
  </circle>

  <!-- SVG 渐变定义 -->
  <defs>
    <linearGradient id="electricGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(99, 102, 241, 0)" />
      <stop offset="50%" stop-color="rgba(165, 180, 252, 0.8)" />
      <stop offset="100%" stop-color="rgba(99, 102, 241, 0)" />
    </linearGradient>
  </defs>

  <!-- 删除按钮 -->
  <foreignObject
    :x="labelX - (12 / zoom)"
    :y="labelY - (12 / zoom)"
    :width="24 / zoom"
    :height="24 / zoom"
    style="overflow: visible; pointer-events: none;"
  >
    <div
      class="edge-delete-btn-container"
      :style="{ zoom: 1 / zoom }"
    >
      <div
        class="edge-delete-btn"
        :class="{ visible: isHovered }"
        @click.stop.prevent="handleDelete"
        @mouseenter.stop="isHovered = true"
        @mouseleave.stop="isHovered = false"
        style="pointer-events: auto;"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
    </div>
  </foreignObject>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getBezierPath, useVueFlow } from '@vue-flow/core'
import { removeEdge, edges } from '../../stores/canvas'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  id: String,
  source: String,
  target: String,
  sourceX: Number,
  sourceY: Number,
  targetX: Number,
  targetY: Number,
  sourcePosition: String,
  targetPosition: String,
  data: Object,
  markerEnd: String,
  style: Object
})

const { viewport, getSelectedNodes } = useVueFlow()
const zoom = computed(() => viewport.value?.zoom || 1)

const isHovered = ref(false)

// 检查一个节点是否最终连接到选中的节点（递归向右查找）
const isNodeConnectedToSelected = (nodeId, visited = new Set()) => {
  if (visited.has(nodeId)) return false
  visited.add(nodeId)

  const selectedNodes = getSelectedNodes.value

  // 如果这个节点本身被选中，返回 true
  if (selectedNodes.some(node => node.id === nodeId)) {
    return true
  }

  // 查找这个节点的所有传出边，看是否最终连接到选中节点
  const outgoingEdges = edges.value.filter(e => e.source === nodeId)
  for (const edge of outgoingEdges) {
    if (isNodeConnectedToSelected(edge.target, visited)) {
      return true
    }
  }

  return false
}

// 检查当前边是否应该显示电流效果
// 条件：这条边的目标节点最终连接到选中的节点
const isTargetSelected = computed(() => {
  return isNodeConnectedToSelected(props.target)
})

const path = computed(() => {
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition
  })
  return edgePath
})

const labelX = computed(() => (props.sourceX + props.targetX) / 2)
const labelY = computed(() => (props.sourceY + props.targetY) / 2)

const handleDelete = (e) => {
  e.preventDefault()
  e.stopPropagation()
  removeEdge(props.id)
}
</script>

<style scoped>
/* 电流流动动画 */
.electric-flow {
  animation: electricFlow 0.8s linear infinite;
}

@keyframes electricFlow {
  from {
    stroke-dashoffset: 20;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* 光点动画已通过 SVG animateMotion 实现 */
.electric-dot {
  opacity: 0.9;
}

.edge-delete-btn-container {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edge-delete-btn {
  width: 24px;
  height: 24px;
  background: rgba(30, 30, 32, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
}

.edge-delete-btn.visible {
  opacity: 1;
}

.edge-delete-btn:hover {
  background: rgba(239, 68, 68, 0.9);
  border-color: #ef4444;
  color: white;
}
</style>
