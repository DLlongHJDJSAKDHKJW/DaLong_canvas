# Kling v3

## 1. 模型定位

- 类型：统一视频模型
- 模型名：`kling-v3`
- 适合：T2V / I2V / 运动控制 / 多镜头

## 2. 支持能力

- 模式：`text-to-video` / `image-to-video` / `first-last-frame` / `reference-all`
- 比例：`16:9` / `9:16` / `1:1`
- 清晰度：`720P` / `1080P`
- 时长：`3-15 秒`
- 音频：支持

## 3. 请求核心字段

- `parameters.kling_v3_type`
- `input.prompt`
- `input.negative_prompt`
- `parameters.mode`
- `parameters.aspect_ratio`
- `parameters.duration`
- `parameters.sound`
- `parameters.multi_shot`
- `parameters.multi_prompt`
- `parameters.image`
- `parameters.image_tail`
- `input.video_url`
- `parameters.character_orientation`

## 4. 当前程序对照

- 建议强制显式指定 `kling_v3_type`
- 不要靠隐式推导
- 支持音频时，喇叭默认开启

## 5. 价格

- AstraFlow 计费页暂未单独抓到 `kling-v3` 明确单价
- 目前建议显示：`价格待确认`

## 6. 对照结论

- 这是最适合做统一高级视频面板的模型之一
- 功能覆盖最全
