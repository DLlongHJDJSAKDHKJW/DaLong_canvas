<template>
  <!-- HD Config Node - 只是配置卡片 -->
  <div class="hd-config-wrapper">
    <!-- Config card | 配置卡片 -->
    <div class="config-card" :class="{ 'selected': data.selected }">
      <div class="config-header">
        <span class="config-title">{{ data.label || '高清放大' }}</span>
      </div>

      <!-- Model selector | 模型选择 -->
      <div class="config-row">
        <span class="config-label">模型选择</span>
        <n-dropdown :options="modelOptions" @select="handleModelSelect">
          <button class="config-select">
            <span>{{ displayModel }}</span>
            <n-icon :size="12"><ChevronDownOutline /></n-icon>
          </button>
        </n-dropdown>
      </div>

      <!-- Sub-model | 子模型 -->
      <div class="config-row">
        <span class="config-label">模型</span>
        <n-dropdown :options="subModelOptions" @select="handleSubModelSelect">
          <button class="config-select">
            <span>{{ displaySubModel }}</span>
            <n-icon :size="12"><ChevronDownOutline /></n-icon>
          </button>
        </n-dropdown>
      </div>

      <!-- Scale | 放大倍数 -->
      <div class="config-row">
        <span class="config-label">放大倍数</span>
        <div class="scale-buttons">
          <button
            v-for="scale in scaleOptions"
            :key="scale"
            :class="['scale-btn', { active: localScale === scale }]"
            @click="handleScaleSelect(scale)"
          >
            {{ scale }}
          </button>
        </div>
      </div>

      <!-- Action buttons | 操作按钮 -->
      <div class="action-row">
        <button class="action-btn secondary" @click="handleReset" title="重置">
          <n-icon :size="14"><RefreshOutline /></n-icon>
        </button>
        <button
          class="action-btn primary"
          :disabled="loading || !hasInputImage"
          @click="handleGenerate"
          title="生成"
        >
          <n-spin v-if="loading" :size="12" />
          <n-icon v-else :size="14"><ArrowUpOutline /></n-icon>
        </button>
      </div>
    </div>

    <!-- Handles | 连接点 -->
    <Handle type="target" :position="Position.Left" id="left" class="handle-dot left" />
    <Handle type="source" :position="Position.Right" id="right" class="handle-dot right" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NDropdown, NSpin } from 'naive-ui'
import {
  ChevronDownOutline,
  RefreshOutline,
  ArrowUpOutline
} from '@vicons/ionicons5'
import { updateNode, removeNode, addNode, addEdge, nodes, edges } from '../../stores/canvas'

const props = defineProps({
  id: String,
  data: Object
})

const { updateNodeInternals } = useVueFlow()

// State
const loading = ref(false)
const localModel = ref(props.data?.model || 'topazlabs')
const localSubModel = ref(props.data?.subModel || 'general')
const localScale = ref(props.data?.scale || 2)

// Model options
const modelOptions = [
  { label: 'Topazlabs', key: 'topazlabs' },
  { label: 'Real-ESRGAN', key: 'realesrgan' },
  { label: 'ESPCN', key: 'espcn' }
]

// Sub-model options
const subModelOptions = computed(() => {
  switch (localModel.value) {
    case 'topazlabs':
      return [
        { label: '通用', key: 'general' },
        { label: '人像', key: 'portrait' },
        { label: '动漫', key: 'anime' }
      ]
    case 'realesrgan':
      return [
        { label: '通用', key: 'general' },
        { label: '动漫', key: 'anime' }
      ]
    default:
      return [{ label: '通用', key: 'general' }]
  }
})

const scaleOptions = [2, 4, 6]

const displayModel = computed(() => {
  return modelOptions.find(o => o.key === localModel.value)?.label || 'Topazlabs'
})

const displaySubModel = computed(() => {
  return subModelOptions.value.find(o => o.key === localSubModel.value)?.label || '通用'
})

// Check input image
const hasInputImage = computed(() => {
  const incomingEdges = edges.value.filter(e => e.target === props.id)
  for (const edge of incomingEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (sourceNode?.type === 'image' && sourceNode.data?.url) {
      return true
    }
  }
  return false
})

const getInputImage = () => {
  const incomingEdges = edges.value.filter(e => e.target === props.id)
  for (const edge of incomingEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (sourceNode?.type === 'image') {
      return sourceNode.data?.base64 || sourceNode.data?.url
    }
  }
  return null
}

const handleModelSelect = (key) => {
  localModel.value = key
  localSubModel.value = 'general'
  updateNode(props.id, { model: key, subModel: 'general' })
}

const handleSubModelSelect = (key) => {
  localSubModel.value = key
  updateNode(props.id, { subModel: key })
}

const handleScaleSelect = (scale) => {
  localScale.value = scale
  updateNode(props.id, { scale })
}

const handleGenerate = async () => {
  const inputImage = getInputImage()
  if (!inputImage) {
    window.$message?.warning('请先连接图片节点')
    return
  }

  loading.value = true

  try {
    // TODO: Call actual API
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 获取当前节点位置
    const currentNode = nodes.value.find(n => n.id === props.id)
    const nodeX = currentNode?.position?.x || 0
    const nodeY = currentNode?.position?.y || 0

    // 创建输出图片节点
    const outputNodeId = addNode('image', { x: nodeX + 320, y: nodeY }, {
      url: inputImage,
      label: '高清图像'
    })

    // 连接到输出节点
    addEdge({
      source: props.id,
      target: outputNodeId,
      sourceHandle: 'right',
      targetHandle: 'left'
    })

    setTimeout(() => updateNodeInternals(outputNodeId), 50)
    window.$message?.success('处理完成')
  } catch (err) {
    window.$message?.error(err.message || '处理失败')
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  localModel.value = 'topazlabs'
  localSubModel.value = 'general'
  localScale.value = 2
  updateNode(props.id, {
    model: 'topazlabs',
    subModel: 'general',
    scale: 2
  })
}
</script>

<style scoped>
.hd-config-wrapper {
  position: relative;
}

/* Config card */
.config-card {
  width: 240px;
  background: #1e1e20;
  border-radius: 14px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s;
}

.config-card.selected {
  border-color: rgba(99, 102, 241, 1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3), 0 0 20px rgba(99, 102, 241, 0.2);
}

.config-header {
  display: flex;
  align-items: center;
}

.config-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.config-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.config-select {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.config-select:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Scale buttons */
.scale-buttons {
  display: flex;
  gap: 4px;
}

.scale-btn {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.06);
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.scale-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.scale-btn.active {
  background: rgba(99, 102, 241, 0.5);
  color: white;
}

/* Action row */
.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn.secondary {
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.06);
}

.action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.action-btn.primary {
  background: rgba(99, 102, 241, 0.85);
  color: white;
}

.action-btn.primary:hover:not(:disabled) {
  background: #6366f1;
}

.action-btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Handle styles */
.handle-dot {
  width: 16px !important;
  height: 16px !important;
  background: #6366f1 !important;
  border: 3px solid #1a1a1c !important;
  border-radius: 50% !important;
  transition: all 0.2s !important;
  transform-origin: center center !important;
  position: absolute !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  z-index: 100 !important;
}

.handle-dot:hover {
  transform: translateY(-50%) scale(1.3) !important;
  background: #4f46e5 !important;
}

.handle-dot.left {
  left: -7px !important;
}

.handle-dot.right {
  right: -7px !important;
}
</style>
