/**
 * Image API | 图片生成 API
 * 支持两种格式：
 *   - Gemini 原生格式（Nano Banana 系列）: /v1beta/models/{model}:generateContent + x-goog-api-key
 *   - OpenAI 兼容格式（GPT Image 系列）:  /v1/images/generations + Authorization: Bearer
 */

const API_KEY_STORAGE = 'modelverse-api-key'
const BASE_URL_STORAGE = 'modelverse-base-url'
const DEFAULT_BASE = 'https://api.modelverse.cn'

// Gemini 比例格式
const RATIO_MAP = {
  '16x9': '16:9',
  '4x3':  '4:3',
  '3x2':  '3:2',
  '1x1':  '1:1',
  '2x3':  '2:3',
  '3x4':  '3:4',
  '9x16': '9:16',
}

// Gemini imageSize
const RESOLUTION_MAP = {
  '0.5K': '512',
  '1K':   '1K',
  '2K':   '2K',
  '4K':   '2K',
}

// OpenAI size 格式
const OPENAI_SIZE_MAP = {
  '16x9': '1792x1024',
  '4x3':  '1365x1024',
  '3x2':  '1536x1024',
  '1x1':  '1024x1024',
  '2x3':  '1024x1536',
  '3x4':  '1024x1365',
  '9x16': '1024x1792',
}

// Seedream 需要更高的最小像素
const SEEDREAM_SIZE_MAP = {
  '16x9': '2560x1440',
  '4x3':  '2304x1728',
  '3x2':  '2560x1707',
  '1x1':  '2048x2048',
  '2x3':  '1728x2304',
  '3x4':  '1728x2304',
  '9x16': '1440x2560',
}

const getApiKey = () => localStorage.getItem(API_KEY_STORAGE) || ''

const getBaseUrl = () => {
  const stored = localStorage.getItem(BASE_URL_STORAGE) || ''
  try {
    const url = new URL(stored || DEFAULT_BASE)
    return url.origin
  } catch {
    return DEFAULT_BASE
  }
}

const isGeminiModel = (model) =>
  model?.startsWith('gemini-') || model?.includes('flash-image') || model?.includes('pro-image')

// Gemini 原生格式请求
const generateGemini = async (data) => {
  const apiKey = getApiKey()
  const base = getBaseUrl()
  const model = data.model
  const url = `${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`

  const aspectRatio = RATIO_MAP[data.size] || '1:1'
  const imageSize = RESOLUTION_MAP[data.resolution] || '1K'

  const referenceImages = Array.isArray(data.images) ? data.images : (data.image ? [data.image] : [])
  const hasSelf = referenceImages.some(img => img?.isSelf)
  const externalCount = referenceImages.filter(img => !img?.isSelf).length

  const parts = []

  // 收集遮罩图片
  let maskImageData = null

  // 为每张参考图插入身份说明 + 图片本体，让模型清楚每张图的角色
  referenceImages.forEach((image, index) => {
    const raw = typeof image === 'string' ? image : image?.data || ''
    const label = image?.label || `图片${index + 1}`
    const identity = image?.role === 'edit_mask'
      ? `${label}（编辑遮罩 / EDIT MASK — 白色区域表示唯一允许编辑或重建的区域，黑色区域表示严格锁定、必须保持完全不变）`
      : image?.isSelf
      ? `${label}（当前图 / 正在编辑的原图 / BASE IMAGE — 用户的指令默认只作用在遮罩指定区域，这张图中所有未被遮罩覆盖的背景、构图、环境、文字、主体和未提及元素都必须完整保留）`
      : `${label}（参考图 / REFERENCE — 仅从这张图中提取用户指令提到的元素，它的背景、场景、标题等其他内容一律不要带入结果图）`

    parts.push({ text: identity })

    if (typeof raw === 'string' && raw.startsWith('data:')) {
      const [meta, base64 = ''] = raw.split(',')
      const mimeType = meta.match(/data:(.*?);base64/)?.[1] || 'image/png'
      parts.push({ inlineData: { mimeType, data: base64 } })
    } else if (image?.inlineData) {
      parts.push({ inlineData: image.inlineData })
    }

    // 提取遮罩（从 isSelf 图片获取）
    if (image?.isSelf && image?.mask && image.mask.startsWith('data:')) {
      const [maskMeta, maskBase64 = ''] = image.mask.split(',')
      const maskMime = maskMeta.match(/data:(.*?);base64/)?.[1] || 'image/png'
      maskImageData = { mimeType: maskMime, data: maskBase64 }
    }
  })

  // 最后附上用户指令 + 全局约束
  const guard = hasSelf && externalCount > 0
    ? '严格要求：以当前图为编辑底版，只按指令从参考图中拷贝指定元素（角色/物体/风格），绝不要使用参考图的背景、场景、标题或其它未被指令点名的部分。保持当前图的画面构图、镜头、光影、所有未提及的元素不变。'
    : ''

  parts.push({ text: `${guard}\n\n用户指令：${data.prompt || ''}`.trim() })

  const payload = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio,
        imageSize,
        ...(maskImageData ? { maskImage: maskImageData } : {}),
      },
    },
  }

  console.log('[Image API] Gemini POST', url, { aspectRatio, imageSize, model, refCount: referenceImages.length })

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let msg = `HTTP ${response.status}`
    try { const err = await response.json(); msg = err?.error?.message || err?.message || msg } catch {}
    const error = new Error(msg)
    error.response = { status: response.status, data: { message: msg } }
    throw error
  }

  return response.json()
}

