# Kling v2.6 I2V

## 1. 模型定位

- 类型：图生视频
- 模型名：`kling-v2-6`
- 适合：老 Kling 图生视频

## 2. 支持能力

- 模式：`image-to-video` / `first-last-frame`
- 比例：`16:9` / `9:16` / `1:1`
- 清晰度：`1080P`
- 时长：`5 秒` / `10 秒`
- 音频：不支持

## 3. 请求核心字段

- `input.prompt`
- `input.negative_prompt`
- `parameters.mode`
- `parameters.aspect_ratio`
- `parameters.duration`
- `parameters.image`
- `parameters.image_tail`

## 4. 当前程序对照

- 只显示支持的模式
- 只显示 5 秒 / 10 秒
- 音频开关必须禁用

## 5. 价格

- 5 秒无声：`2.5 元`
- 10 秒无声：`5 元`
- 价格页虽列出有声档，但文档写明不支持有声，UI 不建议开放

## 6. 对照结论

- 这是最容易“配错 UI”的模型之一
- 一定要按它的真实限制收缩面板
