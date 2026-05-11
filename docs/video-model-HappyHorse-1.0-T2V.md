# HappyHorse 1.0 T2V

## 1. 模型定位

- 类型：文生视频
- 模型名：`happyhorse-1.0-t2v`
- 适合：纯提示词生成视频

## 2. 支持能力

- 模式：`text-to-video`
- 比例：`16:9` / `9:16` / `1:1`
- 清晰度：`720P` / `1080P`
- 时长：`3-15 秒`
- 音频：不支持

## 3. 请求核心字段

- `input.prompt` 必填
- `parameters.resolution`
- `parameters.ratio`
- `parameters.duration`
- `parameters.watermark`
- `parameters.seed`

## 4. 当前程序对照

- `videoMode` 应只显示：`文生视频`
- `ratio` 不应显示超出支持的比例
- `duration` 应限制在 `3-15`
- `audio` 按不支持处理，默认关闭且禁用

## 5. 价格

- AstraFlow 计费页暂未看到明确单价
- 建议前端显示：`价格待确认`

## 6. 对照结论

- 这是最基础的文生视频模型
- 如果你的 UI 里出现 `全能参考`、`图片参考`，说明不应该在这个模型上展示
