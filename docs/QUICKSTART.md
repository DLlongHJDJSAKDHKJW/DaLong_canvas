# 快速开始指南

## 🚀 第一次使用

### 1. 安装依赖
```bash
npm install --legacy-peer-deps
```

### 2. 开发模式

#### Web 版本（浏览器）
```bash
npm run dev
```
访问 http://localhost:5173

#### Electron 版本（桌面应用）
```bash
npm run electron:dev
```

### 3. 打包发布

#### 打包 Windows 安装包
```bash
npm run electron:build:win
```

生成的文件：
- `release/火爆画布-1.0.0-Setup.exe` - 安装程序
- `release/火爆画布-1.0.0.exe` - 便携版

## 📝 配置 API

首次使用需要配置 AI 服务：

1. 点击右上角设置图标
2. 选择服务提供商（Funcloud/OpenAI/Anthropic）
3. 输入 API Key
4. 保存配置

## 🎨 基本使用

### 创建项目
1. 点击"新建项目"
2. 输入项目名称
3. 开始创作

### 添加节点
- **文本节点**：双击画布空白处
- **图片节点**：拖拽图片文件到画布
- **视频节点**：拖拽视频文件到画布

### 生成图片
1. 创建空白图片节点（右键菜单）
2. 输入描述文字
3. 点击"生成"按钮

### 图生图
1. 将文本节点连接到图片节点
2. 图片节点会使用文本作为提示词生成新图片

## 🔧 常见问题

### Q: Electron 窗口启动失败
A: 确保端口 5173 未被占用，或修改 vite.config.js 中的端口

### Q: 图片生成失败
A: 检查 API Key 是否正确配置，网络是否正常

### Q: 文件保存位置
A: 
- Electron: `%APPDATA%/huobao-canvas/`
- Web: 浏览器选择的目录

## 📦 发布自动更新

### 配置 GitHub Release

1. 修改 `package.json`:
```json
"build": {
  "publish": {
    "provider": "github",
    "owner": "你的用户名",
    "repo": "huobao-canvas"
  }
}
```

2. 设置 GitHub Token:
```bash
set GH_TOKEN=ghp_xxxxxxxxxxxx
```

3. 打包并发布:
```bash
npm run electron:build:win
```

4. 在 GitHub Releases 中发布新版本

### 版本更新流程

1. 修改 `package.json` 中的 `version`
2. 打包新版本
3. 发布到 GitHub Releases
4. 用户启动应用时自动检测更新

## 🎯 快捷键

- `Ctrl + S` - 保存项目
- `Delete` - 删除选中节点
- `Ctrl + Z` - 撤销
- `Ctrl + Y` - 重做
- `Ctrl + A` - 全选
- `鼠标滚轮` - 缩放画布
- `空格 + 拖拽` - 平移画布

## 💡 提示

- 选中节点后可以看到浮动工具栏
- 双击节点可以居中显示
- 连接节点时会显示电流动画效果
- 支持框选多个节点批量操作
