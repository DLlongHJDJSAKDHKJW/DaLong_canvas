# doubao-seedance-1.5-pro-251215

## 1. 模型定位

- 类型：文图生视频
- 模型名：`doubao-seedance-1-5-pro-251215`
- 适合：较完整的视频生成工作流

## 2. 支持能力

- 模式：`text-to-video` / `image-to-video` / `first-last-frame`
- 比例：`auto` / `21:9` / `16:9` / `4:3` / `1:1` / `3:4` / `9:16`
- 清晰度：`480P` / `720P` / `1080P`
- 时长：`4-12 秒`
- 音频：支持

## 3. 请求核心字段

- `input.content[]`
  - `text`
  - `image_url`
  - `draft_task`
- `parameters.generate_audio`
- `parameters.draft`
- `parameters.resolution`
- `parameters.ratio`
- `parameters.duration`
- `parameters.camera_fixed`
- `parameters.watermark`
- `parameters.service_tier`

## 4. 当前程序对照

- 模式标签只应显示支持的项
- 比例里应支持 `auto`
- 时长应限制在 `4-12`
- 音频默认开启更合理，但用户可以切换

## 5. 价格

- 在线推理 + 有声：`16 元 / 百万 tokens`
- 在线推理 + 无声：`8 元 / 百万 tokens`
- 离线推理 + 有声：`8 元 / 百万 tokens`
- 离线推理 + 无声：`4 元 / 百万 tokens`

## 6. 对照结论

- 这是你当前视频节点里最适合做“高级主模型”的候选之一
- 参数最丰富，适合做完整面板
