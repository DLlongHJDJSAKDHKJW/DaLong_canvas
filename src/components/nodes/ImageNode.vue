<template>
  <!-- Image node | 图片节点 -->
  <div class="image-node-wrapper" @mousemove="handleMouseMove" @mouseleave="handleMouseLeave">
    <!-- Floating toolbar above image | 图片上方浮动工具栏 - 仅单选时显示 -->
    <div
      v-show="isSingleSelected && data.url"
      class="floating-toolbar-top"
      :style="{ transform: `translateX(-50%) scale(${1 / zoom})` }"
    >
      <button @click="handlePreview" class="tool-btn" title="全景">
        <n-icon :size="15"><ExpandOutline /></n-icon>
      </button>
      <button @click="showConfigCard('hd')" class="tool-btn" :class="{ active: activeConfig === 'hd' }">
        <span class="btn-text">高清</span>
      </button>
      <button @click="showConfigCard('expand')" class="tool-btn" :class="{ active: activeConfig === 'expand' }">
        <span class="btn-text">扩图</span>
      </button>
      <button @click="showConfigCard('redraw')" class="tool-btn" :class="{ active: activeConfig === 'redraw' }">
        <span class="btn-text">重绘</span>
      </button>
      <button @click="showConfigCard('erase')" class="tool-btn" :class="{ active: activeConfig === 'erase' }">
        <span class="btn-text">擦除</span>
      </button>
      <button @click="showConfigCard('cutout')" class="tool-btn" :class="{ active: activeConfig === 'cutout' }">
        <span class="btn-text">抠图</span>
      </button>
      <button @click="showConfigCard('crop')" class="tool-btn" :class="{ active: activeConfig === 'crop' }">
        <span class="btn-text">裁剪</span>
      </button>

      <div class="toolbar-divider"></div>

      <n-dropdown trigger="click" :options="gridOptions" @select="handleGridSelect">
        <button class="tool-btn" title="宫格切分">
          <n-icon :size="14"><GridOutline /></n-icon>
        </button>
      </n-dropdown>

      <button @click="handleDelete" class="tool-btn delete" title="删除">
        <n-icon :size="15"><TrashOutline /></n-icon>
      </button>
    </div>

    <!-- Image container | 图片容器 -->
    <div
      class="image-node"
      :class="{ 'selected': data.selected, 'overflow-visible': activeConfig === 'expand' }"
      :style="nodeStyle"
    >
      <div v-if="data.loading" class="image-loading">
        <div class="loading-spinner"></div>
        <span>{{ data.loadingText || '生成中...' }}</span>
        <div class="loading-timer">{{ formattedTime }}</div>
      </div>

      <div v-else-if="data.url" class="image-container" :class="{ 'overflow-visible': activeConfig === 'expand' }">
        <img
          ref="imageRef"
          :src="data.url"
          :alt="data.label || '图片'"
          class="image-display"
          loading="eager"
          decoding="sync"
          @load="onImageLoad"
        />
        <!-- 右上角下载按钮（裁剪时隐藏） -->
        <button v-if="isSingleSelected && activeConfig !== 'crop' && activeConfig !== 'expand'" class="download-btn" @click.stop="handleDownload" title="下载图片">
          <n-icon :size="20"><DownloadOutline /></n-icon>
        </button>

        <!-- Crop overlay | 裁剪叠加层 -->
        <div v-if="activeConfig === 'crop'" class="crop-overlay" @mousedown.stop>
          <div class="crop-mask-top" :style="{ height: `${cropRect.y * 100}%` }" />
          <div class="crop-mask-bottom" :style="{ height: `${(1 - cropRect.y - cropRect.h) * 100}%` }" />
          <div class="crop-mask-left" :style="{ width: `${cropRect.x * 100}%`, top: `${cropRect.y * 100}%`, height: `${cropRect.h * 100}%` }" />
          <div class="crop-mask-right" :style="{ width: `${(1 - cropRect.x - cropRect.w) * 100}%`, top: `${cropRect.y * 100}%`, height: `${cropRect.h * 100}%` }" />
          <div
            class="crop-rect"
            :style="cropRectStyle"
            @mousedown.prevent="onCropDragStart"
          >
            <div class="crop-grid-h">
              <div class="crop-grid-cell" /><div class="crop-grid-cell" /><div class="crop-grid-cell" />
            </div>
            <div class="crop-grid-h">
              <div class="crop-grid-cell" /><div class="crop-grid-cell" /><div class="crop-grid-cell" />
            </div>
            <div class="crop-grid-h">
              <div class="crop-grid-cell" /><div class="crop-grid-cell" /><div class="crop-grid-cell" />
            </div>
            <!-- Resize handles -->
            <div class="crop-handle crop-handle-nw" @mousedown.prevent.stop="onResizeStart($event, 'nw')" />
            <div class="crop-handle crop-handle-ne" @mousedown.prevent.stop="onResizeStart($event, 'ne')" />
            <div class="crop-handle crop-handle-sw" @mousedown.prevent.stop="onResizeStart($event, 'sw')" />
            <div class="crop-handle crop-handle-se" @mousedown.prevent.stop="onResizeStart($event, 'se')" />
            <div class="crop-handle crop-handle-n" @mousedown.prevent.stop="onResizeStart($event, 'n')" />
            <div class="crop-handle crop-handle-s" @mousedown.prevent.stop="onResizeStart($event, 's')" />
            <div class="crop-handle crop-handle-w" @mousedown.prevent.stop="onResizeStart($event, 'w')" />
            <div class="crop-handle crop-handle-e" @mousedown.prevent.stop="onResizeStart($event, 'e')" />
          </div>
        </div>

        <!-- Expand overlay | 扩图叠加层 -->
        <div v-if="activeConfig === 'expand'" class="expand-overlay" @mousedown.stop>
          <div v-if="expandPreviewMetrics" class="expand-stage" :style="expandStageStyle">
            <div class="expand-mask expand-mask-top" :style="expandMaskTopStyle" />
            <div class="expand-mask expand-mask-bottom" :style="expandMaskBottomStyle" />
            <div class="expand-mask expand-mask-left" :style="expandMaskLeftStyle" />
            <div class="expand-mask expand-mask-right" :style="expandMaskRightStyle" />
            <div class="expand-source-frame" :style="expandSourceFrameStyle" />
            <div class="expand-rect" :style="expandOuterRectStyle">
              <div class="expand-rect-grid-h">
                <div class="expand-rect-grid-cell" /><div class="expand-rect-grid-cell" /><div class="expand-rect-grid-cell" />
              </div>
              <div class="expand-rect-grid-h">
                <div class="expand-rect-grid-cell" /><div class="expand-rect-grid-cell" /><div class="expand-rect-grid-cell" />
              </div>
              <div class="expand-rect-grid-h">
                <div class="expand-rect-grid-cell" /><div class="expand-rect-grid-cell" /><div class="expand-rect-grid-cell" />
              </div>
              <div class="expand-rect-handle expand-rect-handle-nw" @mousedown.prevent.stop="onExpandResizeStart($event, 'nw')" />
              <div class="expand-rect-handle expand-rect-handle-ne" @mousedown.prevent.stop="onExpandResizeStart($event, 'ne')" />
              <div class="expand-rect-handle expand-rect-handle-sw" @mousedown.prevent.stop="onExpandResizeStart($event, 'sw')" />
              <div class="expand-rect-handle expand-rect-handle-se" @mousedown.prevent.stop="onExpandResizeStart($event, 'se')" />
              <div class="expand-rect-handle expand-rect-handle-n" @mousedown.prevent.stop="onExpandResizeStart($event, 'n')" />
              <div class="expand-rect-handle expand-rect-handle-s" @mousedown.prevent.stop="onExpandResizeStart($event, 's')" />
              <div class="expand-rect-handle expand-rect-handle-w" @mousedown.prevent.stop="onExpandResizeStart($event, 'w')" />
              <div class="expand-rect-handle expand-rect-handle-e" @mousedown.prevent.stop="onExpandResizeStart($event, 'e')" />
            </div>
          </div>
        </div>

        <!-- Redraw/Erase overlay | 重绘/擦除画笔叠加层 -->
        <div v-if="activeConfig === 'redraw' || activeConfig === 'erase'" class="redraw-overlay" @mousedown.stop>
          <div class="redraw-brush-hint">
            <n-icon :size="14"><SparklesOutline /></n-icon>
            <span>{{ activeConfig === 'redraw' ? '画笔涂抹要重绘的区域' : '画笔涂抹要擦除的区域' }}</span>
          </div>
          <canvas
            ref="redrawCanvasRef"
            class="redraw-canvas"
            :style="{ opacity: redrawBrushOpacity }"
            @mousedown.prevent="onRedrawCanvasStart"
            @mousemove.prevent="onRedrawCanvasMove"
            @mouseup.prevent="onRedrawCanvasEnd"
            @mouseleave="onRedrawCanvasEnd"
          ></canvas>
        </div>
      </div>

      <div v-else class="image-placeholder">
        <n-icon :size="48"><ImageOutline /></n-icon>
      </div>
    </div>

    <!-- 生成面板：空节点时显示；有图片时也显示，但点了图片上方功能按钮（高清/扩图/重绘等）后隐藏 -->
    <div v-if="isSingleSelected && !data.loading && !activeConfig" class="generate-panel" :class="{ expanded: panelExpanded }">

      <!-- 第一行：参考图（左）+ 功能按钮（右） -->
      <div class="panel-top-row">
        <!-- 参考图 -->
        <div v-if="effectiveInputImages.length > 0" class="ref-images-scroll">
          <div v-for="(img, index) in effectiveInputImages" :key="index" class="ref-image-wrapper">
            <img :src="img.url" class="ref-image" />
            <div class="ref-index-badge">{{ index + 1 }}</div>
            <div class="role-tag-badge" :class="img.role">{{ img.isSelf ? '当前图' : getRoleLabel(img.role) }}</div>
          </div>
        </div>
        <div class="panel-top-spacer"></div>
        <!-- 功能按钮组 -->
        <div class="func-btns">
          <button class="func-btn" title="标记">
            <n-icon :size="16"><LocationOutline /></n-icon>
            <span>标记</span>
          </button>
          <button class="func-btn" title="运镜">
            <n-icon :size="16"><CameraOutline /></n-icon>
            <span>运镜</span>
          </button>
          <button class="func-btn" title="角色库">
            <n-icon :size="16"><PeopleOutline /></n-icon>
            <span>角色库</span>
          </button>
          <div class="func-divider"></div>
          <button class="func-btn icon-only" @click="panelExpanded = !panelExpanded" :title="panelExpanded ? '收起' : '展开'">
            <n-icon :size="16"><ExpandOutline /></n-icon>
          </button>
        </div>
      </div>

      <!-- 第二行：提示词输入框 -->
      <div ref="promptInputContainerRef" class="prompt-input-container">
        <div
          ref="editorRef"
          class="prompt-editor"
          contenteditable="true"
          spellcheck="false"
          :data-placeholder="promptPlaceholder"
          @input="handleEditorInput"
          @keydown="handleEditorKeyDown"
          @mouseup="handleEditorSelectionChange"
          @keyup="handleEditorSelectionChange"
          @wheel.stop
          @mousedown.stop
        ></div>
        <div class="char-count" :class="{ warn: promptText.length > 800, over: promptText.length > 1000 }">
          {{ promptText.length }}
        </div>

        <div v-if="showMentionList" class="mention-list" :style="mentionStyle">
          <div
            v-for="(img, index) in effectiveInputImages"
            :key="img.nodeId + (img.isSelf ? '-self' : '')"
            class="mention-item"
            :class="{ active: activeMentionIndex === index }"
            @click="selectMention(img)"
          >
            <img :src="img.url" class="mention-thumb" />
            <span class="mention-name">图片{{ index + 1 }}</span>
            <span class="mention-role">{{ img.isSelf ? '(当前图)' : `(${getRoleLabel(img.role)})` }}</span>
          </div>
        </div>
      </div>

      <!-- 第三行：参数选择 + 发送 -->
      <div class="generate-toolbar">
        <n-dropdown :options="modelOptions" @select="handleModelSelect">
          <button class="gen-select" title="模型">
            <n-icon :size="14"><SettingsOutline /></n-icon>
            <span class="gen-select-text">{{ displayModel }}</span>
            <n-icon :size="12"><ChevronDownOutline /></n-icon>
          </button>
        </n-dropdown>

        <n-dropdown :options="ratioOptions" @select="handleRatioSelect">
          <button class="gen-select" title="比例">
            <n-icon :size="14"><TvOutline /></n-icon>
            <span class="gen-select-text">{{ displayRatio }}</span>
            <n-icon :size="12"><ChevronDownOutline /></n-icon>
          </button>
        </n-dropdown>

        <n-dropdown :options="resolutionOptions" @select="handleResolutionSelect">
          <button class="gen-select" title="分辨率">
            <n-icon :size="14"><ScanOutline /></n-icon>
            <span class="gen-select-text">{{ localResolution }}</span>
            <n-icon :size="12"><ChevronDownOutline /></n-icon>
          </button>
        </n-dropdown>

        <n-dropdown :options="styleOptions" @select="handleStyleSelect">
          <button class="gen-select" title="风格">
            <n-icon :size="14"><ColorPaletteOutline /></n-icon>
            <span class="gen-select-text">{{ displayStyle }}</span>
            <n-icon :size="12"><ChevronDownOutline /></n-icon>
          </button>
        </n-dropdown>

        <n-dropdown :options="countOptions" @select="handleCountSelect">
          <button class="gen-select" title="张数">
            <n-icon :size="14"><CopyOutline /></n-icon>
            <span class="gen-select-text">{{ localImageCount }}张</span>
            <n-icon :size="12"><ChevronDownOutline /></n-icon>
          </button>
        </n-dropdown>

        <button
          class="gen-action-btn"
          :class="{ over: promptText.length > 1000 }"
          :disabled="processing || !promptText.trim() || promptText.length > 1000"
          :title="promptText.length > 1000 ? `提示词过长（${promptText.length}/1000字），请精简后再发送` : ''"
          @click="handleGenerateImage"
        >
          <n-spin v-if="processing" :size="12" />
          <n-icon v-else :size="15"><ArrowUpOutline /></n-icon>
        </button>
      </div>

    </div>

    <!-- 分辨率标签 - 右上角浮动 -->
    <div v-if="data.url && imageResolution" class="resolution-badge">
      {{ imageResolution }}
    </div>

    <!-- 名称标签 - 左下角浮动 -->
    <div v-if="data.label && data.url" class="image-label">
      {{ data.label }}
    </div>

    <!-- Floating config card below image | 图片下方浮动配置卡片 - 仅单选时显示 -->
    <!-- 高清配置 -->
    <div
      v-if="isSingleSelected && activeConfig === 'hd'"
      class="floating-config-card"
      :style="{ zoom: 1 / zoom }"
    >
      <div class="config-header">
        <span class="config-title">高清</span>
        <button @click="activeConfig = null" class="close-btn">
          <n-icon :size="14"><CloseOutline /></n-icon>
        </button>
      </div>

      <div class="config-row">
        <span class="config-label">模型选择</span>
        <n-dropdown :options="modelOptions" @select="handleModelSelect">
          <button class="config-select">
            <span>{{ displayModel }}</span>
            <n-icon :size="14"><ChevronDownOutline /></n-icon>
          </button>
        </n-dropdown>
      </div>

      <div class="config-row">
        <span class="config-label">放大倍数</span>
        <div class="scale-buttons">
          <button
            v-for="scale in scaleOptions"
            :key="scale"
            :class="['scale-btn', { active: localScale === scale }]"
            @click="localScale = scale"
          >
            {{ scale }}
          </button>
        </div>
      </div>

      <div class="action-row">
        <button class="action-btn secondary" @click="handleReset">
          <n-icon :size="14"><RefreshOutline /></n-icon>
        </button>
        <button class="action-btn primary" :disabled="processing" @click="handleGenerate">
          <n-spin v-if="processing" :size="12" />
          <n-icon v-else :size="14"><ArrowUpOutline /></n-icon>
        </button>
      </div>
    </div>

    <!-- 扩图配置 -->
    <div
      v-else-if="isSingleSelected && activeConfig === 'expand'"
      class="expand-config-card"
      :style="{ zoom: 1 / zoom }"
    >
      <div class="expand-config-header">
        <span class="expand-config-title">扩图</span>
        <button @click="activeConfig = null" class="expand-config-close">
          <n-icon :size="14"><CloseOutline /></n-icon>
        </button>
      </div>

      <div class="expand-section">
        <span class="expand-section-label">统一扩展</span>
        <div class="expand-unified-row">
          <input
            type="number"
            class="expand-unified-input"
            v-model.number="expandUnified"
            min="0"
            max="2000"
            placeholder="0"
          />
          <span class="expand-unified-unit">px</span>
          <button class="expand-apply-all" @click="applyUnifiedExpand" title="应用到所有方向">
            <n-icon :size="14"><ArrowUpOutline /></n-icon>
          </button>
        </div>
      </div>

      <div class="expand-custom-section">
        <span class="expand-section-label expand-custom-label">各方向扩展</span>
        <div class="expand-direction-grid">
          <div class="expand-direction-item">
            <span class="expand-dir-label">上</span>
            <input
              type="number"
              class="expand-dir-input"
              v-model.number="expandAmounts.top"
              min="0"
              max="2000"
            />
            <span class="expand-dir-unit">px</span>
          </div>
          <div class="expand-direction-item">
            <span class="expand-dir-label">下</span>
            <input
              type="number"
              class="expand-dir-input"
              v-model.number="expandAmounts.bottom"
              min="0"
              max="2000"
            />
            <span class="expand-dir-unit">px</span>
          </div>
          <div class="expand-direction-item">
            <span class="expand-dir-label">左</span>
            <input
              type="number"
              class="expand-dir-input"
              v-model.number="expandAmounts.left"
              min="0"
              max="2000"
            />
            <span class="expand-dir-unit">px</span>
          </div>
          <div class="expand-direction-item">
            <span class="expand-dir-label">右</span>
            <input
              type="number"
              class="expand-dir-input"
              v-model.number="expandAmounts.right"
              min="0"
              max="2000"
            />
            <span class="expand-dir-unit">px</span>
          </div>
        </div>
      </div>

      <div class="expand-divider"></div>

      <!-- 输出尺寸 -->
      <div v-if="naturalWidth" class="expand-section">
        <span class="expand-section-label">输出尺寸</span>
        <div class="expand-dimension-row">
          <input
            type="number"
            class="expand-dim-input"
            :value="expandOutputSize.w"
            :min="naturalWidth"
            :max="naturalWidth + 4000"
            @input="handleExpandSizeInput('w', $event)"
          />
          <span class="expand-dim-sep">×</span>
          <input
            type="number"
            class="expand-dim-input"
            :value="expandOutputSize.h"
            :min="naturalHeight"
            :max="naturalHeight + 4000"
            @input="handleExpandSizeInput('h', $event)"
          />
          <span class="expand-dim-unit">px</span>
        </div>
      </div>

      <div class="expand-actions">
        <button class="expand-btn-reset" @click="handleExpandReset">
          <n-icon :size="14"><RefreshOutline /></n-icon>
          <span>重置</span>
        </button>
        <button class="expand-btn-apply" :disabled="processing || !hasExpandAmount" @click="handleExpandApply">
          <n-icon :size="16"><ExpandOutline /></n-icon>
          <span>应用扩图</span>
        </button>
      </div>
    </div>

    <!-- 重绘配置 -->
    <div
      v-else-if="isSingleSelected && activeConfig === 'redraw'"
      class="redraw-config-card"
      :style="{ zoom: 1 / zoom }"
    >
      <div class="redraw-config-header">
        <span class="redraw-config-title">重绘</span>
        <button @click="handleRedrawClose" class="redraw-config-close">
          <n-icon :size="14"><CloseOutline /></n-icon>
        </button>
      </div>

      <div class="redraw-section">
        <span class="redraw-section-label">重绘提示词</span>
        <textarea
          class="redraw-prompt-input"
          v-model="redrawPrompt"
          placeholder="描述你想要重绘的内容，例如：把这片区域变成草地..."
          rows="3"
          @wheel.stop
          @mousedown.stop
        ></textarea>
      </div>

      <div class="redraw-section">
        <span class="redraw-section-label">画笔大小</span>
        <div class="redraw-brush-row">
          <input
            type="range"
            class="redraw-brush-slider"
            v-model.number="redrawBrushSize"
            min="4"
            max="120"
            step="1"
          />
          <span class="redraw-brush-size-label">{{ redrawBrushSize }}px</span>
        </div>
        <div class="redraw-brush-presets">
          <button
            v-for="s in redrawBrushPresets"
            :key="s"
            :class="['redraw-brush-preset', { active: redrawBrushSize === s }]"
            @click="redrawBrushSize = s"
          >{{ s }}</button>
        </div>
      </div>

      <div class="redraw-section">
        <span class="redraw-section-label">画笔颜色</span>
        <div class="redraw-color-presets">
          <button
            v-for="c in redrawBrushColorPresets"
            :key="c"
            :class="['redraw-color-btn', { active: redrawBrushColor === c }]"
            :style="{ background: c }"
            @click="redrawBrushColor = c"
          ></button>
        </div>
      </div>

      <div class="redraw-section">
        <span class="redraw-section-label">不透明度</span>
        <div class="redraw-brush-row">
          <input
            type="range"
            class="redraw-brush-slider"
            v-model.number="redrawBrushOpacity"
            min="0.1"
            max="1"
            step="0.05"
          />
          <span class="redraw-brush-size-label">{{ Math.round(redrawBrushOpacity * 100) }}%</span>
        </div>
        <div class="redraw-brush-presets">
          <button
            v-for="o in [0.2, 0.35, 0.5, 0.7, 1]"
            :key="o"
            :class="['redraw-brush-preset', { active: redrawBrushOpacity === o }]"
            @click="redrawBrushOpacity = o"
          >{{ Math.round(o * 100) }}%</button>
        </div>
      </div>

      <div class="redraw-divider"></div>

      <div class="redraw-actions">
        <button class="redraw-btn-clear" @click="handleRedrawClear">
          <n-icon :size="14"><RefreshOutline /></n-icon>
          <span>清空</span>
        </button>
        <button class="redraw-btn-apply" :disabled="processing || !redrawPrompt.trim()" @click="handleRedrawApply">
          <n-icon :size="16"><SparklesOutline /></n-icon>
          <span>应用重绘</span>
        </button>
      </div>
    </div>

    <!-- 擦除配置 -->
    <div
      v-else-if="isSingleSelected && activeConfig === 'erase'"
      class="redraw-config-card"
      :style="{ zoom: 1 / zoom }"
    >
      <div class="redraw-config-header">
        <span class="redraw-config-title">擦除</span>
        <button @click="handleEraseClose" class="redraw-config-close">
          <n-icon :size="14"><CloseOutline /></n-icon>
        </button>
      </div>

      <div class="redraw-section">
        <span class="redraw-section-label">画笔大小</span>
        <div class="redraw-brush-row">
          <input
            type="range"
            class="redraw-brush-slider"
            v-model.number="redrawBrushSize"
            min="4"
            max="120"
            step="1"
          />
          <span class="redraw-brush-size-label">{{ redrawBrushSize }}px</span>
        </div>
        <div class="redraw-brush-presets">
          <button
            v-for="s in redrawBrushPresets"
            :key="s"
            :class="['redraw-brush-preset', { active: redrawBrushSize === s }]"
            @click="redrawBrushSize = s"
          >{{ s }}</button>
        </div>
      </div>

      <div class="redraw-section">
        <span class="redraw-section-label">画笔颜色</span>
        <div class="redraw-color-presets">
          <button
            v-for="c in redrawBrushColorPresets"
            :key="c"
            :class="['redraw-color-btn', { active: redrawBrushColor === c }]"
            :style="{ background: c }"
            @click="redrawBrushColor = c"
          ></button>
        </div>
      </div>

      <div class="redraw-section">
        <span class="redraw-section-label">不透明度</span>
        <div class="redraw-brush-row">
          <input
            type="range"
            class="redraw-brush-slider"
            v-model.number="redrawBrushOpacity"
            min="0.1"
            max="1"
            step="0.05"
          />
          <span class="redraw-brush-size-label">{{ Math.round(redrawBrushOpacity * 100) }}%</span>
        </div>
        <div class="redraw-brush-presets">
          <button
            v-for="o in [0.2, 0.35, 0.5, 0.7, 1]"
            :key="o"
            :class="['redraw-brush-preset', { active: redrawBrushOpacity === o }]"
            @click="redrawBrushOpacity = o"
          >{{ Math.round(o * 100) }}%</button>
        </div>
      </div>

      <div class="redraw-divider"></div>

      <div class="redraw-actions">
        <button class="redraw-btn-clear" @click="handleRedrawClear">
          <n-icon :size="14"><RefreshOutline /></n-icon>
          <span>清空</span>
        </button>
        <button class="redraw-btn-apply" :disabled="processing" @click="handleEraseApply">
          <n-icon :size="16"><SparklesOutline /></n-icon>
          <span>应用擦除</span>
        </button>
      </div>
    </div>

    <!-- 裁剪配置 -->
    <div
      v-else-if="isSingleSelected && activeConfig === 'crop'"
      class="crop-config-card"
      :style="{ zoom: 1 / zoom }"
    >
      <div class="crop-config-header">
        <span class="crop-config-title">裁剪</span>
        <button @click="activeConfig = null" class="crop-config-close">
          <n-icon :size="14"><CloseOutline /></n-icon>
        </button>
      </div>

      <div class="crop-section">
        <span class="crop-section-label">裁切比例</span>
        <div class="crop-ratio-grid">
          <button
            v-for="r in cropRatioOptions"
            :key="r.key"
            :class="['crop-ratio-btn', { active: cropRatio === r.key }]"
            @click="handleCropRatioSelect(r.key)"
          >
            {{ r.label }}
          </button>
        </div>
      </div>

      <div v-if="naturalWidth" class="crop-section">
        <span class="crop-section-label">输出尺寸</span>
        <div class="crop-dimension-row">
          <input
            type="number"
            class="crop-dim-input"
            :value="Math.round(cropRect.w * naturalWidth)"
            min="1"
            :max="naturalWidth"
            @input="handleCropSizeInput('w', $event)"
          />
          <span class="crop-dim-sep">×</span>
          <input
            type="number"
            class="crop-dim-input"
            :value="Math.round(cropRect.h * naturalHeight)"
            min="1"
            :max="naturalHeight"
            @input="handleCropSizeInput('h', $event)"
          />
          <span class="crop-dim-unit">px</span>
        </div>
      </div>

      <div class="crop-divider"></div>

      <div class="crop-actions">
        <button class="crop-btn-reset" @click="handleCropReset">
          <n-icon :size="14"><RefreshOutline /></n-icon>
          <span>重置</span>
        </button>
        <button class="crop-btn-apply" :disabled="processing" @click="handleCropApply">
          <n-icon :size="16"><CheckmarkOutline /></n-icon>
          <span>应用裁剪</span>
        </button>
      </div>
    </div>

    <!-- 抠图配置 -->
    <div
      v-else-if="isSingleSelected && activeConfig === 'cutout'"
      class="redraw-config-card"
      :style="{ zoom: 1 / zoom }"
    >
      <div class="redraw-config-header">
        <span class="redraw-config-title">抠图</span>
        <button @click="activeConfig = null" class="redraw-config-close">
          <n-icon :size="14"><CloseOutline /></n-icon>
        </button>
      </div>

      <div class="redraw-section">
        <p style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.6;margin:0;">
          使用 <strong style="color:rgba(255,255,255,0.9);">Nano Banana</strong> 先生成纯色背景图，再把这张纯色背景去掉。
        </p>
      </div>

      <div class="redraw-section">
        <span class="redraw-section-label">背景纯色</span>
        <div class="cutout-color-palette">
          <button
            v-for="option in cutoutColorOptions"
            :key="option.key"
            class="cutout-color-chip"
            :class="{ active: selectedCutoutColor === option.key }"
            :style="{ '--chip-color': option.hex }"
            :title="`${option.label} ${option.hex}`"
            @click="selectedCutoutColor = option.key"
          >
            <span class="cutout-color-chip-fill"></span>
          </button>
        </div>
        <div class="cutout-color-meta">
          <span class="cutout-color-name">{{ selectedCutoutColorOption.label }}</span>
          <span class="cutout-color-hex">{{ selectedCutoutColorOption.hex }}</span>
        </div>
      </div>

      <div class="redraw-section">
        <p class="cutout-hint-text">
          先点“生成纯色背景”，再点“去除纯色”得到透明图。
        </p>
      </div>

      <div class="redraw-actions">
        <button class="redraw-btn-clear" :disabled="processing || !canRemoveCutoutColor" @click="handleRemoveCutoutColor">
          <n-icon :size="14"><ColorPaletteOutline /></n-icon>
          <span>去除纯色</span>
        </button>
        <button class="redraw-btn-apply" :disabled="processing || !props.data.url" @click="handleCutoutApply">
          <n-spin v-if="processing" :size="14" />
          <n-icon v-else :size="16"><SparklesOutline /></n-icon>
          <span>{{ processing ? '生成中...' : '生成纯色背景' }}</span>
        </button>
      </div>
    </div>

    <!-- 宫格划分配置 -->
    <div
      v-else-if="isSingleSelected && activeConfig === 'grid'"
      class="redraw-config-card"
      :style="{ zoom: 1 / zoom }"
    >
      <div class="redraw-config-header">
        <span class="redraw-config-title">宫格划分</span>
        <button @click="activeConfig = null" class="redraw-config-close">
          <n-icon :size="14"><CloseOutline /></n-icon>
        </button>
      </div>

      <div class="redraw-section">
        <p style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.6;margin:0;">
          将当前图片按 <strong style="color:rgba(255,255,255,0.9);">{{ gridLabel }}</strong> 等分切割，
          每个格子生成独立图片节点。
        </p>
      </div>

      <div class="redraw-brush-row" style="gap:8px;justify-content:center;">
        <button
          v-for="g in gridOptions"
          :key="g.key"
          :class="['scale-btn', { active: selectedGridKey === g.key }]"
          @click="selectedGridKey = g.key"
          style="font-size:12px;padding:6px 10px;"
        >{{ g.label }}</button>
      </div>

      <div class="redraw-actions">
        <button class="redraw-btn-clear" @click="activeConfig = null">
          <n-icon :size="14"><CloseOutline /></n-icon>
          <span>取消</span>
        </button>
        <button class="redraw-btn-apply" :disabled="processing" @click="handleGridApply">
          <n-spin v-if="processing" :size="14" />
          <n-icon v-else :size="16"><SparklesOutline /></n-icon>
          <span>{{ processing ? '切分中...' : '确认切分' }}</span>
        </button>
      </div>
    </div>

    <!-- Handles | 连接点 - 跟随鼠标 -->
    <Handle type="source" :position="Position.Right" id="right" class="handle-dot right" :style="rightHandleStyle" />
    <Handle type="target" :position="Position.Left" id="left" class="handle-dot left" :style="leftHandleStyle" />
  </div>

  <!-- Image preview | 图片预览 -->
  <n-image-preview v-model:show="showPreview" :src="data.url" />
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NImagePreview, NDropdown, NSpin } from 'naive-ui'
import {
  ImageOutline,
  TrashOutline,
  ExpandOutline,
  LocationOutline,
  CameraOutline,
  PeopleOutline,
  SparklesOutline,
  EllipsisHorizontalOutline,
  ChevronDownOutline,
  GridOutline,
  CloseOutline,
  RefreshOutline,
  ArrowUpOutline,
  SettingsOutline,
  TvOutline,
  DownloadOutline,
  LayersOutline,
  CheckmarkOutline,
  CopyOutline,
  ScanOutline,
  ColorPaletteOutline
} from '@vicons/ionicons5'
import { updateNode, removeNode, addNode, addEdge, nodes, edges } from '../../stores/canvas'
import { useImageGeneration } from '../../hooks/useApi'
import { IMAGE_MODELS, IMAGE_SIZE_OPTIONS, DEFAULT_IMAGE_MODEL, DEFAULT_IMAGE_SIZE, normalizeModelKey } from '../../config/models'
import { downloadImage, isElectron } from '../../utils/fileSystem'
import { saveProject } from '../../stores/canvas'
import { useRoute } from 'vue-router'
import { useProjectsStore } from '../../stores/projects'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  id: String,
  data: Object,
  position: Object
})

