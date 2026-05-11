<template>
  <!-- Group node | 分组节点 -->
  <div class="group-node-wrapper">
    <!-- Group label | 分组名称 -->
    <div class="group-header" v-if="!isEditing" @dblclick.stop="startEditing">
      <span class="group-title">{{ data.label || '新分组' }}</span>
      <n-icon class="edit-icon" :size="12"><CreateOutline /></n-icon>
    </div>
    
    <!-- Label editor | 名称编辑器 -->
    <div class="group-header editing" v-else>
      <input
        ref="inputRef"
        v-model="localLabel"
        class="group-input"
        @blur="stopEditing"
        @keydown.enter="stopEditing"
        @mousedown.stop
      />
    </div>

    <!-- Group background | 分组背景 -->
    <div 
      class="group-container" 
      :class="{ 'selected': data.selected }"
      :style="nodeStyle"
    >
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { NIcon } from 'naive-ui'
import { CreateOutline } from '@vicons/ionicons5'
import { updateNode } from '../../stores/canvas'

const props = defineProps({
  id: String,
  data: Object
})

const isEditing = ref(false)
const localLabel = ref(props.data.label || '新分组')
const inputRef = ref(null)

const nodeStyle = computed(() => ({
  width: `${props.data.width || 400}px`,
  height: `${props.data.height || 300}px`
}))

const startEditing = () => {
  isEditing.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

const stopEditing = () => {
  isEditing.value = false
  if (localLabel.value !== props.data.label) {
    updateNode(props.id, { label: localLabel.value }, true)
  }
}

watch(() => props.data.label, (newVal) => {
  localLabel.value = newVal || '新分组'
})
</script>

<style scoped>
.group-node-wrapper {
  position: relative;
  pointer-events: none;
}

.group-header {
  position: absolute;
  top: -32px;
  left: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
  border-radius: 10px 10px 0 0;
  color: white;
  font-size: 13px;
  font-weight: 700;
  pointer-events: all;
  cursor: pointer;
  box-shadow: 0 -4px 15px rgba(99, 102, 241, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.group-header:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.group-header.editing {
  padding: 0;
  background: transparent;
  box-shadow: none;
}

.group-input {
  background: #6366f1;
  border: 2px solid #818cf8;
  border-radius: 10px 10px 0 0;
  color: white;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 700;
  width: 180px;
  outline: none;
  box-shadow: 0 -4px 15px rgba(99, 102, 241, 0.4);
}

.edit-icon {
  opacity: 0.8;
}

.group-container {
  border: 2px dashed rgba(99, 102, 241, 0.5);
  background: rgba(99, 102, 241, 0.05);
  backdrop-filter: blur(4px);
  border-radius: 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: all;
}

.group-container.selected {
  border-style: solid;
  border-color: #818cf8;
  background: rgba(99, 102, 241, 0.12);
  box-shadow: 
    0 0 0 1px rgba(129, 140, 248, 0.3),
    0 10px 40px rgba(0, 0, 0, 0.2),
    inset 0 0 20px rgba(129, 140, 248, 0.1);
}
</style>
