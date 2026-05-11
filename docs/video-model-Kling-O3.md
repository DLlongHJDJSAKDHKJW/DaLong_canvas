# Kling O3

## 1. 模型定位

- 实际页面展示：`Kling/V3-Omni`
- 页面里对应模型名：`kling-v3-omni`

## 2. 支持能力

- 模式：`文生视频 / 图生视频 / 多模态 / 视频编辑`
- 比例：`16:9` / `9:16` / `1:1`
- 清晰度：`std` / `pro`
- 时长：`3-15 秒`
- 音频：支持

## 3. 请求核心字段

- `input.prompt`
- `input.negative_prompt`
- `parameters.mode`
- `parameters.aspect_ratio`
- `parameters.duration`
- `parameters.sound`
- `parameters.multi_shot`
- `parameters.image_list`
- `parameters.video_list`

## 4. 当前程序对照

- 如果你在 UI 里写 `Kling-O3`
- 实际要按 `kling-v3-omni` 的能力理解
- 有参考视频时，音频/时长限制要更严格

## 5. 价格

- 标准 `std` + 无参考视频 + 无声：`0.6 元/秒`
- 标准 `std` + 无参考视频 + 有声：`0.8 元/秒`
- 标准 `std` + 有参考视频 + 无声：`0.9 元/秒`
- 高品质 `pro` + 无参考视频 + 无声：`0.8 元/秒`
- 高品质 `pro` + 无参考视频 + 有声：`1 元/秒`
- 高品质 `pro` + 有参考视频 + 无声：`1.2 元/秒`

## 6. 对照结论

- 这个模型更偏多模态统一入口
- 如果你要统一视频节点，它很适合作为高级模式
