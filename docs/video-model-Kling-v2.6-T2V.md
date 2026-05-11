# Kling v2.6 T2V

## 1. 模型定位

- 类型：文生视频
- 模型名：`kling-v2-6`
- 适合：老 Kling 文生视频

## 2. 支持能力

- 模式：`text-to-video`
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

## 4. 当前程序对照

- 不应显示图生视频、首尾帧等模式
- 时长只给 5 秒 / 10 秒
- 音频开关禁用

## 5. 价格

- 5 秒无声：`2.5 元`
- 10 秒无声：`5 元`

## 6. 对照结论

- 这是老版本 T2V
- 适合做最基础兼容，但不适合作为主力统一节点