const { updateNodeInternals, viewport, getSelectedNodes, setCenter } = useVueFlow()
const route = useRoute()

// 获取项目名称
const projectsStore = useProjectsStore()
const projectName = computed(() => {
  const project = projectsStore.projects.find(p => p.id === route.params.id)
  return project?.name || '未命名项目'
})

// 获取画布缩放比例
const zoom = computed(() => viewport.value?.zoom || 1)

// ==================== Handle 靠近放大 ====================
const mouseXFrac = ref(0.5)
const mouseYFrac = ref(0.5)
const isMouseOnNode = ref(false)

const handleMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  mouseXFrac.value = ((e.clientX - rect.left) / rect.width)
  mouseYFrac.value = ((e.clientY - rect.top) / rect.height)
  isMouseOnNode.value = true
}

const handleMouseLeave = () => {
  isMouseOnNode.value = false
}

// 小圆点不移动，只在鼠标靠近时放大
const handleProximityScale = (side) => {
  if (!isMouseOnNode.value) return 1
  // 计算鼠标到该侧手柄位置的 XY 距离
  const distX = side === 'left' ? mouseXFrac.value : (1 - mouseXFrac.value)
  const distY = Math.abs(mouseYFrac.value - 0.5)
  const dist = Math.sqrt(distX * distX + distY * distY)
  // 距离 0 时放大到 1.6，距离 0.4 以上恢复 1.0
  return Math.max(1, 1.6 - dist * 1.5)
}

