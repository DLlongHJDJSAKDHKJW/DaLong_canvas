/**
 * HD Skill | 高清放大技能
 * 对图片进行高清放大 / 超分辨率增强
 *
 * 可被 UI 直接调用，也可被右侧 Agent 智能调用
 *
 * @param {Object} params
 * @param {string} params.imageUrl       - 原图 URL（支持 data: / http / file:）
 * @param {string} params.model          - 模型 key，默认 gemini-3.1-flash-image-preview
 * @param {number} params.scale          - 放大倍数 2 | 4 | 6，默认 2
 * @param {string} params.size           - 宽高比 key，默认使用原图比例或 1x1
 * @param {Function} params.onProgress   - 进度回调 (可选)
 * @returns {Promise<{url: string, revisedPrompt?: string}>}
 */

import { generateImage } from '../api/image'

// Nano Banana 2 — 高清放大推荐模型
const HD_MODEL = 'gemini-3.1-flash-image-preview'

// 放大倍数 → 分辨率映射
const SCALE_TO_RESOLUTION = {
  2: '2K',
  4: '4K',
  6: '4K', // 6x 也用 4K（当前 API 上限）
}

// 放大倍数 → 提示词
const SCALE_TO_PROMPT = {
  2: '请将这张图片高清放大 2 倍：提升整体清晰度和细节丰富度，保持原图构图、色彩、光影完全不变，不添加新元素，不改变风格。输出为 2K 分辨率。',
  4: '请将这张图片超分辨率放大 4 倍：大幅提升清晰度和细节，保持原图构图、色彩、光影完全不变，不添加新元素，不改变风格。输出为 4K 分辨率。',
  6: '请将这张图片超分辨率放大 6 倍：极致提升清晰度与纹理细节，保持原图构图、色彩、光影完全不变，不添加新元素，不改变风格。输出为 4K 分辨率。',
}

export async function imageHD(params) {
  const {
    imageUrl,
    model = HD_MODEL,
    scale = 2,
    size,
    onProgress,
  } = params

  if (!imageUrl) {
    throw new Error('缺少原图 URL')
  }

  onProgress?.(10, '准备图片...')

  // 将图片转为 base64 payload
  const payload = await resolveImagePayload(imageUrl)
  if (!payload) {
    throw new Error('图片加载失败，无法读取图片数据')
  }

  onProgress?.(30, '正在请求高清增强...')

  // 调用生成 API
  const resolution = SCALE_TO_RESOLUTION[scale] || '2K'
  const prompt = SCALE_TO_PROMPT[scale] || SCALE_TO_PROMPT[2]

  // 构建参考图
  const images = [{
    data: payload,
    label: '原图',
    role: 'base_image',
    isSelf: true,
  }]

  const requestData = {
    model,
    prompt,
    size: size || '1x1',
    resolution,
    images,
    n: 1,
  }

  const response = await generateImage(requestData)
  const candidates = response?.candidates || []

  for (const candidate of candidates) {
    for (const part of (candidate?.content?.parts || [])) {
      if (part.inlineData?.data) {
        const url = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
        onProgress?.(90, '高清增强完成')
        return { url, revisedPrompt: '' }
      }
      if (part.imageUrl) {
        onProgress?.(90, '高清增强完成')
        return { url: part.imageUrl, revisedPrompt: '' }
      }
    }
  }

  // OpenAI 格式
  if (response?.data?.[0]?.url) {
    return { url: response.data[0].url, revisedPrompt: '' }
  }
  if (response?.data?.[0]?.b64_json) {
    return {
      url: `data:image/png;base64,${response.data[0].b64_json}`,
      revisedPrompt: '',
    }
  }

  throw new Error('API 未返回有效图片数据')
}

/**
 * 将图片 URL 转为 base64 data URI
 */
async function resolveImagePayload(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null

  // data: 直接返回
  if (imageUrl.startsWith('data:')) {
    return imageUrl
  }

  // http(s): 通过 fetch 获取
  if (imageUrl.startsWith('http')) {
    try {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch {
      // fallback: 当作远程 URL 直接传给 API
      return imageUrl
    }
  }

  // file: (Electron) 通过 electronAPI 读取
  if (imageUrl.startsWith('file://')) {
    const filePath = decodeURIComponent(imageUrl.replace(/^file:\/+/, ''))
    try {
      const result = await window.electronAPI.readFile(filePath)
      if (result?.success && result.buffer) {
        const mimeType = guessMimeType(filePath)
        return `data:${mimeType};base64,${result.buffer}`
      }
    } catch (e) {
      throw new Error('读取本地图片失败: ' + (e.message || ''))
    }
  }

  return null
}

/**
 * 根据文件扩展名猜测 MIME 类型
 */
function guessMimeType(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const map = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
  }
  return map[ext] || 'image/png'
}
