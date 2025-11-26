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
      :distance="10"
      @load="handleLoad"
      class="w-full h-full"
    >
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
import { computed, ref } from "vue";
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

// 图片错误处理逻辑已在子组件中实现，这里保留文件结构即可
</script>

<style scoped>
.bg-cardbg {
  background-color: #242424;
}
</style>