const leftHandleStyle = computed(() => ({
  top: '50%',
  marginTop: '-8px',
  left: '-8px',
  transform: `scale(${handleProximityScale('left')})`,
  transition: isMouseOnNode.value ? 'transform 0.08s linear' : 'transform 0.3s ease-out'
}))

const rightHandleStyle = computed(() => ({
  top: '50%',
  marginTop: '-8px',
  right: '-8px',
  transform: `scale(${handleProximityScale('right')})`,
  transition: isMouseOnNode.value ? 'transform 0.08s linear' : 'transform 0.3s ease-out'
}))
// ==================================================
// ==================================================

// 判断是否是唯一选中的节点（用于控制浮动面板显示）
const isSingleSelected = computed(() => {
  const selectedNodes = getSelectedNodes.value
  return selectedNodes.length === 1 && selectedNodes[0]?.id === props.id
})



// 图片生成 API
const imageApi = useImageGeneration()

// State
const showPreview = ref(false)
const activeConfig = ref(null)
const processing = ref(false)
const cutoutColorOptions = [
  { key: 'green', label: '绿色', hex: '#00FF00', rgb: { r: 0, g: 255, b: 0 } },
  { key: 'blue', label: '蓝色', hex: '#006BFF', rgb: { r: 0, g: 107, b: 255 } },
  { key: 'pink', label: '粉色', hex: '#FF2DA6', rgb: { r: 255, g: 45, b: 166 } },
  { key: 'yellow', label: '黄色', hex: '#FFD400', rgb: { r: 255, g: 212, b: 0 } },
  { key: 'white', label: '白色', hex: '#FFFFFF', rgb: { r: 255, g: 255, b: 255 } },
]
const selectedCutoutColor = ref('green')
const latestCutoutNodeId = ref('')
const latestCutoutColor = ref('green')
// 生成计时器
const elapsedTime = ref(0)
let timerInterval = null

const formattedTime = computed(() => {
  const mins = Math.floor(elapsedTime.value / 60)
  const secs = elapsedTime.value % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

const startTimer = () => {
  elapsedTime.value = 0
  timerInterval = setInterval(() => {
    elapsedTime.value++
  }, 1000)
}

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

const selectedCutoutColorOption = computed(() =>
  cutoutColorOptions.find(option => option.key === selectedCutoutColor.value) || cutoutColorOptions[0]
)

const canRemoveCutoutColor = computed(() => {
  return Boolean((props.data.cutoutPureUrl || props.data.url) && latestCutoutColor.value)
})

// 裁剪相关状态
const cropRatio = ref('free')
const cropRect = reactive({ x: 0, y: 0, w: 1, h: 1 })
const isCropDragging = ref(false)
const cropDragStart = reactive({ x: 0, y: 0, rectX: 0, rectY: 0 })
const isCropResizing = ref(false)
const cropResizeHandle = ref('')
const cropResizeStart = reactive({ x: 0, y: 0, rx: 0, ry: 0, rw: 0, rh: 0 })

const cropRatioOptions = [
  { label: '自由', key: 'free' },
  { label: '1:1', key: '1x1' },
  { label: '4:3', key: '4x3' },
  { label: '3:4', key: '3x4' },
  { label: '16:9', key: '16x9' },
  { label: '9:16', key: '9x16' },
]

// 扩图相关状态
const expandAmounts = reactive({ top: 0, right: 0, bottom: 0, left: 0 })
const expandUnified = ref(0)
const isExpandRectResizing = ref(false)
const expandResizeHandle = ref('')
const expandDragStart = reactive({ x: 0, y: 0 })
const expandResizeStart = reactive({ x: 0, y: 0, t: 0, r: 0, b: 0, l: 0 })

const hasExpandAmount = computed(() =>
  expandAmounts.top > 0 || expandAmounts.bottom > 0 ||
  expandAmounts.left > 0 || expandAmounts.right > 0
)

const expandOutputSize = computed(() => {
  const ow = naturalWidth.value || 0
  const oh = naturalHeight.value || 0
  return {
    w: ow + expandAmounts.left + expandAmounts.right,
    h: oh + expandAmounts.top + expandAmounts.bottom,
  }
})

const expandPreviewMetrics = computed(() => {
  const imgEl = imageRef.value
  if (!imgEl || !naturalWidth.value || !naturalHeight.value) return null

  const displayW = imgEl.clientWidth || 1
  const displayH = imgEl.clientHeight || 1
  const scaleX = displayW / naturalWidth.value
  const scaleY = displayH / naturalHeight.value

  const left = expandAmounts.left * scaleX
  const right = expandAmounts.right * scaleX
  const top = expandAmounts.top * scaleY
  const bottom = expandAmounts.bottom * scaleY

  const totalW = displayW + left + right
  const totalH = displayH + top + bottom

  return {
    displayW,
    displayH,
    totalW,
    totalH,
    left,
    right,
    top,
    bottom
  }
})

const expandStageStyle = computed(() => {
  const m = expandPreviewMetrics.value
  if (!m) return {}
  return {
    left: `${-m.left}px`,
    top: `${-m.top}px`,
    width: `${m.totalW}px`,
    height: `${m.totalH}px`,
  }
})

const expandSourceFrameStyle = computed(() => {
  const m = expandPreviewMetrics.value
  if (!m) return {}
  return {
    left: `${m.left}px`,
    top: `${m.top}px`,
    width: `${m.displayW}px`,
    height: `${m.displayH}px`,
  }
})

const expandOuterRectStyle = computed(() => {
  const m = expandPreviewMetrics.value
  if (!m) return {}
  return {
    left: '0px',
    top: '0px',
    width: `${m.totalW}px`,
    height: `${m.totalH}px`,
  }
})

const expandMaskTopStyle = computed(() => ({
  left: '0px',
  top: '0px',
  width: '100%',
  height: `${expandPreviewMetrics.value?.top || 0}px`,
}))

const expandMaskBottomStyle = computed(() => ({
  left: '0px',
  bottom: '0px',
  width: '100%',
  height: `${expandPreviewMetrics.value ? expandPreviewMetrics.value.bottom : 0}px`,
}))

const expandMaskLeftStyle = computed(() => ({
  left: '0px',
  top: `${expandPreviewMetrics.value?.top || 0}px`,
  width: `${expandPreviewMetrics.value?.left || 0}px`,
  height: `${expandPreviewMetrics.value?.displayH || 0}px`,
}))

const expandMaskRightStyle = computed(() => ({
  right: '0px',
  top: `${expandPreviewMetrics.value?.top || 0}px`,
  width: `${expandPreviewMetrics.value ? expandPreviewMetrics.value.right : 0}px`,
  height: `${expandPreviewMetrics.value?.displayH || 0}px`,
}))

const expandRectStyle = computed(() => ({
  left: `${expandPreviewMetrics.value?.left || 0}px`,
  top: `${expandPreviewMetrics.value?.top || 0}px`,
  width: `${expandPreviewMetrics.value?.displayW || 0}px`,
  height: `${expandPreviewMetrics.value?.displayH || 0}px`,
}))

const applyUnifiedExpand = () => {
  const val = expandUnified.value || 0
  expandAmounts.top = val
  expandAmounts.bottom = val
  expandAmounts.left = val
  expandAmounts.right = val
}

const handleExpandSizeInput = (dim, event) => {
  const val = parseInt(event.target.value)
  if (isNaN(val) || val <= 0) return
  const ow = naturalWidth.value || 1
  const oh = naturalHeight.value || 1
  const current = expandOutputSize.value

  if (dim === 'w') {
    const newW = Math.max(ow, Math.min(val, ow + 4000))
    const diff = newW - current.w
    const half = Math.round(diff / 2)
    expandAmounts.left = Math.max(0, expandAmounts.left + half)
    expandAmounts.right = Math.max(0, expandAmounts.right + (diff - half))
  } else {
    const newH = Math.max(oh, Math.min(val, oh + 4000))
    const diff = newH - current.h
    const half = Math.round(diff / 2)
    expandAmounts.top = Math.max(0, expandAmounts.top + half)
    expandAmounts.bottom = Math.max(0, expandAmounts.bottom + (diff - half))
  }
}

const handleExpandReset = () => {
  expandAmounts.top = 0
  expandAmounts.bottom = 0
  expandAmounts.left = 0
  expandAmounts.right = 0
  expandUnified.value = 0
}

const handleExpandApply = async () => {
  if (!props.data.url || !hasExpandAmount.value) return
  processing.value = true

  try {
    // 先加载图片数据，再显示 loading（避免 ref 被销毁）
    const imagePayload = await resolveReferenceImagePayload(props.data.url)
    if (!imagePayload) throw new Error('无法读取原图数据')

    updateNode(props.id, { loading: true, loadingText: '扩图中...' }, false)

    const expandPrompt = `请将这张图片向外扩展。上边扩展${expandAmounts.top}像素，下边扩展${expandAmounts.bottom}像素，左边扩展${expandAmounts.left}像素，右边扩展${expandAmounts.right}像素。根据原始图片的风格、光影、纹理和内容，自然地填充新扩展的区域。保持原图内容完全不变，不要裁剪或更改原始图片区域。`

    const res = await imageApi.generate({
      model: FEATURE_MODELS.expand,
      prompt: expandPrompt,
      size: localRatio.value,
      resolution: localResolution.value,
      images: [{ data: imagePayload, label: '原图', role: 'base_image', isSelf: true }],
      n: 1
    })

    const imageResult = res?.[0]
    if (!imageResult?.url) throw new Error('API 未返回图片')

    // 在原图上直接更新，不创建新节点
    try {
      const localUrl = await downloadImage(imageResult.url, projectName.value)
      updateNode(props.id, { url: localUrl, loading: false, loadingText: undefined })
      saveProject()
    } catch (err) {
      console.warn('[ImageNode] 保存扩图结果失败:', err)
      updateNode(props.id, { url: imageResult.url, loading: false, loadingText: undefined })
    }

    window.$message?.success('扩图完成')
    activeConfig.value = null
  } catch (err) {
    console.error('[ImageNode] Expand error:', err)
    updateNode(props.id, { loading: false }, false)
    window.$message?.error(err.message || '扩图失败')
  } finally {
    processing.value = false
  }
}

// Get pixel scale factor (screen pixels → image pixels)
const getExpandPixelScale = () => {
  const imgEl = imageRef.value
  if (!imgEl) return { x: 1, y: 1 }
  const dispW = imgEl.clientWidth || 1
  const dispH = imgEl.clientHeight || 1
  const natW = naturalWidth.value || dispW
  const natH = naturalHeight.value || dispH
  return { x: natW / dispW, y: natH / dispH }
}

// ==================== 扩图框拖拽移动 ====================
// ==================== 扩图框缩放拖拽 ====================
const onExpandResizeStart = (e, handle) => {
  isExpandRectResizing.value = true
  expandResizeHandle.value = handle
  expandDragStart.x = e.clientX
  expandDragStart.y = e.clientY
  expandResizeStart.t = expandAmounts.top
  expandResizeStart.r = expandAmounts.right
  expandResizeStart.b = expandAmounts.bottom
  expandResizeStart.l = expandAmounts.left
  document.addEventListener('mousemove', onExpandResizeMove)
  document.addEventListener('mouseup', onExpandResizeEnd)
}

const onExpandResizeMove = (e) => {
  if (!isExpandRectResizing.value) return
  const scale = getExpandPixelScale()
  const dx = Math.round((e.clientX - expandDragStart.x) * scale.x)
  const dy = Math.round((e.clientY - expandDragStart.y) * scale.y)
  const { t, r, b, l } = expandResizeStart

  switch (expandResizeHandle.value) {
    case 'se':
      expandAmounts.right = Math.max(0, r + dx)
      expandAmounts.bottom = Math.max(0, b + dy)
      break
    case 'sw':
      expandAmounts.left = Math.max(0, l - dx)
      expandAmounts.bottom = Math.max(0, b + dy)
      break
    case 'ne':
      expandAmounts.right = Math.max(0, r + dx)
      expandAmounts.top = Math.max(0, t - dy)
      break
    case 'nw':
      expandAmounts.left = Math.max(0, l - dx)
      expandAmounts.top = Math.max(0, t - dy)
      break
    case 'e':
      expandAmounts.right = Math.max(0, r + dx)
      break
    case 'w':
      expandAmounts.left = Math.max(0, l - dx)
      break
    case 's':
      expandAmounts.bottom = Math.max(0, b + dy)
      break
    case 'n':
      expandAmounts.top = Math.max(0, t - dy)
      break
  }

  expandUnified.value = Math.max(expandAmounts.top, expandAmounts.bottom, expandAmounts.left, expandAmounts.right)
}

const onExpandResizeEnd = () => {
  isExpandRectResizing.value = false
  expandResizeHandle.value = ''
  document.removeEventListener('mousemove', onExpandResizeMove)
  document.removeEventListener('mouseup', onExpandResizeEnd)
}

// 当前选中的比例对应的宽高比（仅用于约束）
const targetRatio = computed(() => {
  if (cropRatio.value === 'free') return null
  const [rw, rh] = cropRatio.value.split('x').map(Number)
  return rw / rh
})

// 裁剪矩形样式（百分比位置）
const cropRectStyle = computed(() => ({
  left: `${cropRect.x * 100}%`,
  top: `${cropRect.y * 100}%`,
  width: `${cropRect.w * 100}%`,
  height: `${cropRect.h * 100}%`,
}))

// 将百分比坐标归一化到 [0,1] 并保证最小尺寸
function normalizeCropRect() {
  const MIN_SIZE = 0.05 // 最小占图片 5%
  cropRect.x = Math.max(0, Math.min(cropRect.x, 1 - cropRect.w))
  cropRect.y = Math.max(0, Math.min(cropRect.y, 1 - cropRect.h))
  cropRect.w = Math.max(MIN_SIZE, Math.min(cropRect.w, 1))
  cropRect.h = Math.max(MIN_SIZE, Math.min(cropRect.h, 1))
}

// 监听比例切换 → 重新计算裁切框（居中）
watch(cropRatio, (ratio) => {
  if (ratio === 'free') {
    cropRect.x = 0; cropRect.y = 0; cropRect.w = 1; cropRect.h = 1
    return
  }
  const imgEl = imageRef.value
  if (!imgEl) return
  const dispW = imgEl.clientWidth
  const dispH = imgEl.clientHeight
  if (!dispW || !dispH) return
  const [rw, rh] = ratio.split('x').map(Number)
  const tr = rw / rh
  const imgRatio = dispW / dispH

  let w, h
  if (imgRatio > tr) {
    h = 1
    w = tr / imgRatio
  } else {
    w = 1
    h = imgRatio / tr
  }
  cropRect.w = w
  cropRect.h = h
  cropRect.x = (1 - w) / 2
  cropRect.y = (1 - h) / 2
})

// ==================== 拖拽移动 ====================
const onCropDragStart = (e) => {
  if (isCropResizing.value) return
  isCropDragging.value = true
  cropDragStart.x = e.clientX
  cropDragStart.y = e.clientY
  cropDragStart.rectX = cropRect.x
  cropDragStart.rectY = cropRect.y
  document.addEventListener('mousemove', onCropDragMove)
  document.addEventListener('mouseup', onCropDragEnd)
}

const onCropDragMove = (e) => {
  if (!isCropDragging.value) return
  const imgEl = imageRef.value
  if (!imgEl) return
  const dx = (e.clientX - cropDragStart.x) / imgEl.clientWidth
  const dy = (e.clientY - cropDragStart.y) / imgEl.clientHeight
  cropRect.x = Math.max(0, Math.min(cropDragStart.rectX + dx, 1 - cropRect.w))
  cropRect.y = Math.max(0, Math.min(cropDragStart.rectY + dy, 1 - cropRect.h))
}

const onCropDragEnd = () => {
  isCropDragging.value = false
  document.removeEventListener('mousemove', onCropDragMove)
  document.removeEventListener('mouseup', onCropDragEnd)
}

// ==================== 缩放拖拽 ====================
const onResizeStart = (e, handle) => {
  isCropResizing.value = true
  cropResizeHandle.value = handle
  cropResizeStart.x = e.clientX
  cropResizeStart.y = e.clientY
  cropResizeStart.rx = cropRect.x
  cropResizeStart.ry = cropRect.y
  cropResizeStart.rw = cropRect.w
  cropResizeStart.rh = cropRect.h
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}

const onResizeMove = (e) => {
  if (!isCropResizing.value) return
  const imgEl = imageRef.value
  if (!imgEl) return
  const dx = (e.clientX - cropResizeStart.x) / imgEl.clientWidth
  const dy = (e.clientY - cropResizeStart.y) / imgEl.clientHeight
  const tr = targetRatio.value
  const handle = cropResizeHandle.value
  let { rx, ry, rw, rh } = cropResizeStart

  switch (handle) {
    case 'se':
      rw = cropResizeStart.rw + dx
      rh = tr ? rw / tr : cropResizeStart.rh + dy
      break
    case 'sw':
      rw = cropResizeStart.rw - dx
      rh = tr ? rw / tr : cropResizeStart.rh + dy
      rx = cropResizeStart.rx + dx
      break
    case 'ne':
      rw = cropResizeStart.rw + dx
      rh = tr ? rw / tr : cropResizeStart.rh - dy
      ry = tr ? cropResizeStart.ry + (cropResizeStart.rh - rh) : cropResizeStart.ry + dy
      break
    case 'nw':
      rw = cropResizeStart.rw - dx
      rh = tr ? rw / tr : cropResizeStart.rh - dy
      rx = cropResizeStart.rx + dx
      ry = tr ? cropResizeStart.ry + (cropResizeStart.rh - rh) : cropResizeStart.ry + dy
      break
    case 'e':
      rw = cropResizeStart.rw + dx
      if (tr) rh = rw / tr
      break
    case 'w':
      rw = cropResizeStart.rw - dx
      rx = cropResizeStart.rx + dx
      if (tr) rh = rw / tr
      break
    case 's':
      rh = cropResizeStart.rh + dy
      if (tr) rw = rh * tr
      break
    case 'n':
      rh = cropResizeStart.rh - dy
      ry = cropResizeStart.ry + dy
      if (tr) rw = rh * tr
      break
  }

  cropRect.x = Math.max(0, rx)
  cropRect.y = Math.max(0, ry)
  cropRect.w = Math.max(0.05, Math.min(rw, 1 - cropRect.x))
  cropRect.h = tr ? cropRect.w / tr : Math.max(0.05, Math.min(rh, 1 - cropRect.y))
  if (tr) {
    // 比例锁定：用 w 重新算 h
    cropRect.h = cropRect.w / tr
    // 如果超出下边界，整体上移
    if (cropRect.y + cropRect.h > 1) {
      cropRect.y = Math.max(0, 1 - cropRect.h)
    }
  }
}

const onResizeEnd = () => {
  isCropResizing.value = false
  cropResizeHandle.value = ''
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  normalizeCropRect()
}

// ==================== 比例选择 / 重置 ====================
const handleCropRatioSelect = (ratio) => {
  cropRatio.value = ratio
}

const handleCropReset = () => {
  cropRatio.value = 'free'
  cropRect.x = 0; cropRect.y = 0; cropRect.w = 1; cropRect.h = 1
}

// 用户手动输入像素尺寸
const handleCropSizeInput = (dim, event) => {
  const val = parseInt(event.target.value)
  if (isNaN(val) || val <= 0) return
  const imgW = naturalWidth.value || 1
  const imgH = naturalHeight.value || 1
  const tr = targetRatio.value

  if (dim === 'w') {
    const newW = Math.max(1, Math.min(val, imgW)) / imgW
    cropRect.w = newW
    if (tr) {
      cropRect.h = newW / tr
    }
  } else {
    const newH = Math.max(1, Math.min(val, imgH)) / imgH
    cropRect.h = newH
    if (tr) {
      cropRect.w = newH * tr
    }
  }

  // 确保不越界
  if (cropRect.x + cropRect.w > 1) cropRect.x = Math.max(0, 1 - cropRect.w)
  if (cropRect.y + cropRect.h > 1) cropRect.y = Math.max(0, 1 - cropRect.h)
}

const handleCropApply = async () => {
  if (!props.data.url) return
  processing.value = true
  updateNode(props.id, { loading: true, loadingText: '裁剪中...' }, false)

  try {
    const imgEl = imageRef.value
    if (!imgEl) throw new Error('找不到图片')
    const natW = imgEl.naturalWidth || imgEl.width
    const natH = imgEl.naturalHeight || imgEl.height
    const px = Math.round(cropRect.x * natW)
    const py = Math.round(cropRect.y * natH)
    const pw = Math.round(cropRect.w * natW)
    const ph = Math.round(cropRect.h * natH)

    if (pw <= 0 || ph <= 0) throw new Error('裁剪区域无效')

    const { imageCrop } = await import('../../skills/imageCrop')
    const result = await imageCrop({ imageUrl: props.data.url, x: px, y: py, width: pw, height: ph })
    if (!result?.url) throw new Error('裁剪失败')

    const currentNode = nodes.value.find(n => n.id === props.id)
    const nodeX = currentNode?.position?.x || 0
    const nodeY = currentNode?.position?.y || 0

    const outputNodeId = addNode('image', { x: nodeX + 450, y: nodeY }, {
      url: result.url,
      label: '裁剪结果',
    })

    updateNode(props.id, { loading: false }, false)

    try {
      const localUrl = await downloadImage(result.url, projectName.value)
      updateNode(outputNodeId, { url: localUrl }, false)
      saveProject()
    } catch (err) {
      console.warn('[ImageNode] 保存裁剪结果失败:', err)
    }

    addEdge({ source: props.id, target: outputNodeId, sourceHandle: 'right', targetHandle: 'left', type: 'default' })
    setTimeout(() => updateNodeInternals(outputNodeId), 50)
    window.$message?.success('裁剪完成')
    activeConfig.value = null
  } catch (err) {
    console.error('[ImageNode] Crop error:', err)
    updateNode(props.id, { loading: false }, false)
    window.$message?.error(err.message || '裁剪失败')
  } finally {
    processing.value = false
  }
}

// ==================== 重绘状态（画笔） ====================
const redrawPrompt = ref('')
const redrawCanvasRef = ref(null)
const redrawBrushSize = ref(20)
const redrawBrushPresets = [8, 16, 30, 50, 80]
const redrawBrushColor = ref('#ff5050')
const redrawBrushOpacity = ref(0.35)
const redrawBrushColorPresets = ['#ff5050', '#ff8800', '#ffcc00', '#44cc44', '#44ccff', '#6688ff', '#cc66ff', '#ffffff', '#888888']
const isRedrawDrawing = ref(false)
const lastRedrawPos = ref(null)
const hasRedrawStroke = ref(false)

// 初始化或重置画布
function initRedrawCanvas() {
  const canvas = redrawCanvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, rect.width, rect.height)
  hasRedrawStroke.value = false
}

// 获取画布上涂抹区域的遮罩数据（缩放到自然尺寸）
function getMaskFromCanvas(imgW, imgH) {
  const canvas = redrawCanvasRef.value
  if (!canvas) return null

  // 使用当前画布显示尺寸，而非初始化时的 canvas.width/dpr
  const rect = canvas.getBoundingClientRect()
  const dispW = Math.round(rect.width)
  const dispH = Math.round(rect.height)
  if (dispW < 1 || dispH < 1) return null

  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = imgW
  maskCanvas.height = imgH
  const ctx = maskCanvas.getContext('2d')
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, imgW, imgH)

  // 把画布上任何有透明度的笔迹转为二值化遮罩
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = dispW
  tempCanvas.height = dispH
  const tempCtx = tempCanvas.getContext('2d')
  // 将画布的原始像素缩放到当前显示尺寸
  tempCtx.drawImage(canvas, 0, 0, dispW, dispH)

  // 获取像素数据并创建二值遮罩
  const tempData = tempCtx.getImageData(0, 0, dispW, dispH)
  const binaryCanvas = document.createElement('canvas')
  binaryCanvas.width = dispW
  binaryCanvas.height = dispH
  const binCtx = binaryCanvas.getContext('2d')
  const binData = binCtx.createImageData(dispW, dispH)
  for (let i = 0; i < tempData.data.length; i += 4) {
    const alpha = tempData.data[i + 3]
    if (alpha > 10) {
      binData.data[i] = 255
      binData.data[i + 1] = 255
      binData.data[i + 2] = 255
      binData.data[i + 3] = 255
    } else {
      binData.data[i] = 0
      binData.data[i + 1] = 0
      binData.data[i + 2] = 0
      binData.data[i + 3] = 255
    }
  }
  binCtx.putImageData(binData, 0, 0)

  // 从显示分辨率缩放到图片自然尺寸
  ctx.drawImage(binaryCanvas, 0, 0, dispW, dispH, 0, 0, imgW, imgH)
  return maskCanvas.toDataURL('image/png')
}

