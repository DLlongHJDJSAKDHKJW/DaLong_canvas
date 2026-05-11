<template>
  <!-- Global Quota Alert | 全局额度不足提示 -->
  <Transition name="slide-down">
    <div v-if="visible" class="quota-alert-container">
      <div class="quota-alert">
        <div class="alert-icon">
          <n-icon :size="24"><WarningOutline /></n-icon>
        </div>
        <div class="alert-content">
          <div class="alert-title">API 额度不足</div>
          <div class="alert-message">{{ message }}</div>
        </div>
        <div class="alert-actions">
          <button @click="handleOpenSettings" class="action-btn primary">
            <n-icon :size="16"><SettingsOutline /></n-icon>
            <span>配置 API</span>
          </button>
          <button @click="handleDismiss" class="action-btn secondary">
            <n-icon :size="16"><CloseOutline /></n-icon>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
/**
 * Quota Alert Component | 额度不足提示组件
 * 在屏幕顶部显示醒目的额度不足提示
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { NIcon } from 'naive-ui'
import { WarningOutline, SettingsOutline, CloseOutline } from '@vicons/ionicons5'

const visible = ref(false)
const message = ref('您的 API 调用额度已用尽，请充值或更换 API Key')
let autoHideTimer = null

const handleQuotaExceeded = (event) => {
  const detail = event.detail || {}
  message.value = detail.message || '您的 API 调用额度已用尽，请充值或更换 API Key'

  visible.value = true

  // 清除之前的自动隐藏定时器
  if (autoHideTimer) {
    clearTimeout(autoHideTimer)
  }

  // 10秒后自动隐藏
  autoHideTimer = setTimeout(() => {
    visible.value = false
  }, 10000)
}

const handleOpenSettings = () => {
  visible.value = false
  window.dispatchEvent(new CustomEvent('open-api-settings'))
}

const handleDismiss = () => {
  visible.value = false
  if (autoHideTimer) {
    clearTimeout(autoHideTimer)
  }
}

onMounted(() => {
  window.addEventListener('quota-exceeded', handleQuotaExceeded)
})

onUnmounted(() => {
  window.removeEventListener('quota-exceeded', handleQuotaExceeded)
  if (autoHideTimer) {
    clearTimeout(autoHideTimer)
  }
})
</script>

<style scoped>
/* Container | 容器 */
.quota-alert-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  justify-content: center;
  padding: 16px;
  pointer-events: none;
}

.quota-alert {
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95));
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow:
    0 10px 40px rgba(239, 68, 68, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  max-width: 600px;
  width: 100%;
  pointer-events: auto;
  animation: alertPulse 2s ease-in-out infinite;
}

@keyframes alertPulse {
  0%, 100% {
    box-shadow:
      0 10px 40px rgba(239, 68, 68, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  }
  50% {
    box-shadow:
      0 12px 48px rgba(239, 68, 68, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.15) inset;
  }
}

/* Icon | 图标 */
.alert-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  animation: iconShake 0.5s ease-in-out;
}

@keyframes iconShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

/* Content | 内容 */
.alert-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.alert-title {
  font-size: 15px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.2px;
}

.alert-message {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Actions | 操作按钮 */
.alert-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.action-btn.primary {
  background: rgba(255, 255, 255, 0.95);
  color: #dc2626;
}

.action-btn.primary:hover {
  background: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 10px;
}

.action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Animations | 动画 */
.slide-down-enter-active {
  animation: slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-down-leave-active {
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-100%);
  }
}

/* Responsive | 响应式 */
@media (max-width: 640px) {
  .quota-alert-container {
    padding: 12px;
  }

  .quota-alert {
    padding: 14px 16px;
    gap: 12px;
  }

  .alert-icon {
    width: 36px;
    height: 36px;
  }

  .alert-icon :deep(.n-icon) {
    font-size: 20px;
  }

  .alert-title {
    font-size: 14px;
  }

  .alert-message {
    font-size: 12px;
  }

  .action-btn {
    padding: 6px 12px;
    font-size: 12px;
  }

  .action-btn span {
    display: none;
  }

  .action-btn.primary {
    padding: 6px 10px;
  }
}
</style>
