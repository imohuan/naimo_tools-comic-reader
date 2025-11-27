<template>
  <div ref="containerRef" class="h-full overflow-auto" style="min-height: 0">
    <div
      v-if="store.loading && store.comicList.length === 0"
      class="py-20 text-center text-gray-500"
    >
      <n-spin size="large">
        <template #description>
          <p>正在加载数据...</p>
        </template>
      </n-spin>
    </div>

    <div
      v-else-if="store.comicList.length === 0"
      class="text-center py-20 text-gray-500"
    >
      <n-empty description="暂无数据，请尝试搜索" />
    </div>

    <n-infinite-scroll
      v-else
      ref="infiniteScrollRef"
      :distance="10"
      @load="handleLoad"
      class="w-full h-full relative viewer comic-viewer"
    >
      <!-- 手动切换页面时的绝对定位加载指示器 -->
      <div
        v-if="
          store.loading && store.comicList.length > 0 && store.isManualLoading
        "
        class="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm"
      >
        <div class="flex flex-col items-center justify-center gap-3">
          <n-spin size="large" />
          <p class="text-sm text-gray-400">正在加载...</p>
        </div>
      </div>
      <div
        class="p-2"
        :style="{
          display: 'grid',
          gridTemplateColumns: `repeat(${leftColumnCount}, minmax(150px, 350px))`,
          gap: '0.5rem',
        }"
      >
        <ComicListItem
          v-for="item in store.comicList"
          :key="item.id"
          :comic="item"
          :is-active="store.currentComic?.id + '' === item.id + ''"
          :container="containerRef"
          @select="(comic) => $emit('select-comic', comic)"
        />
      </div>
      <div
        v-if="store.loading && store.comicList.length > 0"
        class="py-4 text-center text-gray-500"
      >
        <n-spin size="small" />
        <p class="text-xs mt-2">加载中...</p>
      </div>
      <div
        v-if="
          !store.hasMorePages && store.comicList.length > 0 && !store.loading
        "
        class="py-4 text-center text-gray-500"
      >
        <p class="text-xs">没有更多了 🤪</p>
      </div>
    </n-infinite-scroll>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from "vue";
import { useElementSize } from "@vueuse/core";
import { useJMComicStore } from "@/stores/jmcomic";
import { usePagination } from "@/hooks/usePagination";
import ComicListItem from "./ComicListItem.vue";

defineEmits<{
  "select-comic": [comic: any];
}>();

const store = useJMComicStore();
const { handleLoad } = usePagination();

const containerRef = ref<HTMLElement | null>(null);
const infiniteScrollRef = ref<any>(null);
const { width: containerWidth } = useElementSize(containerRef);

const leftColumnCount = computed(() => {
  const minColumnWidth = 200;
  const gap = 8; // 0.5rem = 8px
  const padding = 16; // p-2 = 0.5rem * 2 = 16px
  const availableWidth = containerWidth.value - padding;

  if (availableWidth < minColumnWidth) {
    return 1;
  }
  const columns = Math.floor((availableWidth + gap) / (minColumnWidth + gap));
  return Math.max(1, Math.min(columns, 10));
});

// 滚动到顶部
function scrollToTop() {
  nextTick(() => {
    // 使用 n-infinite-scroll 内部的 scrollbarInstRef 的 scrollTo 方法
    if (infiniteScrollRef.value?.scrollbarInstRef?.scrollTo) {
      infiniteScrollRef.value.scrollbarInstRef.scrollTo({ top: 0, left: 0 });
      return;
    }
  });
}

// 暴露方法供父组件调用
defineExpose({
  scrollToTop,
});
</script>

<style scoped>
.bg-cardbg {
  background-color: #242424;
}
</style>
