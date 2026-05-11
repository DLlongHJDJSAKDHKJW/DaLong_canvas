# HappyHorse Video Edit

## 1. 模型定位

- 类型：视频编辑
- 模型名：`happyhorse-1.0-video-edit`
- 适合：对已有视频做改造

## 2. 支持能力

- 模式：`reference-all`
- 比例：`16:9`
- 清晰度：`720P` / `1080P`
- 时长：`5 秒` / `10 秒`
- 音频：不支持

## 3. 请求核心字段

- `input.prompt` 必填
- `input.video_url` 必填
- `input.images` 可选，最多 `5` 张
- `parameters.resolution`
- `parameters.audio_setting`
- `parameters.seed`

## 4. 当前程序对照

- 不应显示文生视频、图生视频、首尾帧等模式
- 只显示视频编辑相关入口更合理
- 音频开关应禁用

## 5. 价格

- AstraFlow 计费页暂未看到明确单价
- 建议前端显示：`价格待确认`

## 6. 对照结论

- 它是编辑模型，不是新生成模型
- 输入源应该是 `video_url`，不是纯 prompt
