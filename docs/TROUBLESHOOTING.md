# 故障排除指南

## 安装问题

### npm 安装失败

**问题**: `npm install` 报错或依赖冲突

**解决方案**:
```bash
# 方案 1: 使用 legacy-peer-deps
npm install --legacy-peer-deps

# 方案 2: 清理缓存后重装
npm cache clean --force
npm install --legacy-peer-deps

# 方案 3: 删除 node_modules 重装
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# 方案 4: 使用 yarn 或 pnpm
yarn install
# 或
pnpm install
```

### Node 版本问题

**问题**: Node 版本不兼容

**解决方案**:
- 推荐使用 Node.js 18.x 或 20.x
- 使用 nvm 切换版本：
```bash
nvm install 20
nvm use 20
```

## Electron 问题

### Electron 无法启动

**问题**: `npm run electron:dev` 启动失败

**解决方案**:
1. 检查端口占用：
```bash
netstat -ano | findstr :5173
```

2. 修改端口（vite.config.js）：
```js
export default defineConfig({
  server: {
    port: 5174  // 改为其他端口
  }
})
```

3. 检查 Electron 是否正确安装：
```bash
npm list electron
```

### 打包失败

**问题**: `npm run electron:build:win` 失败

**解决方案**:
1. 确保先构建前端：
```bash
npm run build
npm run electron:build:win
```

2. 检查 electron-builder 配置：
- 确保 `electron-builder.json` 存在
- 检查 `package.json` 中的 `main` 字段指向 `electron/main.cjs`

3. 网络问题（下载 Electron 二进制文件）：
```bash
# 设置镜像
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm install electron --legacy-peer-deps
```

### 自动更新不工作

**问题**: 应用无法检测或下载更新

**解决方案**:
1. 检查 GitHub Token 配置：
```bash
echo %GH_TOKEN%
```

2. 确保 package.json 中的仓库信息正确：
```json
"build": {
  "publish": {
    "provider": "github",
    "owner": "你的GitHub用户名",
    "repo": "huobao-canvas"
  }
}
```

3. 检查 GitHub Release：
- 确保已发布 Release
- 确保上传了对应平台的安装包
- 检查 latest.yml 文件是否存在

4. 开发环境不会触发更新：
- 只有打包后的生产版本才会检查更新
- 使用 `npm run electron:build:win` 打包后测试

## 功能问题

### 图片生成失败

**问题**: 点击生成按钮后报错

**解决方案**:
1. 检查 API 配置：
- 打开设置面板
- 确认 API Key 正确
- 确认 Base URL 正确

2. 检查网络连接：
```bash
ping api.funcloud.ai
```

3. 查看控制台错误信息（F12）

4. 尝试切换其他模型或服务商

### 文件保存失败

**问题**: 项目或图片无法保存

**Electron 环境**:
1. 检查应用数据目录权限：
```bash
# Windows
echo %APPDATA%\huobao-canvas
```

2. 手动创建目录：
```bash
mkdir "%APPDATA%\huobao-canvas\projects"
mkdir "%APPDATA%\huobao-canvas\images"
```

**Web 环境**:
1. 检查浏览器支持：
- 需要 Chrome 86+ 或 Edge 86+
- 不支持 Firefox 和 Safari

2. 重新选择保存目录：
- 点击"选择文件夹"
- 授予读写权限

### 视频无法播放

**问题**: 拖入视频后无法播放

**解决方案**:
1. 检查视频格式：
- 支持：MP4, WebM, OGG
- 推荐：H.264 编码的 MP4

2. 检查文件大小：
- 建议小于 100MB
- 大文件可能导致性能问题

3. 转换视频格式：
```bash
ffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4
```

## 性能问题

### 画布卡顿

**问题**: 节点很多时操作卡顿

**解决方案**:
1. 减少节点数量（建议 < 100）
2. 关闭不必要的动画效果
3. 降低图片分辨率
4. 使用性能更好的电脑

### 内存占用高

**问题**: 应用占用内存过大

**解决方案**:
1. 定期保存并重启应用
2. 删除不需要的节点
3. 压缩图片文件
4. 清理浏览器缓存（Web 版）

## 开发问题

### 热重载不工作

**问题**: 修改代码后页面不自动刷新

**解决方案**:
1. 检查 Vite 配置
2. 重启开发服务器
3. 清理浏览器缓存

### TypeScript 错误

**问题**: 类型检查报错

**解决方案**:
- 本项目使用 JavaScript，不需要 TypeScript
- 如果看到 TS 错误，可以忽略或安装 TypeScript：
```bash
npm install -D typescript
```

## 日志和调试

### 查看日志

**Electron 环境**:
- 主进程日志：终端输出
- 渲染进程日志：F12 开发者工具

**Web 环境**:
- F12 开发者工具 Console 面板

### 启用详细日志

修改 `electron/main.cjs`：
```js
// 启用详细日志
process.env.DEBUG = '*'
```

### 常见错误码

- `666`: API 调用失败，检查 API Key 和网络
- `404`: 资源未找到，检查文件路径
- `500`: 服务器错误，稍后重试

## 获取帮助

如果以上方案都无法解决问题：

1. 查看完整错误日志
2. 在 GitHub Issues 提交问题
3. 提供以下信息：
   - 操作系统版本
   - Node.js 版本
   - 错误信息截图
   - 复现步骤