// OpenAI 兼容格式请求（GPT Image 系列）
const isSeedreamModel = (model) =>
  model === 'doubao-seedream-4.5' || model === 'doubao-seedream-5-0-260128'

const generateOpenAI = async (data) => {
  const apiKey = getApiKey()
  const base = getBaseUrl()
  const url = `${base}/v1/images/generations`

  const size = isSeedreamModel(data.model)
    ? (SEEDREAM_SIZE_MAP[data.size] || '2048x2048')
    : (OPENAI_SIZE_MAP[data.size] || '1024x1024')
  const payload = {
    model: data.model,
    prompt: data.prompt || '',
    size,
    n: data.n || 1,
  }

  const referenceImages = Array.isArray(data.images) ? data.images : (data.image ? [data.image] : [])
  if (referenceImages.length > 0 && isSeedreamModel(data.model)) {
    payload.images = referenceImages
      .map((img) => {
        if (typeof img === 'string') return img
        return img?.data || img?.url || ''
      })
      .filter(Boolean)
  }

  // GPT Image 2 支持 quality / output_format / output_compression
  if (data.model?.startsWith('gpt-image-')) {
    payload.quality = 'high'
    payload.output_format = 'png'
    payload.output_compression = 100
  }

  // Seedream 支持更多生成参数，但保留兼容字段即可
  if (isSeedreamModel(data.model)) {
    if (data.response_format) payload.response_format = data.response_format
    if (typeof data.watermark === 'boolean') payload.watermark = data.watermark
    if (data.output_format) payload.output_format = data.output_format
    if (data.sequential_image_generation) payload.sequential_image_generation = data.sequential_image_generation
    if (data.sequential_image_generation_options) {
      payload.sequential_image_generation_options = data.sequential_image_generation_options
    }
    if (Array.isArray(data.tools) && data.tools.length > 0) {
      payload.tools = data.tools
    }
    if (data.optimize_prompt_options) {
      payload.optimize_prompt_options = data.optimize_prompt_options
    }
  }

  console.log('[Image API] OpenAI POST', url, payload)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let msg = `HTTP ${response.status}`
    try { const err = await response.json(); msg = err?.error?.message || err?.message || msg } catch {}
    const error = new Error(msg)
    error.response = { status: response.status, data: { message: msg } }
    throw error
  }

  const json = await response.json()
  const items = json.data || []
  return {
    candidates: items.map(item => ({
      content: {
        parts: [{
          inlineData: item.b64_json
            ? { mimeType: 'image/png', data: item.b64_json }
            : null,
          imageUrl: item.url || null,
        }]
      }
    }))
  }
}

const dataUrlToBlob = async (dataUrl) => {
  const response = await fetch(dataUrl)
  return response.blob()
}

const generateOpenAIEdit = async (data) => {
  const apiKey = getApiKey()
  const base = getBaseUrl()
  const url = `${base}/v1/images/edits`

  const form = new FormData()
  form.append('model', data.model)
  form.append('prompt', data.prompt || '')
  form.append('size', OPENAI_SIZE_MAP[data.size] || '1024x1024')

  const sourceImage = Array.isArray(data.images) ? data.images[0] : data.image
  const raw = typeof sourceImage === 'string' ? sourceImage : sourceImage?.data || ''
  if (!raw || !raw.startsWith('data:')) {
    throw new Error('抠图失败：缺少可编辑的原图数据')
  }

  const imageBlob = await dataUrlToBlob(raw)
  form.append('image', imageBlob, 'source.png')

  console.log('[Image API] OpenAI Edit POST', url, {
    model: data.model,
    size: OPENAI_SIZE_MAP[data.size] || '1024x1024'
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: form,
  })

  if (!response.ok) {
    let msg = `HTTP ${response.status}`
    try { const err = await response.json(); msg = err?.error?.message || err?.message || msg } catch {}
    const error = new Error(msg)
    error.response = { status: response.status, data: { message: msg } }
    throw error
  }

  const json = await response.json()
  const items = json.data || []
  return {
    candidates: items.map(item => ({
      content: {
        parts: [{
          inlineData: item.b64_json
            ? { mimeType: 'image/png', data: item.b64_json }
            : null,
          imageUrl: item.url || null,
        }]
      }
    }))
  }
}

// 统一入口
export const generateImage = async (data) => {
  if (data.mode === 'edit') {
    return generateOpenAIEdit(data)
  }
  if (isGeminiModel(data.model)) {
    return generateGemini(data)
  }
  return generateOpenAI(data)
}