// 画笔绘制
function getRedrawCanvasPos(e) {
  const canvas = redrawCanvasRef.value
  if (!canvas) return { x: 0, y: 0 }
  const rect = canvas.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

const onRedrawCanvasStart = (e) => {
  isRedrawDrawing.value = true
  hasRedrawStroke.value = true
  const pos = getRedrawCanvasPos(e)
  lastRedrawPos.value = pos
  const canvas = redrawCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = redrawBrushColor.value
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, redrawBrushSize.value / 2, 0, Math.PI * 2)
  ctx.fill()
}

const onRedrawCanvasMove = (e) => {
  if (!isRedrawDrawing.value) return
  hasRedrawStroke.value = true
  const pos = getRedrawCanvasPos(e)
  const canvas = redrawCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.globalCompositeOperation = 'source-over'
  ctx.strokeStyle = redrawBrushColor.value
  ctx.lineWidth = redrawBrushSize.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  if (lastRedrawPos.value) {
    ctx.moveTo(lastRedrawPos.value.x, lastRedrawPos.value.y)
  } else {
    ctx.moveTo(pos.x, pos.y)
  }
  ctx.lineTo(pos.x, pos.y)
  ctx.stroke()
  lastRedrawPos.value = pos
}

const onRedrawCanvasEnd = () => {
  isRedrawDrawing.value = false
  lastRedrawPos.value = null
}

const handleRedrawClear = () => {
  initRedrawCanvas()
}

const handleRedrawClose = () => {
  redrawPrompt.value = ''
  activeConfig.value = null
}

// 进入重绘模式时初始化画布
watch(() => activeConfig.value, (cfg, prevCfg) => {
  // 打开任意配置时禁止拖动节点，关闭时恢复拖动
  if (cfg && !prevCfg) {
    updateNode(props.id, { draggable: false })
  } else if (!cfg && prevCfg) {
    updateNode(props.id, { draggable: true })
  }

  if (cfg === 'redraw' || cfg === 'erase') {
    nextTick(() => initRedrawCanvas())
  }
})

const handleRedrawApply = async () => {
  if (!props.data.url || !redrawPrompt.value.trim()) return
  if (!hasRedrawStroke.value) {
    window.$message?.warning('请先涂抹需要重绘的区域')
    return
  }
  processing.value = true

  try {
    // 先捕获遮罩和图片数据，再设置 loading（防止 ref 被销毁）
    const imgEl = imageRef.value
    if (!imgEl) throw new Error('找不到图片')
    const natW = imgEl.naturalWidth || imgEl.width
    const natH = imgEl.naturalHeight || imgEl.height

    const maskDataUrl = getMaskFromCanvas(natW, natH)
    if (!maskDataUrl) throw new Error('无法生成遮罩')

    const imagePayload = await resolveReferenceImagePayload(props.data.url)
    if (!imagePayload) throw new Error('无法读取原图数据')

    updateNode(props.id, { loading: true, loadingText: '重绘中...' }, false)

    const finalPrompt = `请对图片中用户涂抹的区域进行重绘。要求：${redrawPrompt.value}。只修改涂抹区域内的内容，涂抹区域外的部分保持原样不变。保持原图的风格、光影、色彩和画质一致。`

    const res = await imageApi.generate({
      model: FEATURE_MODELS.redraw,
      prompt: finalPrompt,
      size: localRatio.value,
      resolution: localResolution.value,
      images: [{
        data: imagePayload,
        label: '原图',
        role: 'base_image',
        isSelf: true,
        mask: maskDataUrl,
      }, {
        data: maskDataUrl,
        label: '编辑遮罩',
        role: 'edit_mask',
      }],
      n: 1,
    })

    const imageResult = res?.[0]
    if (!imageResult?.url) throw new Error('API 未返回图片')

    // 在原图上直接更新，不创建新节点
    try {
      const localUrl = await downloadImage(imageResult.url, projectName.value)
      updateNode(props.id, { url: localUrl, loading: false, loadingText: undefined })
      saveProject()
    } catch (err) {
      console.warn('[ImageNode] 保存重绘结果失败:', err)
      updateNode(props.id, { url: imageResult.url, loading: false, loadingText: undefined })
    }

    window.$message?.success('重绘完成')
    activeConfig.value = null
    redrawPrompt.value = ''
  } catch (err) {
    console.error('[ImageNode] Redraw error:', err)
    updateNode(props.id, { loading: false }, false)
    window.$message?.error(err.message || '重绘失败')
  } finally {
    processing.value = false
  }
}

// ==================== 擦除 ====================
const handleEraseApply = async () => {
  if (!props.data.url) return
  if (!hasRedrawStroke.value) {
    window.$message?.warning('请先涂抹需要擦除的区域')
    return
  }
  processing.value = true

  try {
    // 先捕获遮罩和图片数据，再设置 loading（防止 ref 被销毁）
    const imgEl = imageRef.value
    if (!imgEl) throw new Error('找不到图片')
    const natW = imgEl.naturalWidth || imgEl.width
    const natH = imgEl.naturalHeight || imgEl.height

    const maskDataUrl = getMaskFromCanvas(natW, natH)
    if (!maskDataUrl) throw new Error('无法生成遮罩')

    const imagePayload = await resolveReferenceImagePayload(props.data.url)
    if (!imagePayload) throw new Error('无法读取原图数据')

    updateNode(props.id, { loading: true, loadingText: '擦除中...' }, false)

    const erasePrompt = [
      '这是一次严格的局部擦除任务。',
      '请同时参考原图和遮罩图：遮罩图中只有白色区域允许被修改，黑色区域必须像锁定一样保持像素内容不变。',
      '如果原图里存在多个文字、标识、图案或主体，只能移除白色遮罩覆盖到的那一部分。',
      '任何没有被白色遮罩覆盖的文字都必须完整保留，绝对不要一起删除。',
      '请仅擦除原图中对应白色区域内的内容，并使用周围背景进行自然、无痕的补全。',
      '不要改动白色区域以外的任何内容，保持原图的构图、光影、色彩和画质一致。'
    ].join('')

    const res = await imageApi.generate({
      model: FEATURE_MODELS.erase,
      prompt: erasePrompt,
      size: localRatio.value,
      resolution: localResolution.value,
      images: [{
        data: imagePayload,
        label: '原图',
        role: 'base_image',
        isSelf: true,
        mask: maskDataUrl,
      }, {
        data: maskDataUrl,
        label: '编辑遮罩',
        role: 'edit_mask',
      }],
      n: 1,
    })

    const imageResult = res?.[0]
    if (!imageResult?.url) throw new Error('API 未返回图片')

    // 在原图上直接更新，不创建新节点
    try {
      const localUrl = await downloadImage(imageResult.url, projectName.value)
      updateNode(props.id, { url: localUrl, loading: false, loadingText: undefined })
      saveProject()
    } catch (err) {
      console.warn('[ImageNode] 保存擦除结果失败:', err)
      updateNode(props.id, { url: imageResult.url, loading: false, loadingText: undefined })
    }

    window.$message?.success('擦除完成')
    activeConfig.value = null
  } catch (err) {
    console.error('[ImageNode] Erase error:', err)
    updateNode(props.id, { loading: false }, false)
    window.$message?.error(err.message || '擦除失败')
  } finally {
    processing.value = false
  }
}

const handleEraseClose = () => {
  activeConfig.value = null
}

const loadImageElement = (src) => new Promise((resolve, reject) => {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => resolve(img)
  img.onerror = () => reject(new Error('图片加载失败'))
  img.src = src
})

