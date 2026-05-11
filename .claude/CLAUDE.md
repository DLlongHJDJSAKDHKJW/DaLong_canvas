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

## 完整代码索引 (44 个源文件)

### 入口与根组件
| 文件 | 行数 | 说明 |
|------|------|------|
| [src/main.js](src/main.js) | 19 | 应用入口，创建 Vue 应用、Pinia、Router，挂载到 #app |
| [src/App.vue](src/App.vue) | 18 | 根组件，包裹 `<router-view>` |
| [src/style.css](src/style.css) | 121 | 全局样式：Tailwind 指令 + Vue Flow 黑暗主题覆盖 + 自定义类 |

### 配置层 [src/config/](src/config/)
| 文件 | 行数 | 说明 |
|------|------|------|
| [models.js](src/config/models.js) | 320 | 模型定义：聊天/图片/视频模型的名称、provider、schema（输入输出参数） |
| [providers.js](src/config/providers.js) | 140 | 服务商配置：各 provider 的基础 URL、请求格式 (openai/gemini)、Headers |

### API 层 [src/api/](src/api/)
| 文件 | 行数 | 说明 |
|------|------|------|
| [index.js](src/api/index.js) | 9 | 重新导出 image/chat/video API |
| [chat.js](src/api/chat.js) | 167 | 聊天 API：流式 (EventSource) 和非流式聊天补全 |
| [image.js](src/api/image.js) | 312 | 图片 API：生成（Gemini/OpenAI 两种格式）、编辑、遮罩编辑 |
| [video.js](src/api/video.js) | 46 | 视频 API：创建视频任务 + 轮询查询结果 |
| [model.js](src/api/model.js) | 35 | 模型列表 API：分页查询、全名称匹配、类型获取 |

### 状态管理 [src/stores/](src/stores/)
| 文件 | 行数 | 说明 |
|------|------|------|
| [canvas.js](src/stores/canvas.js) | 753 | **核心 store**：节点/边 CRUD、撤销/重做栈、项目保存/加载、全选/删除/复制粘贴 |
| [projects.js](src/stores/projects.js) | 413 | 项目管理：项目列表 CRUD、最近项目、自动保存定时器 |
| [theme.js](src/stores/theme.js) | 26 | 主题切换：深色/浅色模式 |
| [models.js](src/stores/models.js) | 214 | 内置 + 自定义模型管理，持久化到 localStorage |
| [api.js](src/stores/api.js) | 13 | 向后兼容导出，实际逻辑在 hooks/useApiConfig.js |
| [pinia/index.js](src/stores/pinia/index.js) | 7 | Pinia store 统一导出入口 |
| [pinia/models.js](src/stores/pinia/models.js) | 224 | API/模型配置 Pinia store：baseURL、API key、模型选择、提供商切换 |

### 路由 [src/router/](src/router/)
| 文件 | 行数 | 说明 |
|------|------|------|
| [index.js](src/router/index.js) | 25 | 两个路由：`/` (Home 首页)、`/canvas/:id` (Canvas 画布) |

### 视图 [src/views/](src/views/)
| 文件 | 行数 | 说明 |
|------|------|------|
| [Home.vue](src/views/Home.vue) | 426 | 首页：项目管理面板，项目卡片网格，新建/删除/重命名/导入/导出 |
| [Canvas.vue](src/views/Canvas.vue) | ~1900+ | **核心视图**：Vue Flow 画布实例，节点/边类型注册，右键菜单，聊天面板，工作流面板，惯性滚动，快捷键，缩放控件，MiniMap |

### 节点组件 [src/components/nodes/](src/components/nodes/)
| 文件 | 行数 | 说明 |
|------|------|------|
| [ImageNode.vue](src/components/nodes/ImageNode.vue) | 5300 | **最复杂的节点**：图片生成/编辑全流程，包含生成面板（文生图/图生图/遮罩编辑/扩图/重绘/擦除/抠图/网格分割）、@提及 prompt 编辑器、裁剪/高清放大/变体、右键菜单、浮动工具栏、配置卡片 |
| [VideoNode.vue](src/components/nodes/VideoNode.vue) | 1889 | 视频生成节点：模式选择（文生视频/图生视频等）、参考图片、参考音频、参考视频、价格估算、高级参数 |
| [TextNode.vue](src/components/nodes/TextNode.vue) | 364 | 可编辑文本节点：双击编辑、自适应尺寸、纯文本/标题模式切换 |
| [PromptNode.vue](src/components/nodes/PromptNode.vue) | 517 | LLM 提示提取节点：从对话或场景提取提示词/角色 |
| [HDConfigNode.vue](src/components/nodes/HDConfigNode.vue) | 384 | 高清放大配置节点：目标模型选择、分辨率设置 |
| [GroupNode.vue](src/components/nodes/GroupNode.vue) | 145 | 可选通分组节点：带标题标签、浅色背景 |
| [GhostNode.vue](src/components/nodes/GhostNode.vue) | 10 | 连接占位符节点：极小透明节点，用于放置边的起点/终点 |

### 边组件 [src/components/edges/](src/components/edges/)
| 文件 | 行数 | 说明 |
|------|------|------|
| [DeletableEdge.vue](src/components/edges/DeletableEdge.vue) | 233 | **默认边类型**：带悬停高亮和删除按钮，电流动画效果 |
| [ImageRoleEdge.vue](src/components/edges/ImageRoleEdge.vue) | 119 | 图片角色选择器边：标记角色 (character/style/pose/face/costume) |
| [PromptOrderEdge.vue](src/components/edges/PromptOrderEdge.vue) | 123 | Prompt 流程顺序边：1-5 顺序选择 |
| [ImageOrderEdge.vue](src/components/edges/ImageOrderEdge.vue) | 151 | 图片生成顺序边：1-5 顺序选择 |

