<template>
  <component
    :is="downloadMode ? 'label' : 'button'"
    ref="rootRef"
    class="chapter-item flex flex-col gap-1 px-3 py-2 bg-gray-700/70 rounded text-sm text-left transition"
    :class="{
      'cursor-pointer': true,
      'chapter-item--active': isActive || selected,
    }"
    @click="handleClick"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 flex-1 overflow-hidden">
        <n-checkbox
          v-if="downloadMode"
          size="small"
          :checked="selected"
          @update:checked="handleCheckbox"
          @click.stop
        />
        <span class="truncate" :title="chapter.title">
          {{ chapter.title }}
        </span>
      </div>
      <div v-if="downloadInfo" class="text-xs flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-gray-600 text-gray-100"
          :class="statusClass"
        >
          <span>{{ statusText }}</span>
        </span>
        <span v-if="shouldShowProgress" class="text-gray-400">
          {{ progressText }}
        </span>
      </div>
    </div>
    <n-progress
      v-if="shouldShowProgress"
      :percentage="progress"
      :show-indicator="false"
      status="success"
      size="small"
      processing
    />
  </component>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { ChapterDownloadItem } from "@/stores/jmDownload";

interface Props {
  chapter: { id: string; title: string };
  isActive: boolean;
  downloadMode: boolean;
  selected: boolean;
  downloadInfo?: ChapterDownloadItem | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "select", event: MouseEvent): void;
  (e: "toggle-select", value: boolean): void;
}>();

const rootRef = ref<HTMLElement | null>(null);

const statusText = computed(() => {
  if (!props.downloadInfo) return "";
  const map: Record<string, string> = {
    pending: "等待下载",
    fetching: "加载中",
    queued: "排队中",
    downloading: "下载中",
    completed: "已完成",
    error: "下载失败",
  };
  return map[props.downloadInfo.status] || "";
});

const statusClass = computed(() => {
  if (!props.downloadInfo) return "";
  const map: Record<string, string> = {
    pending: "bg-gray-600",
    fetching: "bg-blue-600",
    queued: "bg-blue-600",
    downloading: "bg-primary text-black",
    completed: "bg-green-600",
    error: "bg-red-600",
  };
  return map[props.downloadInfo.status] || "";
});

const progress = computed(() => {
  if (!props.downloadInfo || props.downloadInfo.total === 0) return 0;
  return Math.floor(
    (props.downloadInfo.finished / props.downloadInfo.total) * 100
  );
});

const progressText = computed(() => {
  if (!props.downloadInfo) return "";
  if (props.downloadInfo.total === 0) return "";
  return `${props.downloadInfo.finished}/${props.downloadInfo.total}`;
});

const shouldShowProgress = computed(() => {
  if (!props.downloadInfo) return false;
  return (
    props.downloadInfo.status === "downloading" && props.downloadInfo.total > 0
  );
});

const handleClick = (event: MouseEvent) => {
  emit("select", event);
};

const handleCheckbox = (value: boolean) => {
  emit("toggle-select", value);
};

defineExpose({
  getElement: () => rootRef.value,
});
</script>
