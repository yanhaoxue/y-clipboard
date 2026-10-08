<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ClipboardRecord } from '../types'
import { resolveImageSrc } from '../utils/image'
import { relTime } from '../utils/format'

/**
 * 全屏图片预览层。
 * 键盘：Esc 关闭 / ←→ 切换 / Enter 复制；点击背景关闭。
 */
const props = defineProps<{
  /** 当前记录（保证是 image 类型） */
  record: ClipboardRecord
  /** 当前是过滤结果中第几张图片 */
  index: number
  /** 过滤结果中图片总数 */
  total: number
}>()

const emit = defineEmits<{
  close: []
  prev: []
  next: []
  copy: [record: ClipboardRecord]
}>()

const failed = ref(false)
const loaded = ref(false)

watch(
  () => props.record.id,
  () => {
    failed.value = false
    loaded.value = false
  }
)

const src = computed(() => resolveImageSrc(props.record.content))

const hasSrc = computed(() => !!src.value)

const metaLine = computed(() => {
  const parts: string[] = []
  const m = props.record.resolution?.match(/^(\d+)\s*\*\s*(\d+)$/)
  if (m) parts.push(`${m[1]} × ${m[2]}`)
  if (props.record.appName) parts.push('来自 ' + props.record.appName)
  const t = relTime(props.record.createdAt)
  if (t) parts.push(t)
  return parts.join(' · ')
})

function onImgLoad(): void {
  loaded.value = true
}

function onImgError(): void {
  failed.value = true
}
</script>

<template>
  <teleport to="body">
    <div class="preview-mask" @click.self="emit('close')">
      <!-- 顶栏：计数 + 关闭 -->
      <div class="preview-top">
        <span class="counter">{{ index + 1 }} / {{ total }}</span>
        <button class="btn" title="复制这张图片 (Enter)" @click="emit('copy', record)">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round"
            stroke-linejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" />
          </svg>
          <span>复制</span>
        </button>
        <button class="btn" title="关闭 (Esc)" @click="emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" />
          </svg>
        </button>
      </div>

      <!-- 主体：图片 / 加载中 / 失败占位 -->
      <div class="preview-stage" @click.self="emit('close')">
        <template v-if="hasSrc && !failed">
          <img
            v-show="loaded"
            class="preview-img"
            :src="src"
            draggable="false"
            alt=""
            @load="onImgLoad"
            @error="onImgError"
          />
          <div v-if="!loaded" class="preview-loading">加载中…</div>
        </template>
        <div v-else class="preview-fallback">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.2" stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M3 5h18v14H3zM3 15l5-4 4 3 3-2 6 5M15.5 9.5a1 1 0 1 0 0-.01" stroke="currentColor" />
          </svg>
          <p>{{ record.preview || '图片加载失败' }}</p>
        </div>

        <!-- 左右切换 -->
        <button v-if="total > 1" class="nav nav-prev" title="上一张 (←)" @click.stop="emit('prev')">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" />
          </svg>
        </button>
        <button v-if="total > 1" class="nav nav-next" title="下一张 (→)" @click.stop="emit('next')">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M9 5l7 7-7 7" stroke="currentColor" />
          </svg>
        </button>
      </div>

      <!-- 底栏：元信息 + 快捷键提示 -->
      <div class="preview-bottom">
        <span class="meta">{{ metaLine }}</span>
        <span class="hint">Esc 关闭 · ← → 切换 · Enter 复制</span>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.preview-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  background: rgba(10, 12, 16, 0.82);
  backdrop-filter: blur(6px);
  animation: fade-in 0.15s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.preview-top {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  color: rgba(255, 255, 255, 0.85);
}

.counter {
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  margin-right: auto;
  opacity: 0.75;
}

.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: none;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.12s;
}

.btn:hover { background: rgba(255, 255, 255, 0.2); }
.btn svg { width: 15px; height: 15px; }

.preview-stage {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 56px;
}

.preview-img {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  animation: img-in 0.18s ease-out;
}

@keyframes img-in {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

.preview-loading,
.preview-fallback {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.preview-fallback svg { width: 48px; height: 48px; opacity: 0.5; }

.nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: background 0.12s;
}

.nav:hover { background: rgba(255, 255, 255, 0.22); }
.nav svg { width: 20px; height: 20px; }
.nav-prev { left: 8px; }
.nav-next { right: 8px; }

.preview-bottom {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
}

.meta { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hint { flex: none; opacity: 0.6; }
</style>