### 通用组件 [src/components/](src/components/)
| 文件 | 行数 | 说明 |
|------|------|------|
| [ApiSettings.vue](src/components/ApiSettings.vue) | 813 | API 配置面板：多 API Key 管理、Base URL 配置、自动更新检查 |
| [MentionsPicker.vue](src/components/MentionsPicker.vue) | 351 | @提及选择器：NPopover 弹出框，支持搜索、键盘导航、图片预览 |
| [QuotaAlert.vue](src/components/QuotaAlert.vue) | 286 | 全局配额提示：余额不足/速率限制通知弹窗 |
| [DownloadModal.vue](src/components/DownloadModal.vue) | 121 | 下载管理弹窗：批量下载项目中所有图片资产 |
| [UpdateNotification.vue](src/components/UpdateNotification.vue) | 104 | 更新通知：Electron 自动更新进度模态框 |
| [AppHeader.vue](src/components/AppHeader.vue) | 24 | 简单应用头部标题栏 |

### Hooks [src/hooks/](src/hooks/)
| 文件 | 行数 | 说明 |
|------|------|------|
| [useApi.js](src/hooks/useApi.js) | 457 | API 操作组合式函数：聊天/图片生成/视频生成的状态管理与调用封装 |
| [useApiConfig.js](src/hooks/useApiConfig.js) | 84 | API 配置组合式函数：读取 API key / baseURL，判断是否已配置 |
| [useModelConfig.js](src/hooks/useModelConfig.js) | 436 | 模型配置组合式函数：内置模型加载、自定义模型管理、模型选择 |
| [useProvider.js](src/hooks/useProvider.js) | 125 | 服务商管理组合式函数：provider 切换、请求格式适配 |
| [useWorkflowOrchestrator.js](src/hooks/useWorkflowOrchestrator.js) | 987 | **工作流编排引擎**：5 种工作流类型（文生图、图生图、提示词提取、视频生成、HD放大），拓扑排序执行，结果传递 |
| [useInertia.js](src/hooks/useInertia.js) | 162 | 画布惯性滚动：物理引擎模拟滚动缓动效果 |
| [useFileDrop.js](src/hooks/useFileDrop.js) | 240 | 文件拖放导入：拖入图片/视频文件自动创建节点 |
| [useNodeRef.js](src/hooks/useNodeRef.js) | 104 | @提及解析工具：从文本中解析 @nodeId 引用 |

### 工具函数 [src/utils/](src/utils/)
| 文件 | 行数 | 说明 |
|------|------|------|
| [constants.js](src/utils/constants.js) | 60 | 常量：API 端点、错误码、轮询配置、存储 key |
| [schema.js](src/utils/schema.js) | 106 | Schema 工具：getNestedValue（嵌套取值）、buildRequestBody（FormData 构建）、parseApiResult（结果解析） |
| [request.js](src/utils/request.js) | 121 | Axios 实例：拦截器、baseURL 动态设置、错误统一处理 |
| [fileSystem.js](src/utils/fileSystem.js) | 379 | 文件系统：Electron IPC 桥接 + Web File API 回退，图片读取/保存/下载 |
| [videoPricing.js](src/utils/videoPricing.js) | 152 | 视频价格估算：各模型的价格计算函数 |

### Skills [src/skills/](src/skills/)
| 文件 | 行数 | 说明 |
|------|------|------|
| [imageCrop.js](src/skills/imageCrop.js) | 110 | Canvas 裁剪 skill：在画布上绘制裁剪框并完成裁剪 |
| [imageHD.js](src/skills/imageHD.js) | 170 | 高清放大 skill：调用 HD 模型放大图片并回传结果 |

### Electron 桌面端 [electron/](electron/)
| 文件 | 行数 | 说明 |
|------|------|------|
| [main.cjs](electron/main.cjs) | 520 | Electron 主进程：窗口管理、IPC 处理器（文件/项目管理/自动更新）、导航拦截 |
| [preload.cjs](electron/preload.cjs) | 69 | 预加载脚本：通过 contextBridge 暴露文件/更新 API 到渲染进程 |

### 配置文件总览
| 文件 | 说明 |
|------|------|
| [package.json](package.json) | 依赖管理与构建脚本 (v1.0.8)，electron-builder 发布配置指向当前 GitHub 仓库 |
| [vite.config.js](vite.config.js) | Vite 配置：`@` 别名、dev server 端口 5173、API 代理到 `https://api.chatfire.site` |
| [index.html](index.html) | HTML 入口 |
| [postcss.config.js](postcss.config.js) | PostCSS + Tailwind 配置 |
| [tailwind.config.js](tailwind.config.js) | Tailwind 自定义配置 |

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

### Store 导入方式
```js
// 方式一：从 canvas store 直接导入
import { nodes, edges, addNode, removeNode } from '@/stores/canvas'

// 方式二：从 Pinia store 导入
import { useModelStore } from '@/stores/pinia'

// 方式三：从 hooks 导入
import { useApiConfig, useChat, useImageGeneration } from '@/hooks'
import { useWorkflowOrchestrator } from '@/hooks/useWorkflowOrchestrator'
```
