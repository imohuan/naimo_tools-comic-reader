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

    <div v-else-if="store.comicList.length === 0" class="text-center py-20 text-gray-500">
      <n-empty description="暂无数据，请尝试搜索" />
    </div>

    <n-infinite-scroll
      v-else
      ref="infiniteScrollRef"
      :distance="10"
      @load="handleLoad"
      class="w-full h-full relative viewer comic-viewer"
    >
      <!-- 多选模式工具栏 -->
      <div
        v-if="selectMode"
        class="sticky top-0 z-40 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 p-3 mb-2"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-300">
              已选 {{ selectedComicIds.length }} / {{ store.comicList.length }}
            </span>
            <n-button size="small" @click="handleToggleSelectAll">
              {{
                selectedComicIds.length === store.comicList.length ? "取消全选" : "全选"
              }}
            </n-button>
          </div>
          <div class="flex items-center gap-2">
            <n-button
              type="primary"
              size="small"
              :disabled="selectedComicIds.length === 0"
              :loading="isDownloading"
              @click="handleBatchDownload"
            >
              一键全部下载
            </n-button>
            <n-button size="small" @click="toggleSelectMode"> 退出多选 </n-button>
          </div>
        </div>
      </div>
      <!-- 手动切换页面时的绝对定位加载指示器 -->
      <div
        v-if="store.loading && store.comicList.length > 0 && store.isManualLoading"
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
          v-for="(item, index) in store.comicList"
          :key="`${item.id}-${index}`"
          :comic="item"
          :is-active="store.currentComic?.id + '' === item.id + ''"
          :container="containerRef"
          :is-sidebar-collapsed="props.sidebarCollapsed ?? false"
          :select-mode="selectMode"
          :selected="selectedComicIds.includes(item.id + '')"
          @select="handleComicSelect"
          @toggle-select="handleToggleComicSelect"
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
        v-if="!store.hasMorePages && store.comicList.length > 0 && !store.loading"
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
import { useMessage } from "naive-ui";
import { useJMComicStore } from "@/stores/jmcomic";
import { useJMDownloadStore } from "@/stores/jmDownload";
import { usePagination } from "@/hooks/usePagination";
import ComicListItem from "./ComicListItem.vue";

const props = defineProps<{
  sidebarCollapsed?: boolean;
}>();

const emit = defineEmits<{
  "select-comic": [comic: any];
}>();

const store = useJMComicStore();
const downloadStore = useJMDownloadStore();
const message = useMessage();
const { handleLoad } = usePagination();

const containerRef = ref<HTMLElement | null>(null);
const infiniteScrollRef = ref<any>(null);
const { width: containerWidth } = useElementSize(containerRef);

const selectMode = ref(false);
const selectedComicIds = ref<string[]>([]);
const isDownloading = ref(false);

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

const toggleSelectMode = () => {
  selectMode.value = !selectMode.value;
  if (!selectMode.value) {
    selectedComicIds.value = [];
  }
};

const handleComicSelect = (comic: any) => {
  if (selectMode.value) {
    handleToggleComicSelect(comic);
  } else {
    emit("select-comic", comic);
  }
};

const handleToggleComicSelect = (comic: any) => {
  if (!selectMode.value) return;
  const comicId = comic.id + "";
  const index = selectedComicIds.value.indexOf(comicId);
  if (index === -1) {
    selectedComicIds.value.push(comicId);
  } else {
    selectedComicIds.value.splice(index, 1);
  }
};

const handleToggleSelectAll = () => {
  if (selectedComicIds.value.length === store.comicList.length) {
    selectedComicIds.value = [];
  } else {
    selectedComicIds.value = store.comicList.map((comic: any) => comic.id + "");
  }
};

const handleBatchDownload = async () => {
  if (selectedComicIds.value.length === 0) return;
  if (isDownloading.value) return;

  isDownloading.value = true;
  try {
    const selectedComics = store.comicList.filter((comic: any) =>
      selectedComicIds.value.includes(comic.id + "")
    );

    let totalChapters = 0;
    const allChapterIds: string[] = [];
    const chapterInfoMap: Record<
      string,
      { comicTitle: string; chapterTitle: string }
    > = {};

    // 获取每个选中漫画的章节列表
    for (const comic of selectedComics) {
      try {
        const comicId = comic.id;
        let detail: any = store.cacheUtils.get(comicId, "details");

        if (!detail) {
          if (!store.api) {
            throw new Error("API 未初始化");
          }
          detail = await store.api.getComic(comicId);
          if (detail) {
            store.cacheUtils.set(comicId, detail, "details");
          }
        }

        if (!detail) {
          message.warning(`无法获取《${comic.title}》的详情`);
          continue;
        }

        const comicTitle = detail.title || comic.title || "未知作品";
        let chapters: any[] = [];

        // 提取章节列表
        if (detail.series && Array.isArray(detail.series) && detail.series.length > 0) {
          chapters = detail.series.map((item: any) => {
            let title = item.name;
            if (!title || title.trim() === "") {
              const sortValue = item.sort || "";
              title = sortValue ? `第${sortValue}话` : "未知章节";
            }
            return {
              id: item.id || item.chapter_id,
              title: title,
              order: parseInt(item.sort || 0),
            };
          });
        } else if (
          detail.photos &&
          Array.isArray(detail.photos) &&
          detail.photos.length > 0
        ) {
          chapters = detail.photos.map((photo: any, index: number) => ({
            id: photo.id || photo.photo_id || photo.chapter_id || index + 1,
            title: photo.title || photo.name || `第${index + 1}话`,
            order: photo.order || index + 1,
          }));
        } else if (
          detail.chapters &&
          Array.isArray(detail.chapters) &&
          detail.chapters.length > 0
        ) {
          chapters = detail.chapters.map((chapter: any, index: number) => ({
            id: chapter.id || chapter.chapter_id || index + 1,
            title: chapter.title || chapter.name || `第${index + 1}话`,
            order: chapter.order || index + 1,
          }));
        } else {
          chapters = [
            {
              id: comicId,
              title: "第一章",
              order: 1,
            },
          ];
        }

        chapters.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

        // 收集章节ID和信息
        chapters.forEach((chapter: any) => {
          const chapterId = chapter.id + "";
          if (!allChapterIds.includes(chapterId)) {
            allChapterIds.push(chapterId);
            chapterInfoMap[chapterId] = {
              comicTitle,
              chapterTitle: chapter.title || `章节 ${chapterId}`,
            };
          }
        });

        totalChapters += chapters.length;
      } catch (error: any) {
        console.error(`获取《${comic.title}》章节列表失败:`, error);
        message.warning(`获取《${comic.title}》章节列表失败`);
      }
    }

    if (allChapterIds.length === 0) {
      message.warning("没有找到可下载的章节");
      return;
    }

    // 批量下载所有章节
    const success = await downloadStore.startDownload(allChapterIds, chapterInfoMap);

    if (success) {
      message.success(
        `已开始下载 ${selectedComics.length} 部漫画的 ${totalChapters} 个章节`
      );
      selectMode.value = false;
      selectedComicIds.value = [];
    } else {
      message.warning("没有可下载的章节");
    }
  } catch (error: any) {
    console.error("批量下载失败:", error);
    message.error("批量下载失败: " + (error.message || "未知错误"));
  } finally {
    isDownloading.value = false;
  }
};

// 暴露方法供父组件调用
defineExpose({
  scrollToTop,
  toggleSelectMode,
});
</script>

<style scoped>
.bg-cardbg {
  background-color: #242424;
}
</style>
