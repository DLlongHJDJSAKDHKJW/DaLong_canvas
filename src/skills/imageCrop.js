/**
 * Crop Skill | 裁剪技能
 * 对图片进行纯前端裁剪（无需 AI / API）
 *
 * 可被 UI 直接调用，也可被右侧 Agent 智能调用
 *
 * @param {Object} params
 * @param {string} params.imageUrl  - 原图 URL（支持 data: / http / file:）
 * @param {number} params.x         - 裁剪起始 x (像素)
 * @param {number} params.y         - 裁剪起始 y (像素)
 * @param {number} params.width     - 裁剪宽度 (像素)
 * @param {number} params.height    - 裁剪高度 (像素)
 * @returns {Promise<{url: string}>}
 */

export async function imageCrop(params) {
  const { imageUrl, x, y, width, height } = params

  if (!imageUrl) throw new Error('缺少原图 URL')
  if (width <= 0 || height <= 0) throw new Error('裁剪尺寸无效')

  // 加载图片
  const img = await loadImage(imageUrl)

  // 计算实际裁剪区域（边界检查）
  const cropX = Math.max(0, Math.min(x || 0, img.naturalWidth))
  const cropY = Math.max(0, Math.min(y || 0, img.naturalHeight))
  const cropW = Math.min(width, img.naturalWidth - cropX)
  const cropH = Math.min(height, img.naturalHeight - cropY)

  if (cropW <= 0 || cropH <= 0) {
    throw new Error('裁剪区域超出图片边界')
  }

  // Canvas 裁剪
  const canvas = document.createElement('canvas')
  canvas.width = cropW
  canvas.height = cropH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 初始化失败')

  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

  return { url: canvas.toDataURL('image/png') }
}

/**
 * 根据比例裁剪（从图片中心裁切）
 *
 * @param {Object} params
 * @param {string} params.imageUrl   - 原图 URL
 * @param {string} params.ratio      - 比例 '1x1' | '4x3' | '3x4' | '16x9' | '9x16' | 'free'
 * @param {number} params.centerX    - 裁切框中心 X（0-1 百分比，默认 0.5）
 * @param {number} params.centerY    - 裁切框中心 Y（0-1 百分比，默认 0.5）
 * @param {number} params.zoom       - 缩放倍数（1=裁切区域刚好匹配比例，0.8=裁切更大区域，默认 1）
 * @returns {Promise<{url: string}>}
 */
export async function imageCropByRatio(params) {
  const { imageUrl, ratio = '1x1', centerX = 0.5, centerY = 0.5, zoom = 1 } = params

  if (!imageUrl) throw new Error('缺少原图 URL')

  const img = await loadImage(imageUrl)
  const imgW = img.naturalWidth
  const imgH = img.naturalHeight

  // 解析比例
  const [rw, rh] = ratio === 'free'
    ? [imgW, imgH]
    : ratio.split('x').map(Number)

  let cropW, cropH

  if (ratio === 'free') {
    cropW = imgW
    cropH = imgH
  } else {
    const imgRatio = imgW / imgH
    const targetRatio = rw / rh

    if (imgRatio > targetRatio) {
      // 图片更宽：限制高度，宽度按比例
      cropH = imgH * zoom
      cropW = cropH * targetRatio
    } else {
      // 图片更高：限制宽度，高度按比例
      cropW = imgW * zoom
      cropH = cropW / targetRatio
    }
  }

  // 计算偏移（以 centerX/centerY 为中心）
  const cropX = Math.max(0, Math.min(imgW * centerX - cropW / 2, imgW - cropW))
  const cropY = Math.max(0, Math.min(imgH * centerY - cropH / 2, imgH - cropH))

  return imageCrop({ imageUrl, x: Math.round(cropX), y: Math.round(cropY), width: Math.round(cropW), height: Math.round(cropH) })
}

/**
 * 加载图片
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}
