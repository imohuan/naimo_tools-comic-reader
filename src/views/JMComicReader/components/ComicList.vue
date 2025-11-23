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
        <div
          v-for="item in store.comicList"
          :key="item.id"
          class="bg-cardbg rounded-lg overflow-hidden hover:ring-2 ring-primary transition cursor-pointer group"
          :class="{ 'ring-2 ring-primary': store.currentComic?.id === item.id }"
          @click="$emit('select-comic', item)"
        >
          <div class="aspect-[2/3] overflow-hidden relative">
            <n-image
              :src="getProxiedUrl(item.cover || '', true)"
              lazy
              preview-disabled
              class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              :intersection-observer-options="{
                root: containerRef,
              }"
              @error="handleImgError"
            >
              <template #placeholder>
                <div
                  class="flex items-center justify-center w-full h-full bg-gray-800"
                >
                  <n-spin size="small" />
                </div>
              </template>
            </n-image>
            <div
              class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2"
            >
              <span class="text-xs text-gray-300">{{ item.author }}</span>
            </div>
          </div>
          <div class="p-2 flex flex-col gap-2">
            <h3 class="text-xs font-bold line-clamp-2 h-8 text-gray-100">
              {{ item.title }}
            </h3>
            <div class="flex justify-between items-center mt-1">
              <n-tag size="tiny" type="info">{{ item.id }}</n-tag>
              <span class="text-xs text-gray-500">{{
                item.date || "最新"
              }}</span>
            </div>
          </div>
        </div>
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

const getProxiedUrl = (url: string, isImage = false): string => {
  if (!url) return "";
  if (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.includes("placeholder")
  )
    return url;

  if (store.settings.proxyUrl) {
    const typeParam = isImage ? "&type=image" : "";
    return `${store.settings.proxyUrl}${encodeURIComponent(url)}${typeParam}`;
  }

  return url;
};

const handleImgError = () => {
  // 错误处理
};
</script>

<style scoped>
.bg-cardbg {
  background-color: #242424;
}
</style>
