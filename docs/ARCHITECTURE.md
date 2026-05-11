# 项目架构说明

## 技术栈

### 前端
- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- **Pinia** - Vue 状态管理库
- **Vue Router** - 官方路由管理器
- **Naive UI** - Vue 3 组件库
- **Vue Flow** - 可视化节点编辑器
- **Tailwind CSS** - 实用优先的 CSS 框架

### 桌面端
- **Electron** - 跨平台桌面应用框架
- **electron-builder** - 打包工具
- **electron-updater** - 自动更新

### API 集成
- **Axios** - HTTP 客户端
- **Funcloud API** - AI 图片生成
- **OpenAI API** - 可选的 AI 服务
- **Anthropic API** - 可选的 AI 服务

## 目录结构

```
huobao-canvas/
├── electron/                    # Electron 相关
│   ├── main.cjs                # 主进程
│   └── preload.cjs             # 预加载脚本
│
├── src/
│   ├── api/                    # API 接口
│   │   ├── chat.js            # 聊天 API
│   │   └── image.js           # 图片生成 API
│   │
│   ├── components/             # Vue 组件
│   │   ├── nodes/             # 节点组件
│   │   │   ├── ImageNode.vue  # 图片节点
│   │   │   ├── TextNode.vue   # 文本节点
│   │   │   ├── VideoNode.vue  # 视频节点
│   │   │   └── HDConfigNode.vue # 高清配置节点
│   │   │
│   │   ├── edges/             # 边组件
│   │   │   ├── DeletableEdge.vue      # 可删除边
│   │   │   ├── ImageOrderEdge.vue     # 图片顺序边
│   │   │   ├── ImageRoleEdge.vue      # 图片角色边
│   │   │   └── PromptOrderEdge.vue    # 提示词顺序边
│   │   │
│   │   ├── ApiSettings.vue    # API 设置
│   │   ├── AppHeader.vue      # 应用头部
│   │   └── UpdateNotification.vue # 更新通知
│   │
│   ├── config/                 # 配置文件
│   │   ├── models.js          # 模型配置
│   │   ├── providers.js       # 服务商配置
│   │   └── workflows.js       # 工作流配置
│   │
│   ├── hooks/                  # Vue Hooks
│   │   ├── useApi.js          # API Hook
│   │   └── useWorkflowOrchestrator.js # 工作流编排
│   │
│   ├── router/                 # 路由配置
│   │   └── index.js
│   │
│   ├── stores/                 # Pinia 状态管理
│   │   ├── canvas.js          # 画布状态
│   │   ├── projects.js        # 项目管理
│   │   ├── theme.js           # 主题状态
│   │   └── pinia/
│   │       └── models.js      # 模型状态
│   │
│   ├── utils/                  # 工具函数
│   │   ├── constants.js       # 常量定义
│   │   ├── fileSystem.js      # 文件系统工具
│   │   └── request.js         # 请求工具
│   │
│   ├── views/                  # 页面视图
│   │   ├── Canvas.vue         # 画布页面
│   │   └── Home.vue           # 首页
│   │
│   ├── App.vue                 # 根组件
│   ├── main.js                 # 入口文件
│   └── style.css               # 全局样式
│
├── public/                     # 静态资源
│   └── logo.png
│
├── .claude/                    # Claude AI 配置
│   └── CLAUDE.md              # 项目规范
│
├── electron-builder.json       # Electron 打包配置
├── package.json                # 项目配置
├── vite.config.js             # Vite 配置
├── tailwind.config.js         # Tailwind 配置
├── postcss.config.js          # PostCSS 配置
│
└── 文档/
    ├── README.md              # 项目说明
    ├── README.electron.md     # Electron 使用文档
    ├── QUICKSTART.md          # 快速开始
    ├── TROUBLESHOOTING.md     # 故障排除
    └── RELEASE_CHECKLIST.md   # 发布检查清单
```

## 核心模块

### 1. 画布系统 (Canvas)

**文件**: `src/views/Canvas.vue`

**功能**:
- 节点拖拽和连接
- 画布缩放和平移
- 节点选择和编辑
- 文件拖拽导入

**依赖**:
- Vue Flow - 提供画布基础能力
- Pinia Canvas Store - 管理画布状态

### 2. 节点系统 (Nodes)

**图片节点** (`ImageNode.vue`):
- 显示图片
- 文生图功能
- 图生图功能
- 高清配置
- 扩图配置

**文本节点** (`TextNode.vue`):
- 可编辑文本
- 作为提示词输入
- 连接到图片节点

**视频节点** (`VideoNode.vue`):
- 视频播放
- 悬停自动播放
- 下载功能

