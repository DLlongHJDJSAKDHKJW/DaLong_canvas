# doubao-seedance-2.0-260128

## 1. 模型定位

- 类型：文图生视频
- 模型名：`doubao-seedance-2-0-260128`
- 适合：更完整的多模态视频生成

## 2. 支持能力

- 模式：`text-to-video` / `reference-all` / `image-to-video` / `first-last-frame` / `image-reference`
- 比例：`auto` / `21:9` / `16:9` / `4:3` / `1:1` / `3:4` / `9:16`
- 清晰度：`480P` / `720P` / `1080P`
- 时长：`4-15 秒`
- 音频：支持

## 3. 请求核心字段

- `input.content[]`
  - `text`
  - `image_url`
  - `draft_task`
  - `video_url`
  - `audio_url`
- `parameters.generate_audio`
- `parameters.resolution`
- `parameters.ratio`
- `parameters.duration`
- `parameters.camera_fixed`
- `parameters.watermark`

## 4. 当前程序对照

- `Kling-v2.6` 这类老模型不应共用 Seedance 2.0 的完整能力
- 音频开关可以默认开启
- 参考视频/参考音频入口只在它支持时显示

## 5. 价格

- AstraFlow 计费页暂未看到明确单价
- 建议前端显示：`价格待确认`

## 6. 对照结论

- 它比 1.5 Pro 更适合做统一高级视频节点
- 适合多模态场景
