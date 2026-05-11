import { ref, onBeforeUnmount } from 'vue'

export function useInertia(viewport, setViewport, updateViewport) {
  const panVelocity = ref({ x: 0, y: 0 })
  const lastViewport = ref({ x: 0, y: 0, zoom: 1, time: 0 })
  const isUserDragging = ref(false)
  const dragCheckTimeout = ref(null)

  let inertiaAnimationFrame = null
  let isInertiaActive = false // 惯性动画状态锁
  let lastFrameTime = 0 // 用于计算真实帧间隔
  const isLocked = ref(false) // 外部锁定状态（用于屏蔽自动动画干扰）

  // 开始惯性滑动
  const startInertia = () => {
    if (Math.abs(panVelocity.value.x) < 0.1 && Math.abs(panVelocity.value.y) < 0.1) {
      return
    }

    if (inertiaAnimationFrame) {
      cancelAnimationFrame(inertiaAnimationFrame)
    }

    isInertiaActive = true
    lastFrameTime = performance.now()
    inertiaAnimationFrame = requestAnimationFrame(applyInertiaFrame)
  }

  // 惯性动画帧
  const applyInertiaFrame = (timestamp) => {
    if (!isInertiaActive) return

    // 计算真实的帧间隔时间 dt (毫秒)
    const dt = Math.min(timestamp - lastFrameTime, 32) // 最大限制为32ms(约30fps)，防止切后台回来后暴走
    lastFrameTime = timestamp

    // 摩擦力系数，增加阻尼让滑行距离变短（从 0.997 调为 0.993）
    // 每毫秒衰减约 0.7%，即 16ms 衰减 10.6%
    const friction = Math.pow(0.993, dt)

    panVelocity.value.x *= friction
    panVelocity.value.y *= friction

    if (Math.abs(panVelocity.value.x) < 0.02 && Math.abs(panVelocity.value.y) < 0.02) {
      isInertiaActive = false
      panVelocity.value = { x: 0, y: 0 }
      return
    }

    if (viewport.value && typeof viewport.value.x === 'number' && typeof viewport.value.y === 'number') {
      // 速度 (像素/毫秒) * 时间 (毫秒) = 移动距离
      setViewport({
        x: viewport.value.x + panVelocity.value.x * dt,
        y: viewport.value.y + panVelocity.value.y * dt,
        zoom: viewport.value.zoom
      })
    }

    inertiaAnimationFrame = requestAnimationFrame(applyInertiaFrame)
  }

  const handleViewportChange = (newViewport) => {
    // 如果处于锁定状态（如正在执行双击对焦动画），则忽略所有变化，不进行速度采样
    if (isLocked.value) {
      lastViewport.value = { x: newViewport.x, y: newViewport.y, zoom: newViewport.zoom, time: Date.now() }
      return
    }

    // 更新外部视口状态
    if (updateViewport) {
      updateViewport(newViewport)
    }

    // 惯性拖动逻辑
    const now = Date.now()
    const dt = now - lastViewport.value.time

    // 检测是否是缩放操作（zoom 值变化）
    const isZooming = Math.abs(newViewport.zoom - lastViewport.value.zoom) > 0.001

    // 如果当前是惯性滑动产生的视口变化，直接跳过速度采样，防止自我干扰导致顿挫
    if (isInertiaActive) {
      lastViewport.value = { x: newViewport.x, y: newViewport.y, zoom: newViewport.zoom, time: now }
      return
    }

    if (dt > 0 && dt < 100 && !isZooming) {
      // 计算视口移动速度
      const dx = newViewport.x - lastViewport.value.x
      const dy = newViewport.y - lastViewport.value.y

      // 只有在用户拖动时才记录速度（降低阈值，更容易触发）
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        isUserDragging.value = true

        // 使用指数移动平均 (EMA) 平滑速度，过滤鼠标硬件抖动
        const currentVx = dx / dt
        const currentVy = dy / dt

        // 如果刚开始拖，直接使用当前速度；否则与上一帧速度混合
        if (Math.abs(panVelocity.value.x) < 0.01 && Math.abs(panVelocity.value.y) < 0.01) {
          panVelocity.value = { x: currentVx, y: currentVy }
        } else {
          panVelocity.value = {
            x: panVelocity.value.x * 0.4 + currentVx * 0.6,
            y: panVelocity.value.y * 0.4 + currentVy * 0.6
          }
        }

        // 清除之前的超时
        if (dragCheckTimeout.value) {
          clearTimeout(dragCheckTimeout.value)
        }

        // 设置新的超时，检测拖动结束（松手瞬间）
        dragCheckTimeout.value = setTimeout(() => {
          if (isUserDragging.value) {
            isUserDragging.value = false
            startInertia()
          }
        }, 30)
      }
    }

    lastViewport.value = { x: newViewport.x, y: newViewport.y, zoom: newViewport.zoom, time: now }
  }

  // 中断惯性
  const stopInertia = () => {
    isInertiaActive = false
    panVelocity.value = { x: 0, y: 0 }
    if (inertiaAnimationFrame) {
      cancelAnimationFrame(inertiaAnimationFrame)
      inertiaAnimationFrame = null
    }
    if (dragCheckTimeout.value) {
      clearTimeout(dragCheckTimeout.value)
      dragCheckTimeout.value = null
    }
  }

  // 组件卸载时清理定时器和动画帧
  onBeforeUnmount(() => {
    stopInertia()
  })

  // 锁定采样一段时间
  const lockInertia = (duration = 500) => {
    stopInertia()
    isLocked.value = true
    setTimeout(() => {
      isLocked.value = false
    }, duration)
  }

  return {
    handleViewportChange,
    stopInertia,
    lockInertia
  }
}
