# HappyHorse 1.0 R2V

## 1. 模型定位

- 类型：参考图生视频
- 模型名：`happyhorse-1.0-r2v`
- 适合：主体 + 参考图协同生成

## 2. 支持能力

- 模式：`reference-all` / `image-reference`
- 比例：`16:9` / `9:16` / `1:1`
- 清晰度：`720P` / `1080P`
- 时长：`3-15 秒`
- 音频：不支持

## 3. 请求核心字段

- `input.prompt` 必填
- `input.images` 必填，`1-9` 张
- 可用 `character1`、`character2` 指代图序
- `parameters.resolution`
- `parameters.duration`
- `parameters.watermark`
- `parameters.seed`

## 4. 当前程序对照

- 只显示：`全能参考`、`图片参考`
- 其余模式不应出现
- 音频开关禁用

## 5. 价格

- AstraFlow 计费页暂未看到明确单价
- 建议前端显示：`价格待确认`

## 6. 对照结论

- 这是偏“参考图控制”的模型
- 不要把它当成纯文生视频模型