const removeSolidColorLocally = async (imageUrl, targetColor) => {
  const img = await loadImageElement(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  const width = canvas.width
  const height = canvas.height
  const alphaMap = new Float32Array(width * height)
  const softMask = new Uint8Array(width * height)

  const normalize = (v) => v / 255
  const target = {
    r: normalize(targetColor.r),
    g: normalize(targetColor.g),
    b: normalize(targetColor.b),
  }

  const dominantIndex =
    target.g >= target.r && target.g >= target.b ? 1 :
    target.b >= target.r && target.b >= target.g ? 2 : 0

  const smoothstep = (edge0, edge1, x) => {
    const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(edge1 - edge0, 1e-6)))
    return t * t * (3 - 2 * t)
  }

  for (let flat = 0; flat < width * height; flat++) {
    const idx = flat * 4
    const r = normalize(data[idx])
    const g = normalize(data[idx + 1])
    const b = normalize(data[idx + 2])

    const channels = [r, g, b]
    const key = channels[dominantIndex]
    const others = channels.filter((_, i) => i !== dominantIndex)
    const maxOther = Math.max(...others)
    const minOther = Math.min(...others)

    const colorDiff = Math.sqrt(
      (r - target.r) * (r - target.r) +
      (g - target.g) * (g - target.g) +
      (b - target.b) * (b - target.b)
    )

    const dominance = key - maxOther
    const saturationBias = key - minOther

    // 软抠像：纯背景 alpha 接近 0，主体 alpha 接近 1
    const keepFromDiff = smoothstep(0.16, 0.38, colorDiff)
    const keepFromDominance = 1 - smoothstep(0.08, 0.34, dominance)
    const keepFromBias = 1 - smoothstep(0.06, 0.28, saturationBias)
    let alpha = Math.max(keepFromDiff, keepFromDominance * 0.9, keepFromBias * 0.82)

    // 非纯色通道更强时，强制更偏向保留主体
    if (maxOther > key * 0.92) {
      alpha = Math.max(alpha, 0.82)
    }

    alphaMap[flat] = Math.max(0, Math.min(1, alpha))
    if (alphaMap[flat] < 0.995) softMask[flat] = 1
  }

  // 简单羽化 alpha，减少硬边
  const blurredAlpha = new Float32Array(alphaMap)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const flat = y * width + x
      let sum = alphaMap[flat] * 4
      sum += alphaMap[flat - 1]
      sum += alphaMap[flat + 1]
      sum += alphaMap[flat - width]
      sum += alphaMap[flat + width]
      blurredAlpha[flat] = sum / 8
    }
  }

  for (let flat = 0; flat < width * height; flat++) {
    const idx = flat * 4
    const x = flat % width
    const y = Math.floor(flat / width)

    let alpha = blurredAlpha[flat]

    // 画面边缘更倾向于背景透明，帮助去掉大片纯色背景
    if (x <= 1 || y <= 1 || x >= width - 2 || y >= height - 2) {
      alpha = Math.min(alpha, alphaMap[flat] * 0.65)
    }

    const outAlpha = Math.max(0, Math.min(255, Math.round(alpha * data[idx + 3])))
    data[idx + 3] = outAlpha
  }

  // 高级 despill：根据 alpha 强度去除边缘目标纯色污染
  for (let flat = 0; flat < width * height; flat++) {
    const idx = flat * 4
    const alpha = data[idx + 3] / 255
    if (alpha <= 0 || alpha >= 0.995) continue

    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const key = dominantIndex === 0 ? r : dominantIndex === 1 ? g : b
    const otherA = dominantIndex === 0 ? g : r
    const otherB = dominantIndex === 2 ? g : b
    const base = Math.max(otherA, otherB)
    const spill = Math.max(0, key - base)
    if (spill <= 0) continue

    const spillFactor = (1 - alpha) * 1.25
    const corrected = Math.round(base + spill * Math.max(0.08, 1 - spillFactor))

    if (dominantIndex === 0) {
      data[idx] = Math.min(data[idx], corrected)
    } else if (dominantIndex === 1) {
      data[idx + 1] = Math.min(data[idx + 1], corrected)
    } else {
      data[idx + 2] = Math.min(data[idx + 2], corrected)
    }

    // 边缘混一点邻近主体颜色，进一步吃掉发绿边
    const sampleOffsets = [-1, 1, -width, width, -width - 1, -width + 1, width - 1, width + 1]
    const sum = [0, 0, 0]
    let count = 0
    for (const offset of sampleOffsets) {
      const nFlat = flat + offset
      if (nFlat < 0 || nFlat >= width * height) continue
      const nIdx = nFlat * 4
      const nAlpha = data[nIdx + 3] / 255
      if (nAlpha < 0.9) continue
      sum[0] += data[nIdx]
      sum[1] += data[nIdx + 1]
      sum[2] += data[nIdx + 2]
      count++
    }

    if (count > 0) {
      const mix = Math.min(0.78, (1 - alpha) * 0.95)
      data[idx] = Math.round(data[idx] * (1 - mix) + (sum[0] / count) * mix)
      data[idx + 1] = Math.round(data[idx + 1] * (1 - mix) + (sum[1] / count) * mix)
      data[idx + 2] = Math.round(data[idx + 2] * (1 - mix) + (sum[2] / count) * mix)
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

const handleCutoutApply = async () => {
  if (!props.data.url) return
  processing.value = true
  updateNode(props.id, { loading: true, loadingText: '纯色抠图中...' }, false)

  try {
    const imagePayload = await resolveReferenceImagePayload(props.data.url)
    if (!imagePayload) throw new Error('无法读取原图数据')
    const cutoutColor = selectedCutoutColorOption.value

    const cutoutPrompt = [
      '请保留原图中的唯一主体、人物或主要物体。',
      `除了主体之外，把后面的背景和四周环境全部替换为单一、纯净、均匀、没有渐变的纯色背景，颜色必须是 ${cutoutColor.label} ${cutoutColor.hex}。`,
      '不要保留任何原始背景细节、纹理、文字、阴影、花纹、噪点或杂色。',
      '主体本身不能变形，边缘要清晰完整，不要裁掉手脚、头发、轮廓或配饰。',
      '除了把背景改成指定纯色之外，不要改动主体的造型、配色、光影和细节。'
    ].join('')

    const res = await imageApi.generate({
      model: FEATURE_MODELS.cutout,
      prompt: cutoutPrompt,
      size: localRatio.value,
      resolution: localResolution.value,
      images: [{ data: imagePayload, label: '原图', role: 'base_image', isSelf: true }],
      n: 1,
    })

    const imageResult = res?.[0]
    if (!imageResult?.url) throw new Error('API 未返回纯色背景图')

    latestCutoutNodeId.value = props.id
    latestCutoutColor.value = cutoutColor.key

    updateNode(props.id, {
      url: imageResult.url,
      loading: false,
      loadingText: undefined,
      cutoutPureUrl: imageResult.url,
      cutoutBgColor: cutoutColor.key,
      cutoutBgHex: cutoutColor.hex,
      cutoutBgRemoved: false,
    }, false)

    try {
      const localUrl = await downloadImage(imageResult.url, projectName.value)
      updateNode(props.id, { url: localUrl, cutoutPureUrl: imageResult.url }, false)
      saveProject()
    } catch (err) {
      console.warn('[ImageNode] 保存抠图结果失败:', err)
    }

    setTimeout(() => updateNodeInternals(props.id), 50)
    window.$message?.success('纯色背景图已生成，接着点击“去除纯色”即可')
    activeConfig.value = null
  } catch (err) {
    console.error('[ImageNode] 抠图失败:', err)
    window.$message?.error(err.message || '抠图失败')
  } finally {
    updateNode(props.id, { loading: false, loadingText: undefined }, false)
    processing.value = false
  }
}

const handleRemoveCutoutColor = async () => {
  const sourceUrl = props.data.cutoutPureUrl || props.data.url
  if (!sourceUrl || !latestCutoutColor.value) {
    window.$message?.warning('请先生成纯色背景图')
    return
  }

  const colorKey = props.data.cutoutBgColor || latestCutoutColor.value
  const targetColor = cutoutColorOptions.find(option => option.key === colorKey) || selectedCutoutColorOption.value

  processing.value = true
  updateNode(props.id, { loading: true, loadingText: '去除纯色中...' }, false)

  try {
    const transparentDataUrl = await removeSolidColorLocally(sourceUrl, targetColor.rgb)
    let finalUrl = transparentDataUrl

    try {
      finalUrl = await downloadImage(transparentDataUrl, projectName.value)
      saveProject()
    } catch (err) {
      console.warn('[ImageNode] 保存去纯色结果失败:', err)
    }

    updateNode(props.id, {
      url: finalUrl,
      loading: false,
      loadingText: undefined,
      cutoutBgRemoved: true,
      cutoutTransparentUrl: finalUrl,
    }, false)
    window.$message?.success('纯色背景已去除')
  } catch (err) {
    console.error('[ImageNode] 去除纯色失败:', err)
    updateNode(props.id, { loading: false, loadingText: undefined }, false)
    window.$message?.error(err.message || '去除纯色失败')
  } finally {
    processing.value = false
  }
}

onBeforeUnmount(() => {
  stopTimer()
  document.removeEventListener('mousemove', onCropDragMove)
  document.removeEventListener('mouseup', onCropDragEnd)
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.removeEventListener('mousemove', onExpandResizeMove)
  document.removeEventListener('mouseup', onExpandResizeEnd)
})

onMounted(() => {
  // 从节点持久化数据回填用户上次的输入与参数
  const draft = props.data.generationDraft || {}
  if (draft.prompt || props.data.userPrompt) promptText.value = draft.prompt || props.data.userPrompt
  if (draft.model || props.data.userModel) localModel.value = normalizeModelKey(draft.model || props.data.userModel)
  if (draft.ratio || props.data.userRatio) localRatio.value = draft.ratio || props.data.userRatio
  if (draft.resolution || props.data.userResolution) localResolution.value = draft.resolution || props.data.userResolution
  if (draft.style) promptStyle.value = draft.style
  if (draft.count) localImageCount.value = draft.count

  // 检查图片是否已加载完成（缓存图片可能不会触发 @load）
  if (imageRef.value?.complete) {
    naturalWidth.value = imageRef.value.naturalWidth
    naturalHeight.value = imageRef.value.naturalHeight
  }

  nextTick(() => {
    renderEditorFromPromptText()
  })
})

// data.url 变化后重新检查图片加载状态
watch(() => props.data.url, () => {
  nextTick(() => {
    if (imageRef.value?.complete) {
      naturalWidth.value = imageRef.value.naturalWidth
      naturalHeight.value = imageRef.value.naturalHeight
    }
  })
})

// 面板显示状态：只要面板重新挂载，就回填编辑器内容（取消选中 → 再次选中时生效）
watch(() => isSingleSelected.value && !props.data.loading && !activeConfig.value, (visible) => {
  if (visible) {
    nextTick(() => {
      renderEditorFromPromptText()
    })
  }
})

// 监听 loading 状态自动控制计时器
watch(() => props.data.loading, (loading) => {
  if (loading) {
    startTimer()
  } else {
    stopTimer()
  }
}, { immediate: true })
const localModel = ref(DEFAULT_IMAGE_MODEL)
const localScale = ref(2)
const imageRef = ref(null)
const naturalWidth = ref(0)
const naturalHeight = ref(0)

// 文生图相关状态
const localRatio = ref(DEFAULT_IMAGE_SIZE)
const localResolution = ref('1K')
const promptText = ref('')
const panelExpanded = ref(false)
const localImageCount = ref(1)

// 风格选择
const promptStyle = ref('3D卡通')
const styleOptions = [
  { label: '3D卡通', key: '3D卡通', prompt: '3D卡通风格，明亮配色，儿童友好的动画质感' },
  { label: '写实', key: '写实', prompt: '照片级写实风格，真实光影与材质细节' },
  { label: '日系动漫', key: '日系动漫', prompt: '日系动漫风格，赛璐璐上色，清新明亮' },
  { label: '水彩', key: '水彩', prompt: '手绘水彩风格，柔和的色彩过渡与纸张纹理' },
  { label: '油画', key: '油画', prompt: '古典油画风格，厚重质感与细腻笔触' },
  { label: '赛博朋克', key: '赛博朋克', prompt: '赛博朋克风格，霓虹灯光，高对比度' },
  { label: '水墨', key: '水墨', prompt: '中国水墨画风格，墨色浓淡渲染，留白意境' },
  { label: '像素', key: '像素', prompt: '像素艺术风格，复古游戏画面质感' },
  { label: '素描', key: '素描', prompt: '铅笔素描风格，黑白灰调子与排线纹理' },
  { label: '扁平插图', key: '扁平插图', prompt: '扁平矢量插图风格，纯色块与简洁几何造型' },
  { label: '自定义', key: '自定义', prompt: '' },
]
const displayStyle = computed(() => {
  return styleOptions.find(o => o.key === promptStyle.value)?.label || '3D卡通'
})

// 获取所有输入的参考图片（从连接的节点）
const inputImages = computed(() => {
  const images = []
  const incomingEdges = edges.value.filter(e => e.target === props.id)
  for (const edge of incomingEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (sourceNode?.type === 'image' && sourceNode.data?.url) {
      images.push({
        url: sourceNode.data.url,
        role: edge.data?.imageRole || 'input_reference',
        nodeId: sourceNode.id,
        edgeId: edge.id
      })
    }
  }
  return images
})

// 生成 / 显示用的参考图：先添加外部连线图片，再把当前节点图片放在最后
// 这样输入图片编号在前（图片1、图片2...），当前图始终是最后一个编号
const effectiveInputImages = computed(() => {
  const list = []

  // 先添加外部连线图片（排除自身以防循环）
  for (const img of inputImages.value) {
    if (img.nodeId !== props.id) list.push(img)
  }

  // 再添加当前节点自己的图片（如果有）
  if (props.data?.url) {
    list.push({
      url: props.data.url,
      role: 'input_reference',
      nodeId: props.id,
      edgeId: null,
      isSelf: true,
    })
  }

  return list
})

// 动态 placeholder：根据是否已有图片 / 是否有外部输入 给出不同提示
const promptPlaceholder = computed(() => {
  const hasSelf = !!props.data?.url
  const hasExternal = inputImages.value.length > 0
  if (hasSelf && hasExternal) return '描述如何结合参考图修改当前图…（输入 @ 指定参考图）'
  if (hasSelf) return '描述你想如何修改这张图，例如：把背景换成夜晚'
  if (hasExternal) return '描述你想生成的画面，可输入 @ 引用参考图'
  return '描述你想要生成的画面内容'
})

watch(inputImages, () => {
  nextTick(() => {
    renderEditorFromPromptText()
  })
})

// 获取角色标签文字
const getRoleLabel = (role) => {
  const labels = {
    'base_image': '底图',
    'character_ref': '角色',
    'style_ref': '风格',
    'first_frame_image': '首帧',
    'last_frame_image': '尾帧',
    'input_reference': '参考'
  }
  return labels[role] || '参考'
}

const getRoleInstruction = (role) => {
  const labels = {
    'base_image': '作为主要场景和构图基础',
    'character_ref': '提取其中的角色主体',
    'style_ref': '参考其画风、色彩和质感',
    'first_frame_image': '参考其主体和初始姿态',
    'last_frame_image': '参考其末态元素',
    'input_reference': '作为补充参考素材'
  }
  return labels[role] || '作为补充参考素材'
}

// 参考图操作选项
const refActionOptions = [
  { label: '设为底图', key: 'set_base' },
  { label: '设为角色', key: 'set_character' },
  { label: '定位来源', key: 'locate' },
  { label: '抠图 (Remove BG)', key: 'remove_bg' }
]

// 处理参考图操作
const handleRefAction = (key, img) => {
  if (key === 'set_base') {
    updateEdgeData(img.edgeId, { imageRole: 'base_image' })
  } else if (key === 'set_character') {
    updateEdgeData(img.edgeId, { imageRole: 'character_ref' })
  } else if (key === 'locate') {
    const node = nodes.value.find(n => n.id === img.nodeId)
    if (node) {
      setCenter(node.position.x + 100, node.position.y + 100, { zoom: 1.2, duration: 800 })
    }
  } else if (key === 'remove_bg') {
    window.$message?.info('抠图功能正在集成中...')
  }
}

// --- Mention Logic | @ 提及逻辑 ---
const editorRef = ref(null)
const promptInputContainerRef = ref(null)
const showMentionList = ref(false)
const mentionStyle = ref({ top: '0px', left: '0px' })
const activeMentionIndex = ref(0)
const isComposingMention = ref(false)
const mentionTriggerRange = ref(null)
const MENTION_LABEL_PREFIX = '@ '

const getMentionLabel = (img) => {
  const index = effectiveInputImages.value.findIndex(
    i => i.nodeId === img.nodeId && !!i.isSelf === !!img.isSelf
  )
  return index >= 0 ? `图片${index + 1}` : '引用'
}

const getMentionText = (label) => `${MENTION_LABEL_PREFIX}${label}`

const escapeHtml = (value = '') => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

const syncPromptTextFromEditor = () => {
  if (!editorRef.value) return

  const parts = []
  editorRef.value.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent || '')
      return
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node
      if (el.classList.contains('mention-pill')) {
        parts.push(getMentionText(el.dataset.label || '引用'))
      } else if (el.tagName === 'BR') {
        parts.push('\n')
      } else {
        parts.push(el.textContent || '')
      }
    }
  })

  promptText.value = parts.join('')
  updateEditorEmptyState()
  persistGenerationDraft()
}

