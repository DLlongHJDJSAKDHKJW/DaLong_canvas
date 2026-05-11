# Huobao Canvas 项目规范

## 项目概述
基于 Vue 3 + Vite + Vue Flow 的无限画布应用，支持图片节点、文本节点等多种节点类型的可视化编排。

## 技术栈
- Vue 3 (Composition API)
- Vite
- Vue Flow (@vue-flow/core)
- Naive UI
- Pinia

---

## 节点开发规范

### 1. 浮动 UI 缩放规则

**核心原则：浮动 UI 不随画布缩放，保持固定大小和清晰度**

```vue
<!-- 使用 CSS zoom 属性实现反向缩放 -->
<div class="floating-panel" :style="{ zoom: 1 / zoom }">
  <!-- 内容 -->
</div>

<script setup>
import { computed } from 'vue'
import { useVueFlow } from '@vue-flow/core'

const { viewport } = useVueFlow()
const zoom = computed(() => viewport.value?.zoom || 1)
</script>
```

**重要：使用 `zoom` 而非 `transform: scale()`**
- `zoom` 属性不会导致文字模糊
- `transform: scale()` 会导致缩放后文字发虚

**需要反向缩放的元素：**
- 节点上方的浮动工具栏
- 节点下方的配置卡片
- 空节点的生成面板
- 线段上的删除按钮

**不需要反向缩放的元素（跟随画布缩放）：**
- 分辨率标签（右上角）
- 名称标签（左下角）

### 2. 单选 vs 多选显示规则

**浮动面板只在单选时显示，框选多个节点时隐藏**

```vue
<script setup>
import { computed } from 'vue'
import { useVueFlow } from '@vue-flow/core'

const { getSelectedNodes } = useVueFlow()

// 判断是否是唯一选中的节点
const isSingleSelected = computed(() => {
  const selectedNodes = getSelectedNodes.value
  return selectedNodes.length === 1 && selectedNodes[0]?.id === props.id
})
</script>

<template>
  <!-- 使用 isSingleSelected 控制浮动面板显示 -->
  <div v-show="isSingleSelected && data.url" class="floating-toolbar">
    <!-- 工具栏内容 -->
  </div>
</template>
```

### 3. 输入框交互优化

**防止输入框事件被画布捕获**

```vue
<textarea
  v-model="text"
  @wheel.stop
  @mousedown.stop
  @selectstart.stop
></textarea>
```

### 4. 按钮防变形

**确保按钮在 flex 布局中不被压缩**

```css
.action-btn {
  min-width: 44px;
  flex-shrink: 0;
}
```

---

## 边(Edge)开发规范

### 1. 悬停检测区域

**使用透明宽线段扩大悬停检测区域**

```vue
<template>
  <!-- 透明宽线段用于检测悬停 -->
  <path
    :d="path"
    fill="none"
    stroke="transparent"
    stroke-width="30"
    style="pointer-events: stroke; cursor: pointer;"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  />
  <!-- 实际显示的线段 -->
  <path
    :d="path"
    fill="none"
    :stroke="isHovered ? '#ef4444' : 'rgba(99, 102, 241, 0.6)'"
    stroke-width="2"
    style="pointer-events: none;"
  />
</template>
```

### 2. 线段删除按钮

**使用 foreignObject + zoom 保持按钮固定大小**

```vue
<foreignObject
  :x="labelX - (12 / zoom)"
  :y="labelY - (12 / zoom)"
  :width="24 / zoom"
  :height="24 / zoom"
  style="overflow: visible; pointer-events: none;"
>
  <div :style="{ zoom: 1 / zoom }">
    <div class="delete-btn" style="pointer-events: auto;">
      <!-- 按钮内容 -->
    </div>
  </div>
</foreignObject>
```

---

## 样式规范

### 主题色
- 主色：`#6366f1` (Indigo)
- 背景：`#1e1e20` / `#1a1a1c`
- 边框：`rgba(255, 255, 255, 0.08)`
- 文字：`rgba(255, 255, 255, 0.9)` / `rgba(255, 255, 255, 0.5)`
- 危险色：`#ef4444` (Red)

### 防模糊 CSS
```css
.floating-panel {
  will-change: transform;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  backface-visibility: hidden;
}
```

### 圆角规范
- 节点容器：`16px`
- 卡片/面板：`14px` - `16px`
- 按钮：`8px` - `12px`
- 小元素：`4px` - `6px`

---

## 文件结构

```
src/
├── components/
│   ├── nodes/           # 节点组件
│   │   ├── ImageNode.vue
│   │   ├── TextNode.vue
│   │   └── ...
│   └── edges/           # 边组件
│       └── DeletableEdge.vue
├── stores/
│   └── canvas.js        # 画布状态管理
└── views/
    └── Canvas.vue       # 画布主视图
```

---

## 常用 API

### Canvas Store (stores/canvas.js)
```js
import { 
  nodes, edges,           // 响应式节点和边数据
  addNode, removeNode,    // 节点操作
  addEdge, removeEdge,    // 边操作
  updateNode              // 更新节点数据
} from '@/stores/canvas'
```

### Vue Flow
```js
import { Handle, Position, useVueFlow } from '@vue-flow/core'

const { 
  viewport,              // 视口信息 { x, y, zoom }
  getSelectedNodes,      // 获取选中节点
  updateNodeInternals    // 更新节点内部结构
} = useVueFlow()
```
