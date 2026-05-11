<template>
  <!-- App Header | 应用头部 -->
  <header class="flex items-center justify-between px-4 md:px-8 py-4">
    <!-- Left slot | 左侧插槽 -->
    <div class="flex items-center gap-2">
      <slot name="left">
        <!-- Default: empty or logo -->
      </slot>
    </div>
    
    <!-- Right section | 右侧区域 -->
    <div class="flex items-center gap-4">
      <!-- Center slot | 中间插槽 -->
      <slot name="center"></slot>
      
      <!-- Right slot | 右侧插槽 -->
      <slot name="right"></slot>
    </div>
  </header>
</template>

<script setup>
</script>