const renderEditorFromPromptText = () => {
  if (!editorRef.value) return

  const mentionLabels = effectiveInputImages.value
    .map(getMentionLabel)
    .sort((a, b) => b.length - a.length)

  editorRef.value.innerHTML = ''

  if (!promptText.value) {
    updateEditorEmptyState()
    return
  }

  let remaining = promptText.value

  while (remaining.length > 0) {
    const mention = mentionLabels.find(label => remaining.startsWith(getMentionText(label)))
    if (mention) {
      const img = findMentionImageByLabel(mention)
      if (img) {
        editorRef.value.appendChild(createMentionPill(img))
        editorRef.value.appendChild(document.createTextNode(' '))
        remaining = remaining.slice(getMentionText(mention).length)
        continue
      }
    }

    const nextMentionIndex = mentionLabels
      .map(label => remaining.indexOf(getMentionText(label)))
      .filter(index => index >= 0)
      .sort((a, b) => a - b)[0]

    if (nextMentionIndex === undefined) {
      editorRef.value.appendChild(document.createTextNode(remaining))
      break
    }

    editorRef.value.appendChild(document.createTextNode(remaining.slice(0, nextMentionIndex)))
    remaining = remaining.slice(nextMentionIndex)
  }

  updateEditorEmptyState()
}

const findMentionImageByLabel = (label) => {
  return effectiveInputImages.value.find(img => getMentionLabel(img) === label) || null
}

const createMentionPill = (img) => {
  const pill = document.createElement('span')
  pill.className = 'mention-pill'
  pill.contentEditable = 'false'
  pill.dataset.nodeId = img.nodeId
  pill.dataset.label = getMentionLabel(img)
  pill.dataset.role = img.role || 'input_reference'

  const thumb = document.createElement('img')
  thumb.className = 'mention-pill-thumb'
  thumb.src = img.url
  thumb.alt = pill.dataset.label

  const text = document.createElement('span')
  text.className = 'mention-pill-text'
  text.textContent = pill.dataset.label

  pill.appendChild(thumb)
  pill.appendChild(text)
  return pill
}

const placeCaretAfterNode = (node) => {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.setStartAfter(node)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

const updateMentionMenuPosition = () => {
  const baseRange = mentionTriggerRange.value?.cloneRange()
  const selection = window.getSelection()
  if (!baseRange && (!selection || selection.rangeCount === 0)) return
  const range = baseRange || selection.getRangeAt(0).cloneRange()
  range.collapse(false)

  const containerRect = promptInputContainerRef.value?.getBoundingClientRect()
  const editorRect = editorRef.value?.getBoundingClientRect()
  if (!containerRect || !editorRect) return

  let rect = range.getBoundingClientRect()

  // Use a marker span as fallback when the trigger range rect is unstable.
  if (!rect || (!rect.width && !rect.height)) {
    const marker = document.createElement('span')
    marker.textContent = '\u200b'
    marker.style.display = 'inline-block'
    marker.style.width = '1px'
    marker.style.height = '22px'
    marker.style.pointerEvents = 'none'
    range.insertNode(marker)
    rect = marker.getBoundingClientRect()
    marker.remove()
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(range)
    }
  }

  if (!rect) {
    rect = editorRect
  }

  const zoomFactor = Math.max(zoom.value || 1, 0.0001)
  const maxLeft = Math.max(containerRect.width / zoomFactor - 188, 0)
  const relativeLeft = Math.max(0, Math.min((rect.left - containerRect.left) / zoomFactor, maxLeft))
  const relativeTop = Math.max(0, (rect.bottom - containerRect.top) / zoomFactor + 8)

  mentionStyle.value = {
    top: `${relativeTop}px`,
    left: `${relativeLeft}px`
  }
}

const guessMimeTypeFromPath = (filePath = '') => {
  const lowerPath = filePath.toLowerCase()
  if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) return 'image/jpeg'
  if (lowerPath.endsWith('.webp')) return 'image/webp'
  if (lowerPath.endsWith('.gif')) return 'image/gif'
  return 'image/png'
}

const resolveReferenceImagePayload = async (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return null

  if (imageUrl.startsWith('data:')) {
    return imageUrl
  }

  if (imageUrl.startsWith('http')) {
    return imageUrl
  }

  if (isElectron() && imageUrl.startsWith('file://')) {
    const filePath = decodeURIComponent(imageUrl.replace(/^file:\/+/, ''))
    const result = await window.electronAPI.readFile(filePath)
    if (!result?.success || !result.buffer) {
      throw new Error(result?.error || '读取本地参考图失败')
    }
    const mimeType = guessMimeTypeFromPath(filePath)
    return `data:${mimeType};base64,${result.buffer}`
  }

  return null
}

const buildPromptForGeneration = () => {
  const styleItem = styleOptions.find(s => s.key === promptStyle.value)
  const styleDesc = styleItem?.prompt || ''

  if (!editorRef.value) {
    const raw = promptText.value.trim()
    const finalPrompt = styleDesc ? `${raw}\n\n风格要求：${styleDesc}。` : raw
    return {
      prompt: finalPrompt,
      mentionedImages: [],
      promptTextForDisplay: raw
    }
  }

  const rawSegments = []
  const mentionedImages = []
  const seenNodeIds = new Set()

  editorRef.value.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      rawSegments.push(node.textContent || '')
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return

    const el = node
    if (el.classList.contains('mention-pill')) {
      const nodeId = el.dataset.nodeId || ''
      const label = el.dataset.label || '引用图'
      rawSegments.push(label)

      if (nodeId && !seenNodeIds.has(nodeId)) {
        // 从 effectiveInputImages 查找，这样可以找到外部图片和当前节点自己
        const image = effectiveInputImages.value.find(img => img.nodeId === nodeId)
        if (image) {
          seenNodeIds.add(nodeId)
          mentionedImages.push(image)
        }
      }
      return
    }

    if (el.tagName === 'BR') {
      rawSegments.push('\n')
      return
    }

    rawSegments.push(el.textContent || '')
  })

  const normalizedMentionedImages = mentionedImages.map((image, index) => ({
    ...image,
    label: getMentionLabel(image),
    roleLabel: getRoleLabel(image.role),
    roleInstruction: getRoleInstruction(image.role),
    order: index + 1
  }))

  const userInstruction = rawSegments.join('').replace(/\s+\n/g, '\n').trim()
  const baseImage = normalizedMentionedImages.find(img => img.role === 'base_image') || normalizedMentionedImages[0] || null
  const supportingImages = normalizedMentionedImages.filter(img => img.nodeId !== baseImage?.nodeId)

  const structuredLines = [
    baseImage
      ? `主底图：${baseImage.label}，${baseImage.roleInstruction}。请保留这张图的场景、透视、光线氛围和整体画风作为最终画面的基础。`
      : '如果没有明确底图，请优先保持参考图中最主要场景的画风和构图一致。'
  ]

  if (supportingImages.length > 0) {
    supportingImages.forEach((img) => {
      structuredLines.push(`补充参考：${img.label}，${img.roleInstruction}。`)
    })
  }

  structuredLines.push(`用户编辑要求：${userInstruction}`)
  if (styleDesc) {
    structuredLines.push(`风格要求：${styleDesc}。`)
  }

  return {
    prompt: structuredLines.join('\n'),
    mentionedImages: normalizedMentionedImages,
    promptTextForDisplay: userInstruction
  }
}

const clearMentionState = () => {
  showMentionList.value = false
  isComposingMention.value = false
  mentionTriggerRange.value = null
}

const updateEditorEmptyState = () => {
  if (!editorRef.value) return
  const hasMention = editorRef.value.querySelector('.mention-pill')
  const hasText = (editorRef.value.textContent || '').trim().length > 0
  editorRef.value.dataset.empty = (!hasMention && !hasText) ? 'true' : 'false'
}

const handleEditorSelectionChange = () => {
  if (!showMentionList.value) return
  updateMentionMenuPosition()
}

const handleEditorInput = () => {
  syncPromptTextFromEditor()

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    clearMentionState()
    return
  }

  const range = selection.getRangeAt(0)
  if (!range.collapsed) {
    clearMentionState()
    return
  }

  let textBeforeCaret = ''
  const container = range.startContainer
  if (container.nodeType === Node.TEXT_NODE) {
    textBeforeCaret = (container.textContent || '').slice(0, range.startOffset)
  }

  if (textBeforeCaret.endsWith('@')) {
    mentionTriggerRange.value = range.cloneRange()
    mentionTriggerRange.value.setStart(range.startContainer, range.startOffset - 1)
    mentionTriggerRange.value.setEnd(range.startContainer, range.startOffset)
    isComposingMention.value = true
    showMentionList.value = true
    activeMentionIndex.value = 0
    nextTick(() => updateMentionMenuPosition())
    return
  }

  if (isComposingMention.value) {
    showMentionList.value = true
    nextTick(() => updateMentionMenuPosition())
  } else {
    clearMentionState()
  }
}

const handleEditorKeyDown = (e) => {
  // Ctrl+Enter 快捷发送
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    if (promptText.value.trim() && !processing.value && promptText.value.length <= 1000) {
      handleGenerateImage()
    }
    return
  }

  if (e.key === 'Backspace') {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      if (range.collapsed) {
        let target = null
        if (range.startContainer.nodeType === Node.TEXT_NODE) {
          const textNode = range.startContainer
          const textContent = textNode.textContent || ''

          if (range.startOffset === 0) {
            target = textNode.previousSibling
          } else if (textContent.trim() === '' && range.startOffset === textContent.length) {
            target = textNode.previousSibling
          }
        } else if (range.startContainer === editorRef.value && range.startOffset > 0) {
          target = editorRef.value.childNodes[range.startOffset - 1]
        }

        if (target?.nodeType === Node.ELEMENT_NODE && target.classList.contains('mention-pill')) {
          e.preventDefault()
          const previous = target.previousSibling
          const next = target.nextSibling
          target.remove()

          if (next?.nodeType === Node.TEXT_NODE && (next.textContent || '').trim() === '') {
            next.remove()
          }

          syncPromptTextFromEditor()
          clearMentionState()

          nextTick(() => {
            updateEditorEmptyState()
            if (previous) {
              placeCaretAfterNode(previous)
            } else if (editorRef.value) {
              const caretRange = document.createRange()
              if (editorRef.value.firstChild?.nodeType === Node.TEXT_NODE) {
                caretRange.setStart(editorRef.value.firstChild, 0)
              } else {
                caretRange.setStart(editorRef.value, 0)
              }
              caretRange.collapse(true)
              const sel = window.getSelection()
              sel?.removeAllRanges()
              sel?.addRange(caretRange)
            }
          })
          return
        }
      }
    }
  }

  if (!showMentionList.value) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeMentionIndex.value = (activeMentionIndex.value + 1) % effectiveInputImages.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeMentionIndex.value = (activeMentionIndex.value - 1 + effectiveInputImages.value.length) % effectiveInputImages.value.length
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    if (effectiveInputImages.value[activeMentionIndex.value]) {
      selectMention(effectiveInputImages.value[activeMentionIndex.value])
    }
  } else if (e.key === 'Escape') {
    clearMentionState()
  } else if (e.key === ' ' && isComposingMention.value) {
    clearMentionState()
  }
}

const selectMention = (img) => {
  if (!editorRef.value) return

  editorRef.value.focus()

  const selection = window.getSelection()
  if (!selection) return
  selection.removeAllRanges()

  const range = mentionTriggerRange.value?.cloneRange() || document.createRange()
  if (!mentionTriggerRange.value) {
    range.selectNodeContents(editorRef.value)
    range.collapse(false)
  }

  range.deleteContents()

  const pill = createMentionPill(img)
  range.insertNode(pill)

  const spacer = document.createTextNode(' ')
  pill.after(spacer)

  placeCaretAfterNode(spacer)
  syncPromptTextFromEditor()
  clearMentionState()
}

// 图片分辨率显示
const imageResolution = computed(() => {
  if (naturalWidth.value && naturalHeight.value) {
    return `${naturalWidth.value} × ${naturalHeight.value}`
  }
  // 从 data 中获取
  if (props.data.width && props.data.height) {
    return `${props.data.width} × ${props.data.height}`
  }
  return null
})

// 图片加载完成后获取尺寸
const onImageLoad = (e) => {
  const img = e.target
  naturalWidth.value = img.naturalWidth
  naturalHeight.value = img.naturalHeight

  // 保存到节点数据
  updateNode(props.id, {
    width: img.naturalWidth,
    height: img.naturalHeight
  }, true)
}

// 固定节点尺寸（基于宽度300px，让图片更紧凑）
const NODE_BASE_WIDTH = 300

// 解析比例字符串为数值（如 '16x9' -> 16/9）
const parseRatio = (ratioKey) => {
  if (!ratioKey) return 1
  // 支持 '16x9' 和 '16:9' 两种格式
  const parts = ratioKey.split(/[x:]/)
  if (parts.length === 2) {
    const w = parseFloat(parts[0])
    const h = parseFloat(parts[1])
    if (w > 0 && h > 0) return w / h
  }
  return 1
}

const nodeStyle = computed(() => {
  // 极致物理约束：强制所有图片节点保持精致，不准”巨大”
  const LIMIT = 560
  let width = LIMIT
  let height = LIMIT

  // 优先使用天然尺寸计算比例
  const w = naturalWidth.value || props.data.width
  const h = naturalHeight.value || props.data.height

  if (w && h) {
    // 有图片：使用图片原始比例
    const ratio = w / h
    if (ratio > 1) {
      // 横向：宽固定，高缩减
      width = LIMIT
      height = Math.round(LIMIT / ratio)
    } else {
      // 纵向：高固定，宽缩减
      height = LIMIT
      width = Math.round(LIMIT * ratio)
    }
  } else {
    // 空节点：使用生成面板中选中的比例
    const ratio = parseRatio(localRatio.value)
    if (ratio >= 1) {
      width = LIMIT
      height = Math.round(LIMIT / ratio)
    } else {
      height = LIMIT
      width = Math.round(LIMIT * ratio)
    }
  }
  
  return {
    width: `${width}px`,
    height: `${height}px`,
    backgroundColor: '#1a1a1c',
    border: props.data.selected ? '3px solid #818cf8' : '2px solid rgba(255, 255, 255, 0.08)',
    boxShadow: props.data.selected
      ? '0 0 12px rgba(99, 102, 241, 0.6), 0 0 24px rgba(99, 102, 241, 0.4), 0 0 48px rgba(99, 102, 241, 0.2)'
      : '0 8px 32px rgba(0, 0, 0, 0.4)'
  }
})

const selectedGridKey = ref('2x2')

// Config labels
const configLabels = {
  hd: '高清',
  expand: '扩图',
  redraw: '重绘',
  erase: '擦除',
  cutout: '抠图',
  crop: '裁剪',
  grid: '宫格划分',
}

// 各功能对应模型
const FEATURE_MODELS = {
  hd: 'gemini-3.1-flash-image-preview',  // Nano Banana 2
  expand: 'gemini-3-pro-image-preview',   // Nano Banana Pro
  redraw: 'gemini-3-pro-image-preview',   // Nano Banana Pro（需要遮罩支持）
  erase: 'gemini-3-pro-image-preview',    // Nano Banana Pro（需要遮罩支持）
  cutout: 'gemini-3.1-flash-image-preview', // Nano Banana
}

const persistGenerationDraft = () => {
  updateNode(props.id, {
    userPrompt: promptText.value,
    userModel: localModel.value,
    userRatio: localRatio.value,
    userResolution: localResolution.value,
    generationDraft: {
      prompt: promptText.value,
      model: localModel.value,
      ratio: localRatio.value,
      resolution: localResolution.value,
      style: promptStyle.value,
      count: localImageCount.value,
      updatedAt: Date.now()
    }
  }, false)
}
const FEATURE_MODEL_LABELS = {
  hd: 'Nano Banana 2',
  expand: 'Nano Banana Pro',
  redraw: 'Nano Banana Pro',
  erase: 'Nano Banana Pro',
  cutout: 'Nano Banana',
  crop: '—',
}

// Grid options
const gridOptions = [
  { label: '4宫格 (2×2)', key: '2x2' },
  { label: '9宫格 (3×3)', key: '3x3' },
  { label: '16宫格 (4×4)', key: '4x4' },
  { label: '25宫格 (5×5)', key: '5x5' }
]
const gridLabel = computed(() => {
  return gridOptions.find(o => o.key === selectedGridKey.value)?.label || '4宫格 (2×2)'
})

// Model options - 从配置文件获取
const modelOptions = computed(() =>
  IMAGE_MODELS.map(m => ({ label: m.label, key: m.key }))
)

const scaleOptions = [2, 4, 6]

// 比例选项 - 从配置文件获取
const ratioOptions = computed(() =>
  IMAGE_SIZE_OPTIONS.map(s => ({ label: s.label, key: s.key }))
)