### 3. API 系统

**图片生成** (`src/api/image.js`):
```javascript
// 文生图
generateImage(prompt, options)

// 图生图
generateImage(prompt, { referenceImages, ... })
```

**支持的服务商**:
- Funcloud (Gemini)
- OpenAI (DALL-E)
- Anthropic (Claude)
- 自定义 API

### 4. 状态管理

**Canvas Store** (`src/stores/canvas.js`):
- 节点列表
- 边列表
- 选中状态
- 画布配置

**Projects Store** (`src/stores/projects.js`):
- 项目列表
- 当前项目
- 保存/加载
- 导入/导出

**Models Store** (`src/stores/pinia/models.js`):
- API 配置
- 模型选择
- 服务商管理

### 5. 文件系统

**Web 环境**:
- File System Access API
- 用户选择目录
- 浏览器存储

**Electron 环境**:
- Node.js fs 模块
- 应用数据目录
- 自动创建目录结构

**统一接口** (`src/utils/fileSystem.js`):
```javascript
// 检测环境
isElectron()

// 保存文件
saveFile(path, data)

// 读取文件
readFile(path)

// 删除文件
deleteFile(path)
```

## 数据流

### 1. 图片生成流程

```
用户输入提示词
    ↓
ImageNode.handleGenerateImage()
    ↓
useImageGeneration.generateImage()
    ↓
API 调用 (Funcloud/OpenAI/Anthropic)
    ↓
返回 base64 图片数据
    ↓
保存到本地文件系统
    ↓
更新节点数据
    ↓
显示生成的图片
```

### 2. 项目保存流程

```
用户点击保存
    ↓
Canvas.saveProject()
    ↓
收集画布数据 (nodes, edges)
    ↓
Projects Store.saveProject()
    ↓
判断环境 (Web/Electron)
    ↓
Web: File System Access API
Electron: fs.writeFile
    ↓
保存 JSON 文件
```

### 3. 自动更新流程

```
应用启动
    ↓
Main Process 检查更新
    ↓
electron-updater.checkForUpdates()
    ↓
发现新版本
    ↓
发送事件到 Renderer Process
    ↓
UpdateNotification 显示弹窗
    ↓
用户确认下载
    ↓
下载更新包
    ↓
显示下载进度
    ↓
下载完成
    ↓
提示重启安装
    ↓
用户确认重启
    ↓
安装更新并重启
```

## 通信机制

### Electron IPC

**Main → Renderer**:
```javascript
// 更新可用
mainWindow.webContents.send('update-available', info)

// 下载进度
mainWindow.webContents.send('update-progress', progress)

// 更新就绪
mainWindow.webContents.send('update-ready', info)
```

**Renderer → Main**:
```javascript
// 保存项目
ipcRenderer.invoke('save-project', project)

// 读取项目
ipcRenderer.invoke('read-project', projectId)

// 安装更新
ipcRenderer.send('install-update')
```

### Vue 组件通信

**Props Down**:
```vue
<ImageNode :data="nodeData" />
```

**Events Up**:
```vue
emit('update:data', newData)
```

**Provide/Inject**:
```javascript
// Canvas.vue
provide('canvasContext', { ... })

// ImageNode.vue
const context = inject('canvasContext')
```

## 性能优化

### 1. 图片优化
- 使用 WebP 格式
- 压缩图片质量
- 懒加载大图

### 2. 渲染优化
- Vue Flow 虚拟滚动
- 节点按需渲染
- 防抖和节流

### 3. 内存优化
- 及时释放 Blob URL
- 限制历史记录数量
- 清理未使用的资源

## 安全考虑

### 1. Electron 安全
- 禁用 Node.js 集成
- 使用 contextBridge
- 内容安全策略 (CSP)

### 2. API 安全
- API Key 本地存储
- HTTPS 通信
- 请求签名验证

### 3. 文件安全
- 路径验证
- 文件类型检查
- 大小限制

## 扩展性

### 添加新节点类型

1. 创建节点组件 `src/components/nodes/NewNode.vue`
2. 在 `Canvas.vue` 中注册
3. 在 `canvas.js` 中添加默认数据
4. 更新 `.claude/CLAUDE.md` 规范

### 添加新 API 服务商

1. 在 `src/config/providers.js` 中添加配置
2. 在 `src/api/image.js` 中实现接口
3. 在 `ApiSettings.vue` 中添加 UI

### 添加新功能

1. 创建对应的 Vue 组件
2. 添加到路由（如需要）
3. 更新状态管理（如需要）
4. 编写文档和测试
