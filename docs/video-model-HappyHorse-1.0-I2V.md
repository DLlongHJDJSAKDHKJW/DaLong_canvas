# HappyHorse 1.0 I2V

## 1. 模型定位

- 类型：图生视频
- 模型名：`happyhorse-1.0-i2v`
- 适合：首帧图动起来

## 2. 支持能力

- 模式：`image-to-video`
- 比例：`16:9` / `9:16` / `1:1`
- 清晰度：`720P` / `1080P`
- 时长：`3-15 秒`
- 音频：不支持

## 3. 请求核心字段

- `input.img_url` 必填
- `input.prompt` 可选
- `parameters.resolution`
- `parameters.duration`
- `parameters.watermark`
- `parameters.seed`

## 4. 当前程序对照

- `videoMode` 应只显示：`图生视频`
- 不支持的模式不要显示
- 时长最多到 `15`
- 音频开关应禁用

## 5. 价格

- AstraFlow 计费页暂未看到明确单价
- 建议前端显示：`价格待确认`

## 6. 对照结论

- 只适合单首帧图驱动
- 不应出现参考音频、参考视频入口
