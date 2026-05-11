# 版本发布检查清单

## 发布前检查

### 1. 代码质量
- [ ] 所有功能正常工作
- [ ] 没有控制台错误
- [ ] 没有 ESLint 警告
- [ ] 代码已提交到 Git

### 2. 版本号更新
- [ ] 更新 `package.json` 中的 `version`
- [ ] 遵循语义化版本规范（SemVer）
  - 主版本号：不兼容的 API 修改
  - 次版本号：向下兼容的功能性新增
  - 修订号：向下兼容的问题修正

### 3. 文档更新
- [ ] 更新 CHANGELOG.md（如果有）
- [ ] 更新 README.md 中的版本信息
- [ ] 检查所有文档链接是否有效

### 4. 配置检查
- [ ] `electron-builder.json` 配置正确
- [ ] `package.json` 中的 `build.publish` 配置正确
- [ ] GitHub 仓库信息正确

### 5. 环境变量
- [ ] 设置 `GH_TOKEN` 环境变量
```bash
set GH_TOKEN=ghp_xxxxxxxxxxxx
```

## 构建流程

### 1. 清理旧文件
```bash
rm -rf dist release node_modules/.cache
```

### 2. 安装依赖
```bash
npm install --legacy-peer-deps
```

### 3. 构建前端
```bash
npm run build
```

### 4. 测试构建结果
- [ ] 检查 `dist` 目录是否生成
- [ ] 检查文件大小是否合理
- [ ] 手动测试 Web 版本：`npm run preview`

### 5. 打包 Electron
```bash
npm run electron:build:win
```

### 6. 检查打包结果
- [ ] `release` 目录已生成
- [ ] 安装包文件存在（.exe）
- [ ] 文件大小合理（通常 100-200MB）
- [ ] latest.yml 文件已生成

## 测试流程

### 1. 安装测试
- [ ] 在干净的 Windows 系统上安装
- [ ] 检查安装路径
- [ ] 检查桌面快捷方式
- [ ] 检查开始菜单项

### 2. 功能测试
- [ ] 应用正常启动
- [ ] 创建新项目
- [ ] 添加各类节点（文本、图片、视频）
- [ ] 文生图功能
- [ ] 图生图功能
- [ ] 文件保存和加载
- [ ] 项目导出和导入

### 3. 性能测试
- [ ] 启动速度 < 5 秒
- [ ] 内存占用合理（< 500MB）
- [ ] 画布操作流畅
- [ ] 大文件处理正常

### 4. 兼容性测试
- [ ] Windows 10 测试
- [ ] Windows 11 测试
- [ ] 不同分辨率测试
- [ ] 不同缩放比例测试

## 发布流程

### 1. 创建 Git Tag
```bash
git tag v1.0.0
git push origin v1.0.0
```

### 2. 上传到 GitHub Releases
- [ ] 创建新 Release
- [ ] 填写版本号（v1.0.0）
- [ ] 填写更新说明
- [ ] 上传安装包文件
- [ ] 上传 latest.yml 文件
- [ ] 标记为 Latest Release

### 3. 发布说明模板
```markdown
## 🎉 版本 1.0.0

### ✨ 新功能
- 新增 XXX 功能
- 支持 XXX 操作

### 🐛 Bug 修复
- 修复 XXX 问题
- 解决 XXX 错误

### 🔧 优化改进
- 优化 XXX 性能
- 改进 XXX 体验

### 📦 下载
- [Windows 安装包](链接)
- [便携版](链接)

### 📝 安装说明
1. 下载安装包
2. 双击运行
3. 按提示完成安装

### ⚠️ 注意事项
- 首次使用需要配置 API Key
- 建议定期备份项目文件
```

## 发布后检查

### 1. 自动更新测试
- [ ] 安装旧版本
- [ ] 启动应用
- [ ] 检查是否提示更新
- [ ] 测试下载更新
- [ ] 测试安装更新

### 2. 用户反馈
- [ ] 监控 GitHub Issues
- [ ] 收集用户反馈
- [ ] 记录常见问题

### 3. 数据统计
- [ ] 下载量统计
- [ ] 错误日志收集
- [ ] 使用情况分析

## 回滚计划

如果发现严重问题：

### 1. 立即行动
- [ ] 在 GitHub Release 中标记为 Pre-release
- [ ] 发布公告说明问题
- [ ] 提供临时解决方案

### 2. 修复问题
- [ ] 定位问题原因
- [ ] 修复代码
- [ ] 发布补丁版本

### 3. 重新发布
- [ ] 更新版本号（修订号 +1）
- [ ] 重新打包测试
- [ ] 发布新版本

## 版本号规范

### 格式
`主版本号.次版本号.修订号`

### 示例
- `1.0.0` - 首次正式发布
- `1.1.0` - 新增功能
- `1.1.1` - Bug 修复
- `2.0.0` - 重大更新

### 预发布版本
- `1.0.0-alpha.1` - Alpha 测试版
- `1.0.0-beta.1` - Beta 测试版
- `1.0.0-rc.1` - Release Candidate

## 常用命令

```bash
# 查看当前版本
npm version

# 自动更新版本号
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# 查看 Git 标签
git tag -l

# 删除错误的标签
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0

# 查看打包日志
cat release/builder-debug.yml
```
