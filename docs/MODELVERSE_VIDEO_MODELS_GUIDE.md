# ModelVerse 视频模型接入说明

本文汇总以下 10 个 AstraFlow / ModelVerse 视频模型文档，并结合当前项目的实现方式，整理成一份更适合开发落地的说明：

- HappyHorse-1.0-T2V
- HappyHorse-1.0-I2V
- HappyHorse-1.0-R2V
- HappyHorse-1.0-Video-Edit
- doubao-seedance-1-5-pro-251215
- doubao-seedance-2-0-260128
- Kling-v3
- Kling-O3
- Kling-v2.6-I2V
- Kling-v2.6-T2V

说明目标：

- 讲清楚每个模型适合做什么
- 讲清楚请求体到底怎么拼
- 讲清楚在当前项目里应该怎么映射成视频节点配置
- 讲清楚哪些参数可以统一，哪些必须按模型分流

官方文档来源：

- [HappyHorse-1.0-T2V](https://astraflow.ucloud.cn/docs/modelverse/api_doc/video_api/HappyHorse-1.0-T2V)
- [HappyHorse-1.0-I2V](https://astraflow.ucloud.cn/docs/modelverse/api_doc/video_api/HappyHorse-1.0-I2V)
- [HappyHorse-1.0-R2V](https://astraflow.ucloud.cn/docs/modelverse/api_doc/video_api/HappyHorse-1.0-R2V)
- [HappyHorse-1.0-Video-Edit](https://astraflow.ucloud.cn/docs/modelverse/api_doc/video_api/HappyHorse-1.0-Video-Edit)
- [doubao-seedance-1-5-pro-251215](https://astraflow.ucloud.cn/docs/modelverse/api_doc/video_api/doubao-seedance-1-5-pro-251215)
- [doubao-seedance-2-0-260128](https://astraflow.ucloud.cn/docs/modelverse/api_doc/video_api/doubao-seedance-2-0-260128)
- [Kling-v3](https://astraflow.ucloud.cn/docs/modelverse/api_doc/video_api/Kling-v3)
- [Kling-O3](https://astraflow.ucloud.cn/docs/modelverse/api_doc/video_api/Kling-O3)
- [Kling-v2.6-I2V](https://astraflow.ucloud.cn/docs/modelverse/api_doc/video_api/Kling-v2.6-I2V)
- [Kling-v2.6-T2V](https://astraflow.ucloud.cn/docs/modelverse/api_doc/video_api/Kling-v2.6-T2V)

## 1. 总体结论

这 10 个模型并不是同一种接口风格，大致可以分成 4 类：

1. HappyHorse 系列
   - 接口最简单
   - 适合快速做基础文生视频、图生视频、参考图视频、视频编辑
   - 参数少，前端接入成本低

2. Seedance 系列
   - 能力更强，支持文图混合、首尾帧、参考视频、参考音频、样片模式
   - 更适合做你现在这个“多模式视频节点”
   - 参数复杂，必须做后端参数组装

3. Kling v2.6
   - 老一代 Kling 视频模型
   - 分成 T2V 和 I2V 两篇文档，但模型名其实统一是 `kling-v2-6`
   - 时长和比例限制更死，不支持声音

4. Kling v3 / Kling Omni
   - 是目前这组里最灵活的一档
   - `kling-v3` 可以自动判断 T2V / I2V / motion_control
   - 还支持多镜头
   - 适合做高级视频节点

## 2. 所有模型的共性

这些视频模型几乎都走异步任务接口：

- 提交任务：`POST https://api.modelverse.cn/v1/tasks/submit`
- 查询状态：`GET https://api.modelverse.cn/v1/tasks/status?task_id=<task_id>`

常见返回状态：

- `Pending`
- `Running`
- `Success`
- `Failure`
- `Expired`，只在部分模型出现

前端正确流程应该统一成：

1. 前端把节点配置整理成模型请求体
2. 后端发起 `tasks/submit`
3. 后端返回 `task_id`
4. 前端进入轮询
5. 查到 `Success` 后取 `output.urls[0]`
6. 把视频 URL 写回节点

## 3. 模型能力总览

### 3.1 HappyHorse 系列

#### HappyHorse-1.0-T2V

- 类型：文生视频
- 模型名：`happyhorse-1.0-t2v`
- 输入重点：
  - `input.prompt` 必填
  - `parameters.resolution`：`720P` / `1080P`
  - `parameters.ratio`：`16:9` / `9:16` / `1:1`
  - `parameters.duration`：`3-15`
- 适合：
  - 纯提示词生成
  - 前端最简单的“文生视频”模式

#### HappyHorse-1.0-I2V

- 类型：图生视频
- 模型名：`happyhorse-1.0-i2v`
- 输入重点：
  - `input.img_url` 必填
  - `input.prompt` 可选
  - 文档说明兼容：
    - `input.first_frame_url`
    - `input.images[0]`
- 适合：
  - 只有一张首帧图，想让图片动起来

#### HappyHorse-1.0-R2V

- 类型：参考图生视频
- 模型名：`happyhorse-1.0-r2v`
- 输入重点：
  - `input.prompt` 必填
  - `input.images` 必填，支持 `1-9` 张
  - prompt 可写 `character1`、`character2` 指代参考图
- 适合：
  - 人物图 + 商品图
  - 主体和道具分离控制
  - 轻量版“参考图视频”

#### HappyHorse-1.0-Video-Edit

- 类型：视频编辑
- 模型名：`happyhorse-1.0-video-edit`
- 输入重点：
  - `input.video_url` 必填
  - `input.prompt` 必填
  - `input.images` 可选，最多 5 张
  - `parameters.audio_setting`：`auto` / `origin`
- 适合：
  - 保留原视频结构，做服装替换、风格替换、局部改造

### 3.2 Seedance 系列

#### doubao-seedance-1-5-pro-251215

- 类型：文图生视频
- 模型名：`doubao-seedance-1-5-pro-251215`
- 核心结构不是简单 `prompt + image`
- 它用的是：

```json
{
  "model": "doubao-seedance-1-5-pro-251215",
  "input": {
    "content": []
  },
  "parameters": {}
}
```

`input.content` 支持三类对象：

- `text`
- `image_url`
- `draft_task`

重点能力：

- `generate_audio`
- `draft` 样片模式
- `resolution`：`480p` / `720p` / `1080p`
- `ratio`：`16:9` / `4:3` / `1:1` / `3:4` / `9:16` / `21:9` / `adaptive`
- `duration`：`4-12`
- `camera_fixed`
- `service_tier`：`default` / `flex`

适合：

- 首尾帧视频
- 单图或双图视频
- 需要样片预览的场景

#### doubao-seedance-2-0-260128

- 类型：文图生视频
- 模型名：`doubao-seedance-2-0-260128`
- 接口结构与 1.5 Pro 基本一致
- 但 `input.content` 更强，支持五类对象：
  - `text`
  - `image_url`
  - `draft_task`
  - `video_url`
  - `audio_url`

比 1.5 Pro 多出来的能力：

- 参考视频：`reference_video`
- 参考音频：`reference_audio`
- 参考图角色：`reference_image`
- 时长提升到：`4-15`

适合：

- 图生视频
- 首尾帧视频
- 图片参考
- 参考视频驱动
- 参考音频驱动

这是当前这批模型里，最适合做你项目视频节点主力模型之一。

### 3.3 Kling v2.6

#### Kling-v2.6-T2V

- 文档标题：`Kling/v2.6-T2V`
- 实际模型名：`kling-v2-6`
- 类型：文生视频
- 输入重点：
  - `input.prompt` 必填
  - `parameters.mode`：`std` / `pro`
  - 但文档写了目前只支持 `pro`
  - `parameters.aspect_ratio`：`16:9` / `9:16` / `1:1`
  - `parameters.duration`：`5` / `10`

限制：

- 不支持有声视频

#### Kling-v2.6-I2V

- 文档标题：`Kling/v2.6-I2V`
- 实际模型名：`kling-v2-6`
- 类型：图生视频
- 输入重点：
  - `input.prompt` 必填
  - `parameters.image` 必填
  - `parameters.image_tail` 可选
- 限制：
  - 不支持有声视频
  - 时长只有 `5` / `10`

适合：

- 想继续兼容老 Kling 接口
- 但如果不是强依赖旧模型，不建议把它当主力

### 3.4 Kling v3 / Kling Omni

#### Kling-v3

- 模型名：`kling-v3`
- 统一支持三种模式：
  - `t2v`
  - `i2v`
  - `motion_control`

支持两种路由方式：

1. 显式指定：

```json
"parameters": {
  "kling_v3_type": "t2v"
}
```

2. 隐式推导：

- 有 `input.video_url` -> `motion_control`
- 有首帧图 -> `i2v`
- 否则 -> `t2v`

强烈建议你项目里统一走显式指定，不要依赖隐式推导。

核心能力：

- 文生视频
- 图生视频
- 首尾帧
- 运动控制
- 多镜头
- 可开声音

主要参数：

- `parameters.mode`：`std` / `pro`
- `parameters.aspect_ratio`：`16:9` / `9:16` / `1:1`
- `parameters.duration`
  - `t2v / i2v`：`3-15`
  - `motion_control`：`5` / `10`
- `parameters.image`
- `parameters.image_tail`
- `parameters.sound`
- `parameters.multi_shot`
- `parameters.multi_prompt`
- `parameters.character_orientation`
- `parameters.keep_original_sound`

适合：

- 高级视频节点
- 图生视频
- 多镜头
- 动作迁移

#### Kling-O3

这里有一个很重要的异常：

- 你给的链接是 `Kling-O3`
- 但页面实际打开内容是 `Kling/V3-Omni`
- 模型名是 `kling-v3-omni`

也就是说，目前这个链接和模型名并不一致，至少从页面展示上看是这样。

`kling-v3-omni` 的特点：

- 支持文本、图像、视频多模态输入
- 支持视频编辑
- 支持多镜头
- 支持首尾帧
- 支持引用图片、视频

主要参数：

- `parameters.mode`
- `parameters.aspect_ratio`
- `parameters.duration`
- `parameters.sound`
- `parameters.multi_shot`
- `parameters.image_list`
- `parameters.video_list`

它的 `image_list` / `video_list` 设计，比 `kling-v3` 更适合做统一多模态节点。

## 4. 最推荐的前端模式映射

结合这些文档，你现在视频节点最合理的模式映射应该是：

### 文生视频

优先模型：

- `happyhorse-1.0-t2v`
- `kling-v2-6`
- `kling-v3`

更推荐：

- `kling-v3`
- `doubao-seedance-2-0-260128`

### 图生视频

优先模型：

- `happyhorse-1.0-i2v`
- `kling-v2-6`
- `kling-v3`
- `doubao-seedance-1-5-pro-251215`
- `doubao-seedance-2-0-260128`

### 全能参考

优先模型：

- `happyhorse-1.0-r2v`
- `doubao-seedance-2-0-260128`
- `kling-v3-omni`

### 首尾帧

优先模型：

- `kling-v3`
- `kling-v2-6`
- `doubao-seedance-1-5-pro-251215`
- `doubao-seedance-2-0-260128`

### 视频编辑

优先模型：

- `happyhorse-1.0-video-edit`
- `kling-v3-omni`

## 5. 当前项目里建议怎样抽象

你项目里已经有：

- [src/config/models.js](E:/AIbiancheng/DaLong_canvas/huobao-canvas/src/config/models.js)
- [src/api/video.js](E:/AIbiancheng/DaLong_canvas/huobao-canvas/src/api/video.js)
- [src/components/nodes/VideoNode.vue](E:/AIbiancheng/DaLong_canvas/huobao-canvas/src/components/nodes/VideoNode.vue)

建议不要让前端直接按“每个模型一套请求体”去拼。

应该这样抽：

### 第 1 层：前端统一节点状态

统一保存：

- `videoMode`
- `videoPrompt`
- `videoModel`
- `videoRatio`
- `videoDuration`
- `videoResolution`
- `videoAudio`
- `firstFrame`
- `lastFrame`
- `referenceImages`
- `referenceVideo`
- `referenceAudio`
- `sourceVideo`

### 第 2 层：模型适配器

新增一个适配层，比如：

- `buildHappyHorseT2VPayload(nodeData)`
- `buildHappyHorseI2VPayload(nodeData)`
- `buildHappyHorseR2VPayload(nodeData)`
- `buildHappyHorseVideoEditPayload(nodeData)`
- `buildSeedance15Payload(nodeData)`
- `buildSeedance20Payload(nodeData)`
- `buildKlingV3Payload(nodeData)`
- `buildKlingV26T2VPayload(nodeData)`
- `buildKlingV26I2VPayload(nodeData)`

### 第 3 层：统一任务提交

最终都返回统一结构：

```js
{
  endpoint: 'https://api.modelverse.cn/v1/tasks/submit',
  method: 'POST',
  body: {}
}
```

### 第 4 层：统一轮询状态

轮询状态接口统一：

```js
GET /v1/tasks/status?task_id=xxx
```

所以项目里最适合改造的是 [src/api/video.js](E:/AIbiancheng/DaLong_canvas/huobao-canvas/src/api/video.js)，而不是把每个模型硬塞到节点组件里。

## 6. 推荐的统一前端参数映射

### ratio 映射

前端统一：

- `16x9`
- `4x3`
- `1x1`
- `3x4`
- `9x16`
- `21x9`
- `auto`

发请求前转换：

- `16x9` -> `16:9`
- `4x3` -> `4:3`
- `1x1` -> `1:1`
- `3x4` -> `3:4`
- `9x16` -> `9:16`
- `21x9` -> `21:9`
- `auto` -> `adaptive`，只对 Seedance 这类支持自适应比例的模型生效

### resolution 映射

前端统一：

- `480P`
- `720P`
- `1080P`

发请求时注意：

- HappyHorse 用 `720P` / `1080P`
- Seedance 用文档里的 `480p` / `720p` / `1080p`
- Kling 不用单独 resolution，而是 `mode`
  - `std` 约等于 720P
  - `pro` 约等于 1080P

### duration 映射

前端现在已经改成 `3-15`

但真正发请求前必须按模型裁剪：

- HappyHorse：`3-15`
- Seedance 1.5：`4-12`
- Seedance 2.0：`4-15`
- Kling v2.6：只能 `5` 或 `10`
- Kling v3：
  - `t2v / i2v`：`3-15`
  - `motion_control`：`5` 或 `10`

所以后端或适配层必须做合法化：

```js
duration = clampOrNormalizeByModel(modelKey, duration, mode)
```

## 7. 各模型最小可用请求示例

### HappyHorse 文生视频

```json
{
  "model": "happyhorse-1.0-t2v",
  "input": {
    "prompt": "一只白猫在城市屋顶跳跃"
  },
  "parameters": {
    "resolution": "720P",
    "ratio": "16:9",
    "duration": 5
  }
}
```

### HappyHorse 图生视频

```json
{
  "model": "happyhorse-1.0-i2v",
  "input": {
    "prompt": "角色缓慢转身看向镜头",
    "img_url": "https://example.com/hero.png"
  },
  "parameters": {
    "resolution": "720P",
    "duration": 5
  }
}
```

### Seedance 2.0 首帧图 + 参考视频 + 参考音频

```json
{
  "model": "doubao-seedance-2-0-260128",
  "input": {
    "content": [
      {
        "type": "text",
        "text": "让角色随着音乐向前走并挥手"
      },
      {
        "type": "image_url",
        "image_url": {
          "url": "https://example.com/first-frame.png"
        },
        "role": "first_frame"
      },
      {
        "type": "video_url",
        "video_url": {
          "url": "https://example.com/reference-motion.mp4"
        },
        "role": "reference_video"
      },
      {
        "type": "audio_url",
        "audio_url": {
          "url": "https://example.com/music.mp3"
        },
        "role": "reference_audio"
      }
    ]
  },
  "parameters": {
    "generate_audio": true,
    "resolution": "720p",
    "ratio": "16:9",
    "duration": 10,
    "camera_fixed": false,
    "watermark": false
  }
}
```

### Kling v3 图生视频

```json
{
  "model": "kling-v3",
  "input": {
    "prompt": "画中角色自然呼吸并缓慢抬头"
  },
  "parameters": {
    "kling_v3_type": "i2v",
    "mode": "pro",
    "duration": 5,
    "image": "https://example.com/first-frame.jpg"
  }
}
```

### Kling v3 运动控制

```json
{
  "model": "kling-v3",
  "input": {
    "img_url": "https://example.com/character.jpg",
    "video_url": "https://example.com/motion.mp4",
    "prompt": "角色按参考动作跳舞"
  },
  "parameters": {
    "kling_v3_type": "motion_control",
    "duration": 5,
    "aspect_ratio": "16:9",
    "character_orientation": "image",
    "mode": "std"
  }
}
```

## 8. 当前项目最值得马上修的地方

结合当前代码，建议优先做这几件事：

1. 修正 [src/config/models.js](E:/AIbiancheng/DaLong_canvas/huobao-canvas/src/config/models.js) 中每个模型的真实能力边界
   - 现在很多模型都被统一写成相同 ratio / duration
   - 实际并不对

2. 在 [src/api/video.js](E:/AIbiancheng/DaLong_canvas/huobao-canvas/src/api/video.js) 新增模型适配函数
   - 不要让 UI 组件自己拼最终请求体

3. 在视频节点中区分“前端展示时长范围”和“模型真实可用时长”
   - 比如 UI 可以给用户 `3-15`
   - 但提交前按模型规范矫正

4. 增加 `videoMode -> payload builder` 映射
   - 文生视频
   - 图生视频
   - 全能参考
   - 首尾帧
   - 视频编辑

5. 单独处理 `Kling-O3`
   - 当前文档页实际展示 `Kling/V3-Omni`
   - 在正式接入前，建议再次人工确认这两个是不是 AstraFlow 后台路由命名不一致

## 9. 最终推荐

如果你现在要在这个项目里优先把视频节点做稳，建议这样选主力：

- 基础文生视频：
  - `HappyHorse-1.0-T2V`
  - `Kling-v3`

- 基础图生视频：
  - `HappyHorse-1.0-I2V`
  - `Kling-v3`

- 高级参考视频：
  - `doubao-seedance-2-0-260128`
  - `kling-v3-omni`

- 视频编辑：
  - `HappyHorse-1.0-Video-Edit`
  - `kling-v3-omni`

如果只选一个最适合做“统一高级视频节点”的模型：

- 首选：`doubao-seedance-2-0-260128`
- 次选：`kling-v3`

原因：

- 输入结构更丰富
- 更适合做多模式视频面板
- 能承接首帧、尾帧、参考图、参考视频、参考音频这些高级交互

## 10. 价格与单次成本估算

价格来源：

- [AstraFlow / ModelVerse 计费说明](https://astraflow.ucloud.cn/docs/modelverse/price)

这一节只写我已经从当前官方计费页确认到的信息。

如果当前官方计费页没有明确列出某个模型价格，我会明确写“暂未查到”，不做主观猜测。

### 10.1 已明确查到价格的模型

#### doubao-seedance-1-5-pro-251215

计费方式：

- tokens 后付费

官方价格：

- 在线推理 + 有声视频：`16 元 / 百万 tokens`
- 在线推理 + 无声视频：`8 元 / 百万 tokens`
- 离线推理 + 有声视频：`8 元 / 百万 tokens`
- 离线推理 + 无声视频：`4 元 / 百万 tokens`

文档中的一次成功示例里，`completion_tokens = 108900`

按这个量级估算单次成本：

- 在线无声：约 `0.87 元/次`
- 在线有声：约 `1.74 元/次`
- 离线无声：约 `0.44 元/次`
- 离线有声：约 `0.87 元/次`

估算公式：

```text
单次费用 = completion_tokens / 1,000,000 × 单价
```

注意：

- 这是 token 计费，不是固定按秒计费
- 真正价格取决于返回的 `usage.completion_tokens`

#### kling-v2-6

计费方式：

- 按秒计费

官方价格：

- `pro` + 5 秒 + 无声：`2.5 元 / 5秒`
- `pro` + 10 秒 + 无声：`5 元 / 10秒`
- `pro` + 5 秒 + 有声：`5 元 / 5秒`
- `pro` + 10 秒 + 有声：`10 元 / 10秒`

可以近似理解为：

- 无声：`0.5 元/秒`
- 有声：`1 元/秒`

但这里有一个冲突：

- `Kling v2.6` 文档页里写了：`v2.6 不支持有声视频`
- 价格页里又列出了“有声”的价格

所以开发上更稳的做法是：

- 先按无声能力接入
- 有声价格只作为价格页信息记录，不直接开放 UI 能力

#### kling-v3-omni

计费方式：

- 按秒计费

官方价格：

- `std` + 无参考视频 + 无声：`0.6 元/秒`
- `std` + 无参考视频 + 有声：`0.8 元/秒`
- `std` + 有参考视频 + 无声：`0.9 元/秒`
- `pro` + 无参考视频 + 无声：`0.8 元/秒`
- `pro` + 无参考视频 + 有声：`1 元/秒`
- `pro` + 有参考视频 + 无声：`1.2 元/秒`

单次成本示例：

- 5 秒 `std 无参考 无声`：`3 元`
- 5 秒 `pro 无参考 无声`：`4 元`
- 5 秒 `pro 无参考 有声`：`5 元`
- 5 秒 `pro 有参考 无声`：`6 元`

- 10 秒 `std 无参考 无声`：`6 元`
- 10 秒 `pro 无参考 无声`：`8 元`
- 10 秒 `pro 无参考 有声`：`10 元`
- 10 秒 `pro 有参考 无声`：`12 元`

### 10.2 当前价格页暂未明确查到的模型

以下模型，我在当前官方价格页里没有找到清晰、可直接确认的单价项：

- `HappyHorse-1.0-T2V`
- `HappyHorse-1.0-I2V`
- `HappyHorse-1.0-R2V`
- `HappyHorse-1.0-Video-Edit`
- `doubao-seedance-2-0-260128`
- `kling-v3`

这几项当前建议：

- 文档中先标记为 `价格待补`
- 不要在前端写死费用数字
- 如果要做 UI 价格提示，可以先显示：
  - `价格以官方计费页为准`
  - 或 `提交后按实际 usage 结算`

### 10.3 价格展示建议

如果你后面要在视频节点下方显示“预计费用”，建议不要统一写死成一个算法。

更合理的方式是：

1. 对“官方有明确单价”的模型直接估算
2. 对 token 计费模型按官方公式估算
3. 对“当前未查到明确价格”的模型显示占位文案

推荐的前端展示逻辑：

- `Seedance 1.5 Pro`
  - 显示：`按 tokens 计费，提交后按实际 usage 结算`
  - 如果后端拿到了 `completion_tokens`，再显示精确费用

- `kling-v2-6`
  - 显示固定费用：
    - `5秒 ≈ 2.5元`
    - `10秒 ≈ 5元`

- `kling-v3-omni`
  - 根据：
    - `std / pro`
    - 是否有参考视频
    - 是否有声
    - duration
  - 实时算出估价

### 10.4 当前项目里如何接入价格提示

最适合加的位置：

- [src/components/nodes/VideoNode.vue](E:/AIbiancheng/DaLong_canvas/huobao-canvas/src/components/nodes/VideoNode.vue)

但不要把价格规则写死在组件里。

建议新增一个价格计算层，比如：

- `src/config/videoPricing.js`
- 或 `src/utils/videoPricing.js`

建议暴露统一方法：

```js
estimateVideoCost({
  model,
  duration,
  resolution,
  ratio,
  hasReferenceVideo,
  hasAudio,
  mode
})
```

返回格式建议：

```js
{
  type: 'fixed' | 'token' | 'unknown',
  label: '约 4 元',
  value: 4,
  note: '按秒估算'
}
```

对于当前价格未明确的模型，可以返回：

```js
{
  type: 'unknown',
  label: '价格待确认',
  value: null,
  note: '以官方计费页为准'
}
```