const resolutionOptions = [
  { label: '1K', key: '1K' },
  { label: '2K', key: '2K' },
  { label: '4K', key: '4K' }
]

const countOptions = [
  { label: '生成 1 张', key: 1 },
  { label: '生成 2 张', key: 2 },
  { label: '生成 3 张', key: 3 },
  { label: '生成 4 张', key: 4 }
]

const displayRatio = computed(() => {
  return ratioOptions.value.find(o => o.key === localRatio.value)?.label || '16:9'
})

const displayModel = computed(() => {
  return modelOptions.value.find(o => o.key === localModel.value)?.label || 'Nano Banana Pro'
})

// Show config card
const showConfigCard = (type) => {
  if (activeConfig.value === type) {
    activeConfig.value = null
  } else {
    activeConfig.value = type
  }
}

// 下载图片
const handleDownload = async () => {
  if (!props.data.url) return

  try {
    const response = await fetch(props.data.url)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = props.data.fileName || `image-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下载图片失败:', error)
    window.$message?.error('下载失败')
  }
}

// Handle model select
const handleModelSelect = (key) => {
  localModel.value = normalizeModelKey(key)
  persistGenerationDraft()
}

watch(localModel, (val) => {
  const normalized = normalizeModelKey(val)
  if (normalized !== val) {
    localModel.value = normalized
  }
})

// 扩图相关处理
const handleRatioSelect = (key) => {
  localRatio.value = key
  persistGenerationDraft()
}

const handleResolutionSelect = (key) => {
  localResolution.value = key
  persistGenerationDraft()
}

const handleCountSelect = (key) => {
  localImageCount.value = key
  persistGenerationDraft()
}

const handleStyleSelect = (key) => {
  promptStyle.value = key
  persistGenerationDraft()
}

// Handle reset
const handleReset = () => {
  localModel.value = DEFAULT_IMAGE_MODEL
  localScale.value = 2
  persistGenerationDraft()
}

// Handle generate - 高清放大
const handleGenerate = async () => {
  if (!props.data.url) return

  processing.value = true
  updateNode(props.id, { loading: true, loadingText: '高清处理中...' }, false)

  try {
    const { imageHD } = await import('../../skills/imageHD')

    const result = await imageHD({
      imageUrl: props.data.url,
      model: localModel.value,
      scale: localScale.value,
      size: localRatio.value,
      onProgress: (percent, msg) => {
        updateNode(props.id, { loadingText: msg }, false)
      },
    })

    if (!result?.url) {
      throw new Error('高清处理未返回图片')
    }

    // 获取当前节点位置
    const currentNode = nodes.value.find(n => n.id === props.id)
    const nodeX = currentNode?.position?.x || 0
    const nodeY = currentNode?.position?.y || 0

    // 创建输出图片节点
    const outputNodeId = addNode('image', { x: nodeX + 450, y: nodeY }, {
      url: result.url,
      label: `高清${localScale.value}x`,
      userModel: localModel.value,
      userRatio: localRatio.value,
    })

    // 保存图片到本地
    try {
      const localUrl = await downloadImage(result.url, projectName.value)
      updateNode(outputNodeId, { url: localUrl }, false)
      saveProject()
    } catch (err) {
      console.warn('[ImageNode] 后台保存高清图失败，保留远程地址:', err)
    }

    // 连接到输出节点
    addEdge({
      source: props.id,
      target: outputNodeId,
      sourceHandle: 'right',
      targetHandle: 'left',
      type: 'default'
    })

    setTimeout(() => updateNodeInternals(outputNodeId), 50)
    updateNode(props.id, { loading: false, loadingText: undefined }, false)
    window.$message?.success(`高清${localScale.value}x完成`)
    activeConfig.value = null
  } catch (err) {
    console.error('[ImageNode] HD error:', err)
    updateNode(props.id, { loading: false }, false)
    window.$message?.error(err.message || '高清处理失败')
  } finally {
    processing.value = false
  }
}

// Handle grid select
const handleGridSelect = (key) => {
  if (!props.data.url) {
    window.$message?.warning('当前节点没有图片')
    return
  }
  selectedGridKey.value = key
  activeConfig.value = 'grid'
}

const handleGridApply = async () => {
  if (!props.data.url) return
  const key = selectedGridKey.value
  const [cols, rows] = key.split('x').map(Number)
  const total = cols * rows

  processing.value = true
  updateNode(props.id, { loading: true, loadingText: `切分 ${total} 宫格...` }, false)

  try {
    const payload = await resolveReferenceImagePayload(props.data.url)

    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('图片加载失败'))
      el.src = payload
    })

    const natW = img.naturalWidth
    const natH = img.naturalHeight
    const cellW = Math.floor(natW / cols)
    const cellH = Math.floor(natH / rows)

    if (cellW < 1 || cellH < 1) throw new Error('宫格尺寸太小')

    // 当前节点位置
    const currentNode = nodes.value.find(n => n.id === props.id)
    const baseX = currentNode?.position?.x || 0
    const baseY = currentNode?.position?.y || 0
    const gap = 20
    const cellDisplayW = 240
    const cellDisplayH = Math.round(cellDisplayW * (cellH / cellW))

    const gridNodeIds = []

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const canvas = document.createElement('canvas')
        canvas.width = cellW
        canvas.height = cellH
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas 初始化失败')

        ctx.drawImage(img, c * cellW, r * cellH, cellW, cellH, 0, 0, cellW, cellH)
        const dataUrl = canvas.toDataURL('image/png')

        const x = baseX + (c * (cellDisplayW + gap))
        const y = baseY + 350 + (r * (cellDisplayH + gap))

        const nodeId = addNode('image', { x, y }, {
          url: dataUrl,
          label: `宫格 ${r * cols + c + 1}`,
          userModel: localModel.value,
        })
        gridNodeIds.push(nodeId)

        addEdge({
          source: props.id,
          target: nodeId,
          sourceHandle: 'right',
          targetHandle: 'left',
          type: 'default',
        })
      }
    }

    window.$message?.success(`已切分为 ${total} 宫格`)
    updateNode(props.id, { loading: false }, false)
    activeConfig.value = null
  } catch (err) {
    console.error('[ImageNode] 宫格切分失败:', err)
    window.$message?.error(err.message || '宫格切分失败')
  } finally {
    processing.value = false
  }
}

// Handle preview
const handlePreview = () => {
  if (props.data.url || inputImages.value.length > 0) {
    showPreview.value = true
  }
}

// Handle delete
const handleDelete = () => {
  removeNode(props.id)
}

// 生成图片 - 调用真实 API
const handleGenerateImage = async () => {
  if (!promptText.value.trim()) return

  processing.value = true
  updateNode(props.id, { loading: true }, false)

    // 步骤1：即时创建占位节点 (Immediate Feedback)
    const currentNode = nodes.value.find(n => n.id === props.id)
    const basePos = currentNode?.position || { x: 0, y: 0 }
    const incomingEdges = edges.value.filter(e => e.target === props.id)
    const placeholderNodeIds = []

    if (localImageCount.value > 1) {
      for (let i = 1; i < localImageCount.value; i++) {
        const newX = basePos.x + (i * 620) // 横向间距，与节点放大后的尺寸匹配
        const newY = basePos.y // 保持高度一致

        const placeholderId = addNode('image', { x: newX, y: newY }, {
          loading: true,
          loadingText: `生成中 (${i+1}/${localImageCount.value})...`,
          label: promptText.value.substring(0, 20) + ` (${i+1})`
        })
        placeholderNodeIds.push(placeholderId)

        // 继承输入连线
        for (const edge of incomingEdges) {
          addEdge({
            source: edge.source,
            target: placeholderId,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            type: edge.type || 'default'
          })
        }
        setTimeout(() => updateNodeInternals(placeholderId), 50)
      }
    }

    try {
      const { prompt: structuredPrompt, mentionedImages, promptTextForDisplay } = buildPromptForGeneration()
      const fallbackImages = mentionedImages.length > 0 ? mentionedImages : effectiveInputImages.value
      const referenceImages = fallbackImages.length > 0 ? fallbackImages : []
      const referencePayloads = (await Promise.all(
        referenceImages.map(async (img) => {
          const payload = await resolveReferenceImagePayload(img.url)
          if (!payload) return null

          return {
            label: img.label || getMentionLabel(img),
            role: img.role,
            roleLabel: img.roleLabel || getRoleLabel(img.role),
            data: payload
          }
        })
      )).filter(Boolean)

      const finalPrompt = structuredPrompt || promptText.value.trim()

      console.log('[ImageNode] Generating with polished prompt:', finalPrompt)
      console.log('[ImageNode] Mentioned reference images:', referenceImages.map(img => ({
        nodeId: img.nodeId,
        role: img.role,
        label: img.label || getMentionLabel(img)
      })))

      // 添加超时提示
      const timeoutId = setTimeout(() => {
        window.$message?.warning('图片生成中，请耐心等待...')
      }, 15000)

      // 步骤3：启动并行生图任务 - 逐条处理，完成即显示
      console.log(`[ImageNode] Launching ${localImageCount.value} generation tasks...`)

      const totalTasks = localImageCount.value

      async function handleSingleGeneration(index) {
        const targetId = (index === 0) ? props.id : placeholderNodeIds[index - 1]
        try {
          const res = await imageApi.generate({
            model: localModel.value,
            prompt: finalPrompt,
            size: localRatio.value,
            resolution: localResolution.value,
            images: referencePayloads,
            n: 1
          })
          const imageResult = res?.[0]
          if (!imageResult?.url) return

          // 立即显示图片，不用等全部完成
          updateNode(targetId, {
            url: imageResult.url,
            loading: false,
            loadingText: undefined,
            revisedPrompt: imageResult.revisedPrompt || '',
            userPrompt: promptText.value,
            userModel: localModel.value,
            userRatio: localRatio.value,
            userResolution: localResolution.value,
            generationDraft: {
              prompt: promptText.value,
              model: localModel.value,
              ratio: localRatio.value,
              resolution: localResolution.value,
              style: promptStyle.value,
              count: localImageCount.value,
              mode: 'hd',
              updatedAt: Date.now()
            }
          }, false)

          // 立即保存到本地（保存到项目 media 目录）
          try {
            const localUrl = await downloadImage(imageResult.url, projectName.value)
            updateNode(targetId, { url: localUrl }, false)
          } catch (err) {
            console.warn('[ImageNode] 后台保存图片失败，保留远程地址:', err)
          }
          saveProject()
        } catch (err) {
          console.error(`[ImageNode] Task ${index} failed:`, err)
          updateNode(targetId, { loading: false, loadingText: '生成失败' }, false)
          throw err
        }
      }

      // 启动所有任务并等待全部完成
      const allPromises = []
      for (let i = 0; i < totalTasks; i++) {
        allPromises.push(handleSingleGeneration(i))
      }
      await Promise.all(allPromises)
      clearTimeout(timeoutId)

    } catch (err) {
      console.error('[ImageNode] Multi-generation error:', err)
      placeholderNodeIds.forEach(id => updateNode(id, { loading: false, loadingText: '生成失败' }, false))
      updateNode(props.id, { loading: false }, false)
      window.$message?.error(err.message || '生成失败')
    } finally {
      processing.value = false
      updateNode(props.id, {
        userPrompt: promptText.value,
        userModel: localModel.value,
        userRatio: localRatio.value,
        userResolution: localResolution.value,
        generationDraft: {
          prompt: promptText.value,
          model: localModel.value,
          ratio: localRatio.value,
          resolution: localResolution.value,
          style: promptStyle.value,
          count: localImageCount.value,
          mode: 'generate',
          updatedAt: Date.now()
        }
      }, false)
      nextTick(() => {
        renderEditorFromPromptText()
      })
    }
}
</script>

<style scoped>
.image-node-wrapper {
  position: relative;
  contain: layout style;
}

.image-node {
  position: relative;
  background: #1a1a1c;
  border-radius: 16px;
  overflow: hidden;
  transition: box-shadow 0.2s, border-color 0.2s;
  animation: scaleIn 0.15s ease-out;
  transform-origin: center center;
}

@keyframes scaleIn {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.image-node.selected {
  /* border and box-shadow handled in inline nodeStyle */
}

/* 分辨率标签 - 右上角紧靠图片 */
.resolution-badge {
  position: absolute;
  top: -24px;
  right: 0;
  padding: 3px 8px;
  background: rgba(30, 30, 32, 0.9);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 500;
  z-index: 5;
  pointer-events: none;
  white-space: nowrap;
  transform-origin: bottom right;
}

/* 图片名称标签 - 左下角紧靠图片 */
.image-label {
  position: absolute;
  bottom: -24px;
  left: 0;
  padding: 3px 8px;
  background: rgba(30, 30, 32, 0.9);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 500;
  z-index: 5;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transform-origin: top left;
}

/* 下载按钮 - 右上角 */
.download-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 30, 32, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: white;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
}

.download-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.08);
  border-color: rgba(255, 255, 255, 0.25);
}

.download-btn:active {
  transform: scale(0.95);
}

.image-display {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  image-rendering: -webkit-optimize-contrast;
}

.image-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 16px;
  background-color: #151518;
  background-image:
    linear-gradient(45deg, #2b2b31 25%, transparent 25%),
    linear-gradient(-45deg, #2b2b31 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #2b2b31 75%),
    linear-gradient(-45deg, transparent 75%, #2b2b31 75%);
  background-size: 18px 18px;
  background-position: 0 0, 0 9px, 9px -9px, -9px 0;
}

/* ========== Crop overlay | 裁剪叠加层 ========== */
.crop-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  cursor: default;
}

.crop-mask-top,
.crop-mask-bottom {
  position: absolute;
  left: 0; right: 0;
  background: rgba(0, 0, 0, 0.55);
}
.crop-mask-top { top: 0; }
.crop-mask-bottom { bottom: 0; }

.crop-mask-left,
.crop-mask-right {
  position: absolute;
  background: rgba(0, 0, 0, 0.55);
}
.crop-mask-left { left: 0; }
.crop-mask-right { right: 0; }

.crop-rect {
  position: absolute;
  border: 2px solid rgba(255, 255, 255, 0.9);
  cursor: move;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
}

.crop-grid-h {
  display: flex;
  flex: 1;
}

.crop-grid-cell {
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

/* ========== Resize handles | 缩放控制点 ========== */
.crop-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: white;
  border: 2px solid rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  z-index: 2;
}
.crop-handle-nw { top: -5px; left: -5px; cursor: nwse-resize; }
.crop-handle-ne { top: -5px; right: -5px; cursor: nesw-resize; }
.crop-handle-sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
.crop-handle-se { bottom: -5px; right: -5px; cursor: nwse-resize; }
.crop-handle-n  { top: -5px; left: 50%; margin-left: -5px; cursor: ns-resize; }
.crop-handle-s  { bottom: -5px; left: 50%; margin-left: -5px; cursor: ns-resize; }
.crop-handle-w  { top: 50%; left: -5px; margin-top: -5px; cursor: ew-resize; }
.crop-handle-e  { top: 50%; right: -5px; margin-top: -5px; cursor: ew-resize; }

/* ========== Crop config card | 裁剪配置面板 ========== */
.crop-config-card {
  position: absolute;
  left: calc(100% + 16px);
  top: 0;
  width: 320px;
  background: rgba(24, 24, 28, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  z-index: 20;
  will-change: transform;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  backface-visibility: hidden;
}

.crop-config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.crop-config-title {
  font-size: 17px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: -0.01em;
}

.crop-config-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: all 0.15s;
}

.crop-config-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
}

.crop-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.crop-section-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Ratio grid - 2 rows of 3 */
.crop-ratio-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.crop-ratio-btn {
  padding: 9px 0;
  border-radius: 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.crop-ratio-btn:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
}

.crop-ratio-btn.active {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.15);
}

/* Dimension input row */
.crop-dimension-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 6px 12px;
}

.crop-dim-input {
  flex: 1;
  padding: 8px 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  outline: none;
  transition: background 0.15s;
  -moz-appearance: textfield;
  font-variant-numeric: tabular-nums;
}

.crop-dim-input::-webkit-inner-spin-button,
.crop-dim-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.crop-dim-input:focus {
  background: rgba(255, 255, 255, 0.06);
}

.crop-dim-input:hover {
  background: rgba(255, 255, 255, 0.04);
}

.crop-dim-sep {
  color: rgba(255, 255, 255, 0.3);
  font-size: 16px;
  font-weight: 300;
  flex-shrink: 0;
}

.crop-dim-unit {
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
  margin-left: 2px;
}

/* Divider */
.crop-divider {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 255, 255, 0.08) 20%,
    rgba(255, 255, 255, 0.08) 80%,
    transparent
  );
}

/* Action buttons */
.crop-actions {
  display: flex;
  gap: 8px;
}

.crop-btn-reset {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  flex: 1;
}

.crop-btn-reset:hover {
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.04);
}

.crop-btn-apply {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  flex: 2;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.crop-btn-apply:hover:not(:disabled) {
  background: linear-gradient(135deg, #4f46e5, #4338ca);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
  transform: translateY(-1px);
}

.crop-btn-apply:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(99, 102, 241, 0.3);
}

.crop-btn-apply:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ========== Expand overlay | 扩图叠加层 ========== */
.expand-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

/* Expand stage: pixel-based composition area */
.expand-stage {
  position: absolute;
  pointer-events: none;
}

/* New canvas area masks (subtle) */
.expand-mask {
  position: absolute;
  background:
    linear-gradient(135deg, rgba(129, 140, 248, 0.08), rgba(255, 255, 255, 0.015)),
    rgba(255, 255, 255, 0.015);
  box-shadow:
    inset 0 0 0 1px rgba(129, 140, 248, 0.12),
    inset 0 0 18px rgba(99, 102, 241, 0.05);
  pointer-events: none;
  backdrop-filter: blur(1px);
}
.expand-mask-top { top: 0; left: 0; right: 0; }
.expand-mask-bottom { bottom: 0; left: 0; right: 0; }
.expand-mask-left { left: 0; }
.expand-mask-right { right: 0; }

/* The original image frame inside the expand stage */
.expand-source-frame {
  position: absolute;
  border-radius: 16px;
  box-shadow:
    0 0 0 2px rgba(129, 140, 248, 0.16),
    0 0 24px rgba(99, 102, 241, 0.12);
  pointer-events: none;
}

/* Expand rect */
.expand-rect {
  position: absolute;
  border: 2px dashed rgba(129, 140, 248, 0.75);
  cursor: default;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  background: transparent;
  box-shadow:
    0 0 0 1px rgba(129, 140, 248, 0.16),
    0 16px 32px rgba(0, 0, 0, 0.14);
}

.expand-rect-grid-h {
  display: flex;
  flex: 1;
}

.expand-rect-grid-cell {
  flex: 1;
  border: 1px solid rgba(129, 140, 248, 0.1);
}

/* Resize handles */
.expand-rect-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: linear-gradient(180deg, #a5b4fc, #818cf8);
  border: 2px solid #1a1a1c;
  border-radius: 50%;
  z-index: 2;
  pointer-events: auto;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.42);
}
.expand-rect-handle-nw { top: -6px; left: -6px; cursor: nwse-resize; }
.expand-rect-handle-ne { top: -6px; right: -6px; cursor: nesw-resize; }
.expand-rect-handle-sw { bottom: -6px; left: -6px; cursor: nesw-resize; }
.expand-rect-handle-se { bottom: -6px; right: -6px; cursor: nwse-resize; }
.expand-rect-handle-n  { top: -6px; left: 50%; margin-left: -6px; cursor: ns-resize; }
.expand-rect-handle-s  { bottom: -6px; left: 50%; margin-left: -6px; cursor: ns-resize; }
.expand-rect-handle-w  { top: 50%; left: -6px; margin-top: -6px; cursor: ew-resize; }
.expand-rect-handle-e  { top: 50%; right: -6px; margin-top: -6px; cursor: ew-resize; }

/* Overflow visible for expand mode */
.image-node.overflow-visible {
  overflow: visible !important;
  border-radius: 16px;
}

.image-container.overflow-visible {
  overflow: visible !important;
  border-radius: 16px;
}

/* ========== Expand config card | 扩图配置面板 ========== */
.expand-config-card {
  position: absolute;
  left: calc(100% + 16px);
  top: 0;
  width: 320px;
  background: rgba(24, 24, 28, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  z-index: 20;
  will-change: transform;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  backface-visibility: hidden;
}

.expand-config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.expand-config-title {
  font-size: 17px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: -0.01em;
}

.expand-config-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: all 0.15s;
}

.expand-config-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
}

.expand-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.expand-section-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.expand-custom-label {
  margin-top: -4px;
}

/* Unified expand input */
.expand-unified-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 6px 12px;
}

.expand-unified-input {
  flex: 1;
  padding: 8px 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  outline: none;
  -moz-appearance: textfield;
  font-variant-numeric: tabular-nums;
}

.expand-unified-input::-webkit-inner-spin-button,
.expand-unified-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.expand-unified-input:focus {
  background: rgba(255, 255, 255, 0.06);
}

.expand-unified-unit {
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.expand-apply-all {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.expand-apply-all:hover {
  background: rgba(99, 102, 241, 0.35);
}

/* Directional grid */
.expand-custom-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.expand-direction-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.expand-direction-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 6px 10px;
}

.expand-dir-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.expand-dir-input {
  flex: 1;
  min-width: 0;
  padding: 6px 2px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  outline: none;
  -moz-appearance: textfield;
  font-variant-numeric: tabular-nums;
}

.expand-dir-input::-webkit-inner-spin-button,
.expand-dir-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.expand-dir-input:focus {
  background: rgba(255, 255, 255, 0.06);
}

.expand-dir-unit {
  color: rgba(255, 255, 255, 0.25);
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
  width: 18px;
}

/* Expand dimension input row (like crop) */
.expand-dimension-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 6px 12px;
}

.expand-dim-input {
  flex: 1;
  padding: 8px 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  outline: none;
  transition: background 0.15s;
  -moz-appearance: textfield;
  font-variant-numeric: tabular-nums;
}

.expand-dim-input::-webkit-inner-spin-button,
.expand-dim-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.expand-dim-input:focus {
  background: rgba(255, 255, 255, 0.06);
}

.expand-dim-input:hover {
  background: rgba(255, 255, 255, 0.04);
}

.expand-dim-sep {
  color: rgba(255, 255, 255, 0.3);
  font-size: 16px;
  font-weight: 300;
  flex-shrink: 0;
}

.expand-dim-unit {
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
  margin-left: 2px;
}

/* Divider */
.expand-divider {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 255, 255, 0.08) 20%,
    rgba(255, 255, 255, 0.08) 80%,
    transparent
  );
}

/* Action buttons */
.expand-actions {
  display: flex;
  gap: 8px;
}

.expand-btn-reset {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  flex: 1;
}

.expand-btn-reset:hover {
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.04);
}

.expand-btn-apply {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  flex: 2;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.expand-btn-apply:hover:not(:disabled) {
  background: linear-gradient(135deg, #4f46e5, #4338ca);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
  transform: translateY(-1px);
}

.expand-btn-apply:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(99, 102, 241, 0.3);
}

.expand-btn-apply:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ========== Redraw overlay | 重绘画笔叠加层 ========== */
.redraw-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  cursor: crosshair;
}

.redraw-brush-hint {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  color: rgba(251, 191, 36, 0.9);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 21;
  pointer-events: none;
  letter-spacing: 0.03em;
}

.redraw-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 20;
  cursor: crosshair;
  touch-action: none;
}

/* ========== Redraw config card | 重绘配置面板 ========== */
.redraw-config-card {
  position: absolute;
  left: calc(100% + 16px);
  top: 0;
  width: 320px;
  background: rgba(24, 24, 28, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  z-index: 20;
  overflow: hidden;
  will-change: transform;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  backface-visibility: hidden;
}

.redraw-config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.redraw-config-title {
  font-size: 17px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: -0.01em;
}

.redraw-config-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: all 0.15s;
}

.redraw-config-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
}

.redraw-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.redraw-section-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.redraw-prompt-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  resize: vertical;
  min-height: 72px;
  max-height: 150px;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.redraw-prompt-input:focus {
  border-color: rgba(251, 191, 36, 0.4);
  background: rgba(255, 255, 255, 0.06);
}

.redraw-prompt-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

/* Brush row */
.redraw-brush-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.redraw-brush-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: rgba(251, 191, 36, 0.2);
  outline: none;
  cursor: pointer;
}

.redraw-brush-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #f59e0b;
  border: 2px solid #1a1a1c;
  cursor: pointer;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.3);
}

.redraw-brush-size-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(251, 191, 36, 0.8);
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.redraw-brush-presets {
  display: flex;
  gap: 6px;
}

.redraw-brush-preset {
  flex: 1;
  padding: 6px 0;
  border-radius: 8px;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.redraw-brush-preset:hover {
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.75);
}

.redraw-brush-preset.active {
  border-color: #f59e0b;
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
}

/* Color presets */
.redraw-color-presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.redraw-color-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  padding: 0;
}

.redraw-color-btn:hover {
  transform: scale(1.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.redraw-color-btn.active {
  border-color: white;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3), 0 0 12px rgba(255, 255, 255, 0.15);
  transform: scale(1.1);
}

.cutout-color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cutout-color-chip {
  width: 34px;
  height: 34px;
  padding: 4px;
  border-radius: 11px;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: all 0.15s ease;
}

.cutout-color-chip:hover {
  border-color: rgba(255, 255, 255, 0.24);
  transform: translateY(-1px);
}

.cutout-color-chip.active {
  border-color: rgba(255, 255, 255, 0.78);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18), 0 8px 18px rgba(0, 0, 0, 0.28);
}

.cutout-color-chip-fill {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background: var(--chip-color);
}

.cutout-color-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
}

.cutout-color-name {
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
}

.cutout-color-hex {
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.08em;
}

.cutout-hint-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
}

/* Divider */
.redraw-divider {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(251, 191, 36, 0.12) 20%,
    rgba(251, 191, 36, 0.12) 80%,
    transparent
  );
}

/* Actions */
.redraw-actions {
  display: flex;
  gap: 8px;
}

.redraw-btn-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  flex: 1;
}

.redraw-btn-clear:hover {
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.04);
}

.redraw-btn-apply {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  flex: 2;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.redraw-btn-apply:hover:not(:disabled) {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
  transform: translateY(-1px);
}

.redraw-btn-apply:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(245, 158, 11, 0.3);
}

.redraw-btn-apply:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.image-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  overflow: hidden;
  border-radius: 16px;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-timer {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.4);
  overflow: hidden;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.image-placeholder:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
}

/* Floating toolbar - 不随缩放变化，保持清晰 */
.floating-toolbar-top {
  position: absolute;
  top: -65px;
  left: 50%;
  transform-origin: center bottom;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(28, 28, 30, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 10;
  /* 防止缩放模糊 */
  will-change: transform;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  backface-visibility: hidden;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 14px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.75);
  transition: all 0.12s;
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.tool-btn:active {
  transform: scale(0.96);
}

.tool-btn.active {
  background: rgba(99, 102, 241, 0.4);
  color: white;
}

.tool-btn.delete:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.btn-text {
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
}

.toolbar-divider {
  width: 1px;
  height: 22px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 8px;
}

/* Floating config card - 不随缩放变化，保持清晰 */
.floating-config-card {
  position: absolute;
  left: calc(100% + 16px);
  top: 0;
  width: 320px;
  background: rgba(30, 30, 32, 0.95);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 20;
  /* 防止缩放模糊 */
  will-change: transform;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  backface-visibility: hidden;
}

.config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.config-title {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.15s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.config-label {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
}

.config-select {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
  cursor: pointer;
  transition: all 0.15s;
}

.config-select:hover {
  background: rgba(255, 255, 255, 0.1);
}

.scale-buttons {
  display: flex;
  gap: 6px;
}

.scale-btn {
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.06);
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.scale-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.scale-btn.active {
  background: rgba(99, 102, 241, 0.5);
  color: white;
}

.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn.secondary {
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.06);
}

.action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.action-btn.primary {
  background: rgba(99, 102, 241, 0.85);
  color: white;
}

.action-btn.primary:hover:not(:disabled) {
  background: #6366f1;
}

.action-btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Handle styles - top 由 inline style 动态控制，跟随鼠标 */
.handle-dot {
  width: 16px !important;
  height: 16px !important;
  background: #6366f1 !important;
  border: 3px solid #1a1a1c !important;
  border-radius: 50% !important;
  transition: all 0.2s;
  transform-origin: center center !important;
  position: absolute !important;
  z-index: 100 !important;
}

.handle-dot:hover {
  transform: scale(1.35) !important;
  background: #4f46e5 !important;
  box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.15) !important;
}

.handle-dot.right {
  right: -8px !important;
}

.handle-dot.left {
  left: -8px !important;
}

/* 扩图配置卡片样式 */
.expand-card {
  width: auto;
  padding: 12px 16px;
}

.expand-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.expand-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.15s;
}

.expand-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.expand-select {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.expand-select:hover {
  background: rgba(255, 255, 255, 0.12);
}

.expand-select.has-icon {
  background: rgba(99, 102, 241, 0.3);
}

.expand-select.has-icon:hover {
  background: rgba(99, 102, 241, 0.4);
}


.ref-index-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 15px;
  height: 15px;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(129, 140, 248, 0.75);
  border-radius: 50%;
  color: #fde68a;
  font-size: 9px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
  z-index: 4;
  line-height: 1;
}

.prompt-input-container {
  position: relative;
  width: 100%;
  margin-top: 2px;
}

.prompt-editor {
  width: 100%;
  min-height: 110px;
  max-height: 180px;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 14px;
  line-height: 22px;
  box-sizing: border-box;
  margin: 0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow-y: auto;
  outline: none;
  color: #e2e8f0;
  caret-color: #818cf8;
  background: rgba(255, 255, 255, 0.02);
  cursor: text;
}

.prompt-editor[data-empty="true"]::before {
  content: attr(data-placeholder);
  color: rgba(255, 255, 255, 0.3);
  pointer-events: none;
  cursor: text;
}

.char-count {
  position: absolute;
  bottom: 8px;
  right: 10px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.2);
  pointer-events: none;
  transition: color 0.2s;
}

.char-count.warn {
  color: rgba(251, 191, 36, 0.6);
}

.char-count.over {
  color: rgba(239, 68, 68, 0.8);
}

.prompt-editor::selection {
  color: #e2e8f0;
  background: rgba(96, 165, 250, 0.38);
}

.generate-panel.expanded .prompt-editor {
  min-height: 560px;
  max-height: 560px;
}

:deep(.mention-pill) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 68px;
  height: 22px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(129, 140, 248, 0.72);
  padding: 0 6px 0 4px;
  margin: 0 2px;
  border-radius: 6px;
  vertical-align: text-bottom;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.12);
  box-sizing: border-box;
  overflow: hidden;
  user-select: none;
}

:deep(.mention-pill-thumb) {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  object-fit: cover;
  flex: 0 0 16px;
  display: block;
}

:deep(.mention-pill-text) {
  font-size: 12px;
  line-height: 22px;
  color: #dbe4ff;
  font-weight: 600;
  width: 34px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 0 0 34px;
}

:deep(.mention-pill) + :deep(.mention-pill) {
  margin-left: 6px;
}

.mention-list {
  position: absolute;
  z-index: 100;
  background: rgba(38, 38, 38, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  width: 180px;
  max-height: 240px;
  overflow-y: auto;
  padding: 6px;
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.mention-item:hover, .mention-item.active {
  background: rgba(255, 255, 255, 0.1);
}

.mention-thumb {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  object-fit: cover;
}

.mention-name {
  font-size: 13px;
  color: white;
  font-weight: 500;
}

.mention-role {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

/* --- Generate Panel Core Layout | 生图面板核心布局 --- */
/* 顶部行：参考图 + 功能按钮 */
.panel-top-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 6px;
}

.panel-top-spacer {
  flex: 1;
}

/* 功能按钮组 */
.func-btns {
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  padding: 3px;
}

.func-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.func-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
}

.func-btn.icon-only {
  padding: 5px 7px;
}

.func-divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 2px;
}

/* 参考图滚动区 */
.ref-images-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 1px 0;
}

.ref-images-scroll::-webkit-scrollbar {
  display: none;
}

.generate-panel {
  position: absolute;
  top: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  width: 540px;
  background: rgba(28, 28, 30, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 14px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
  z-index: 50;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.generate-panel.expanded {
  width: 800px;
  height: 700px;
  padding-bottom: 18px;
}

.ref-image-wrapper {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  overflow: visible;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  position: relative;
  transition: all 0.2s;
  background: #000;
}

.ref-image-wrapper:hover {
  transform: scale(1.08);
  border-color: var(--accent-color);
  z-index: 10;
}

.ref-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
}

.generate-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-top: 4px;
  margin-top: auto;
  flex-wrap: nowrap;
  overflow: hidden;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.gen-select {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  white-space: nowrap;
}

.gen-select-text {
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
  min-width: 0;
}

.gen-select:hover {
  background: rgba(255, 255, 255, 0.1);
}

.gen-action-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.9);
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.gen-action-btn:hover:not(:disabled) {
  background: #6366f1;
  transform: scale(1.05);
}

.gen-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.gen-action-btn.over {
  background: rgba(239, 68, 68, 0.85);
}

.gen-action-btn.over:hover {
  background: #ef4444;
}
</style>
