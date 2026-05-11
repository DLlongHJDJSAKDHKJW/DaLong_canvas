# 火爆画布 - Electron 桌面版

基于 Vue 3 + Vite + Electron 的可视化画布应用，支持文生图、图生图、视频处理等功能。

## 功能特性

- 🎨 可视化节点编辑器
- 🖼️ AI 图片生成（文生图、图生图）
- 📹 视频节点支持
- 💾 本地文件存储
- 🔄 自动更新
- 🌓 深色/浅色主题

## 开发环境

### 安装依赖

```bash
npm install
```

### Web 开发模式

```bash
npm run dev
```

### Electron 开发模式

```bash
npm run electron:dev
```

这会同时启动 Vite 开发服务器和 Electron 窗口。

## 打包发布

### 打包 Windows 版本

```bash
npm run electron:build:win
```

生成的安装包位于 `release` 目录。

### 打包所有平台

```bash
npm run electron:build
```

## 自动更新配置

1. 在 GitHub 创建仓库
2. 修改 `package.json` 中的 `build.publish` 配置：
   ```json
   "publish": {
     "provider": "github",
     "owner": "你的GitHub用户名",
     "repo": "huobao-canvas"
   }
   ```
3. 生成 GitHub Token（需要 `repo` 权限）
4. 设置环境变量：
   ```bash
   set GH_TOKEN=你的GitHub Token
   ```
5. 打包并发布：
   ```bash
   npm run electron:build:win
   ```

## 文件存储

### Electron 环境
- 项目文件：`%APPDATA%/huobao-canvas/projects/`
- 图片文件：`%APPDATA%/huobao-canvas/images/{projectId}/`
- 视频文件：`%APPDATA%/huobao-canvas/videos/{projectId}/`

### Web 环境
- 使用浏览器的 File System Access API
- 需要用户手动选择保存目录

## 技术栈

- **前端框架**: Vue 3 + Vite
- **UI 组件**: Naive UI
- **状态管理**: Pinia
- **画布引擎**: Vue Flow
- **桌面框架**: Electron
- **自动更新**: electron-updater

## 项目结构

```
huobao-canvas/
├── electron/           # Electron 主进程和预加载脚本
│   ├── main.cjs       # 主进程
│   └── preload.cjs    # 预加载脚本
├── src/
│   ├── components/    # Vue 组件
│   ├── views/         # 页面视图
│   ├── stores/        # Pinia 状态管理
│   ├── utils/         # 工具函数
│   └── api/           # API 接口
├── public/            # 静态资源
└── dist/              # 构建输出
```

## API 配置

应用支持多个 AI 服务提供商：

- Funcloud
- OpenAI
- Anthropic
- 自定义 API

在应用设置中配置 API Key 和 Base URL。

## 常见问题

### 1. Electron 窗口无法启动
- 检查端口 5173 是否被占用
- 确保已安装所有依赖

### 2. 自动更新不工作
- 确保 GitHub Token 配置正确
- 检查 `package.json` 中的仓库信息
- 确保已发布 Release

### 3. 文件保存失败
- Electron: 检查应用数据目录权限
- Web: 确保浏览器支持 File System Access API

## 许可证

MIT
