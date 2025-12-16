<template>
  <div class="bg-cardbg rounded-xl p-6 shadow-lg flex flex-col md:flex-row gap-6">
    <!-- 封面 -->
    <div class="w-full md:w-1/2 lg:w-1/3 flex-shrink-0">
      <n-image
        :src="getProxiedUrl(store.currentComic?.cover || '', true)"
        lazy
        :preview-disabled="false"
        class="w-full rounded-lg shadow-md object-cover aspect-[2/3]"
        @error="handleImgError"
      >
        <template #placeholder>
          <div class="flex items-center justify-center w-full h-full bg-gray-800">
            <n-spin size="small" />
          </div>
        </template>
      </n-image>
    </div>

    <!-- 信息 -->
    <div class="flex-1 select-text">
      <h1 class="text-2xl md:text-3xl font-bold text-white mb-2">
        {{ store.currentComic?.title }}
      </h1>
      <p class="text-gray-400 text-sm mb-4">JM ID: {{ store.currentComic?.id }}</p>

      <!-- 统计信息 -->
      <div v-if="hasStats" class="flex items-center gap-4 mb-4 text-sm">
        <div
          v-if="store.currentComic?.likes"
          class="flex items-center gap-1.5 text-gray-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4 text-red-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            />
          </svg>
          <span>{{ formatNumber(store.currentComic.likes) }}</span>
        </div>
        <div
          v-if="store.currentComic?.total_views"
          class="flex items-center gap-1.5 text-gray-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4 text-blue-400"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span>{{ formatNumber(store.currentComic.total_views) }}</span>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mb-4">
        <n-tag v-for="tag in store.currentComic?.tags" :key="tag" type="default" round>
          {{ tag }}
        </n-tag>
      </div>

      <p class="text-gray-300 text-sm leading-relaxed mb-6">
        {{ store.currentComic?.description || "暂无简介..." }}
      </p>

      <div class="border-t border-gray-700 pt-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold flex items-center">章节列表</h3>
          <div class="flex items-center gap-2">
            <n-button
              v-if="store.chapterList.length > 1"
              size="small"
              tertiary
              @click="toggleDownloadMode"
            >
              {{ downloadMode ? "退出下载模式" : "下载模式" }}
            </n-button>
            <n-button
              size="small"
              type="primary"
              secondary
              :disabled="store.chapterList.length === 0"
              @click="handleDownloadAllChapters"
            >
              一键全部下载
            </n-button>
          </div>
        </div>
        <div
          v-if="store.detailLoading && store.chapterList.length === 0"
          class="py-10 text-center"
        >
          <n-spin size="large" />
        </div>
        <div v-else>
          <div
            v-if="downloadMode"
            class="flex items-center justify-between mb-3 text-xs text-gray-300"
          >
            <div>
              已选 {{ selectedChapterIds.length }} /
              {{ store.chapterList.length }}
            </div>
            <div class="flex items-center gap-2">
              <n-button size="tiny" @click="handleToggleSelectAll">
                {{
                  selectedChapterIds.length === store.chapterList.length
                    ? "取消全选"
                    : "全选"
                }}
              </n-button>
              <n-button
                type="primary"
                size="tiny"
                :disabled="selectedChapterIds.length === 0"
                @click="handleDownloadSelectedChapters"
              >
                开始下载
              </n-button>
            </div>
          </div>

          <div
            class="relative grid grid-cols-2 sm:grid-cols-3 gap-3"
            ref="downloadGridRef"
          >
            <template v-if="!downloadMode">
              <ChapterListItem
                v-for="chapter in store.chapterList"
                :key="chapter.id"
                :chapter="chapter"
                :is-active="store.currentChapter?.id === chapter.id"
                :download-mode="false"
                :selected="false"
                :download-info="getChapterDownloadInfo(chapter.id)"
                @select="() => handleSelectChapter(chapter)"
              />
            </template>
            <template v-else>
              <ChapterListItem
                v-for="(chapter, index) in store.chapterList"
                :key="chapter.id"
                ref="chapterItemEls"
                :chapter="chapter"
                :is-active="selectedChapterIds.includes(chapter.id)"
                :download-mode="true"
                :selected="selectedChapterIds.includes(chapter.id)"
                :download-info="getChapterDownloadInfo(chapter.id)"
                @select="(event) => handleChapterClick(chapter, index, event)"
                @toggle-select="(v) => handleSelectChapterForDownload(chapter, v)"
              />
            </template>
            <div
              v-if="isDraggingSelect && dragStart && dragCurrent"
              class="pointer-events-none absolute rounded-sm"
              :style="dragRectStyle"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useMessage } from "naive-ui";
import { useJMComicStore } from "@/stores/jmcomic";
import {
  useJMDownloadStore,
  type ChapterDownloadItem,
} from "@/stores/jmDownload";
import { eventBus } from "@/utils/event-bus";
import ChapterListItem from "./ChapterListItem.vue";

const store = useJMComicStore();
const downloadStore = useJMDownloadStore();
const message = useMessage();

const downloadMode = ref(false);
const selectedChapterIds = ref<string[]>([]);
const lastClickedIndex = ref<number | null>(null);
const downloadGridRef = ref<HTMLElement | null>(null);
const chapterItemEls = ref<any[]>([]);
const isDraggingSelect = ref(false);
const dragStart = ref<{ x: number; y: number } | null>(null);
const dragCurrent = ref<{ x: number; y: number } | null>(null);

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

const hasStats = computed(() => {
  return (
    (store.currentComic?.likes !== undefined &&
      store.currentComic?.likes !== null &&
      store.currentComic?.likes !== "") ||
    (store.currentComic?.total_views !== undefined &&
      store.currentComic?.total_views !== null &&
      store.currentComic?.total_views !== "")
  );
});

const formatNumber = (value: string | number | undefined): string => {
  if (value === undefined || value === null || value === "") return "0";
  const num = typeof value === "string" ? parseInt(value, 10) : value;
  if (isNaN(num)) return "0";
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万";
  }
  return num.toLocaleString();
};

const toggleDownloadMode = () => {
  downloadMode.value = !downloadMode.value;
  if (!downloadMode.value) {
    selectedChapterIds.value = [];
  }
};

const dragRectStyle = computed(() => {
  if (!dragStart.value || !dragCurrent.value || !downloadGridRef.value) {
    return {} as Record<string, string>;
  }

  const gridRect = downloadGridRef.value.getBoundingClientRect();

  const rawX1 = Math.min(dragStart.value.x, dragCurrent.value.x);
  const rawY1 = Math.min(dragStart.value.y, dragCurrent.value.y);
  const rawX2 = Math.max(dragStart.value.x, dragCurrent.value.x);
  const rawY2 = Math.max(dragStart.value.y, dragCurrent.value.y);

  const x1 = Math.max(rawX1, gridRect.left);
  const y1 = Math.max(rawY1, gridRect.top);
  const x2 = Math.min(rawX2, gridRect.right);
  const y2 = Math.min(rawY2, gridRect.bottom);

  const left = x1 - gridRect.left;
  const top = y1 - gridRect.top;
  const width = Math.max(0, x2 - x1);
  const height = Math.max(0, y2 - y1);

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    // 半透明浅色背景，保证在深色主题下可见
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  };
});

const getChapterDownloadInfo = (chapterId: string) => {
  return downloadStore.getChapterDownload(chapterId) || null;
};

const handleSelectChapterForDownload = (chapter: any, checked: boolean) => {
  const id = chapter.id;
  const current = selectedChapterIds.value.slice();
  const index = current.indexOf(id);
  if (checked) {
    if (index === -1) current.push(id);
  } else {
    if (index !== -1) current.splice(index, 1);
  }
  selectedChapterIds.value = current;
};

const applyRangeSelection = (start: number, end: number) => {
  const [from, to] = start < end ? [start, end] : [end, start];
  const ids: string[] = [];
  for (let i = from; i <= to; i++) {
    const chapter = store.chapterList[i];
    if (chapter) ids.push(chapter.id);
  }
  selectedChapterIds.value = ids;
};

const handleChapterClick = (
  chapter: any,
  index: number,
  event?: MouseEvent
) => {
  if (!downloadMode.value) return;

  if (event && event.shiftKey && lastClickedIndex.value !== null) {
    applyRangeSelection(lastClickedIndex.value, index);
  } else {
    const checked = !selectedChapterIds.value.includes(chapter.id);
    handleSelectChapterForDownload(chapter, checked);
  }

  lastClickedIndex.value = index;
};

const updateDragSelection = () => {
  if (!dragStart.value || !dragCurrent.value) return;
  const x1 = Math.min(dragStart.value.x, dragCurrent.value.x);
  const y1 = Math.min(dragStart.value.y, dragCurrent.value.y);
  const x2 = Math.max(dragStart.value.x, dragCurrent.value.x);
  const y2 = Math.max(dragStart.value.y, dragCurrent.value.y);

  const newlySelected: string[] = [];
  const resolveElement = (target: any): HTMLElement | null => {
    if (!target) return null;
    if (typeof target.getElement === "function") {
      return target.getElement();
    }
    if (target.$el) {
      return target.$el as HTMLElement;
    }
    return target as HTMLElement;
  };

  chapterItemEls.value.forEach((el, index) => {
    const element = resolveElement(el);
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
      const chapter = store.chapterList[index];
      if (chapter) newlySelected.push(chapter.id);
    }
  });

  selectedChapterIds.value = newlySelected;
};

const handleMouseDown = (event: MouseEvent) => {
  if (!downloadMode.value) return;
  const grid = downloadGridRef.value;
  if (!grid) return;
  if (!grid.contains(event.target as Node)) return;

  // 仅在按住 Shift 时启用框选
  if (!event.shiftKey) return;

  // 在 checkbox 上按下时不启用拖动框选
  const target = event.target as HTMLElement;
  if (target.closest(".n-checkbox")) return;

  isDraggingSelect.value = true;
  dragStart.value = { x: event.clientX, y: event.clientY };
  dragCurrent.value = { x: event.clientX, y: event.clientY };

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
};

const handleMouseMove = (event: MouseEvent) => {
  if (!isDraggingSelect.value) return;
  dragCurrent.value = { x: event.clientX, y: event.clientY };
  updateDragSelection();
};

const handleMouseUp = () => {
  if (!isDraggingSelect.value) return;
  isDraggingSelect.value = false;
  dragStart.value = null;
  dragCurrent.value = null;
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (!downloadMode.value) return;
  if (event.key === "a" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    selectedChapterIds.value = store.chapterList.map((c: any) => c.id);
  }
};

onMounted(() => {
  window.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("keydown", handleKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener("mousedown", handleMouseDown);
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
  window.removeEventListener("keydown", handleKeyDown);
});

const handleToggleSelectAll = () => {
  if (selectedChapterIds.value.length === store.chapterList.length) {
    selectedChapterIds.value = [];
  } else {
    selectedChapterIds.value = store.chapterList.map((c: any) => c.id);
  }
};

const handleDownloadSelectedChapters = async () => {
  if (selectedChapterIds.value.length === 0) return;

  try {
    const success = await downloadStore.startDownload(
      selectedChapterIds.value.slice()
    );
    if (!success) {
      message.warning("选中章节没有可下载的图片");
      return;
    }
    message.success("下载任务已开始，在后台进行");
  } catch (error) {
    console.error("批量下载失败:", error);
    message.error("批量下载失败");
  } finally {
    downloadMode.value = false;
    selectedChapterIds.value = [];
  }
};

const handleDownloadAllChapters = async () => {
  if (store.chapterList.length === 0) return;
  const allIds = store.chapterList.map((chapter: any) => chapter.id);
  try {
    const success = await downloadStore.startDownload(allIds);
    if (!success) {
      message.warning("没有可下载的章节");
      return;
    }
    message.success("所有章节下载任务已开始，在后台进行");
  } catch (error) {
    console.error("下载全部章节失败:", error);
    message.error("下载全部章节失败");
  } finally {
    downloadMode.value = false;
    selectedChapterIds.value = [];
  }
};

const handleSelectChapter = async (chapter: any) => {
  // 清理旧章节的所有 blob URL
  if (store.currentChapterImages && store.currentChapterImages.length > 0) {
    store.currentChapterImages.forEach((imageObj) => {
      if (imageObj.processedUrl && imageObj.processedUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageObj.processedUrl);
        imageObj.processedUrl = undefined;
      }
    });
  }

  store.setCurrentChapter(chapter);
  store.setReadingImages([]);
  store.setCurrentChapterImages([]);
  store.setCurrentImageIndex(0);
  store.setDetailLoading(true);

  try {
    const loadedFromLocal = await tryLoadDownloadedChapter(chapter);
    if (loadedFromLocal) {
      return;
    }

    const chapterId = chapter.id;

    // 先检查缓存
    let result: any = store.cacheUtils.get(chapterId, "chapters");

    if (!result) {
      if (!store.api) {
        throw new Error("API 未初始化");
      }
      result = await store.api.getChapterImages(chapterId);
      if (result && result.images) {
        store.cacheUtils.set(chapterId, result, "chapters");
      }
    }

    if (result && result.images && Array.isArray(result.images)) {
      store.setCurrentChapterImages(result.images);
      store.setReadingImages(
        result.images.map((img: any, idx: number) => ({
          url: img.url,
          index: idx,
        }))
      );
    } else {
      throw new Error("章节图片列表为空");
    }

    // 切换到图片预览视图
    eventBus.emit("chapter-selected", { chapterId: chapter.id });
  } catch (error: any) {
    console.error("获取章节图片失败:", error);
  } finally {
    store.setDetailLoading(false);
  }
};

const tryLoadDownloadedChapter = async (chapter: any) => {
  const downloadInfo: ChapterDownloadItem | undefined =
    downloadStore.getChapterDownload(chapter.id);

  if (!downloadInfo || downloadInfo.status !== "completed") {
    return false;
  }

  const images = await downloadStore.getDownloadedChapterImages(chapter.id);
  if (!images || images.length === 0) {
    message.warning("本地下载内容为空，尝试在线读取");
    return false;
  }

  const normalized = images.map((img: any, idx: number) => {
    const filename = img.filename || `image-${idx + 1}.jpg`;
    return {
      url: img.url,
      path: img.path,
      filename,
      index: idx,
    };
  });

  store.setCurrentChapterImages(
    normalized.map((img) => ({
      url: img.url,
      filename: img.filename,
      filenameWithoutExt: img.filename.replace(/\.[^.]+$/, ""),
      blockNum: 0,
      index: img.index,
      localPath: img.path,
    }))
  );

  store.setReadingImages(
    normalized.map((img) => ({
      url: img.url,
      index: img.index,
      path: img.path,
    }))
  );

  eventBus.emit("chapter-selected", {
    chapterId: chapter.id,
  });
  message.success("已加载本地下载章节");
  return true;
};

watch(
  () => ({
    comicTitle: store.currentComic?.title,
    chapters: (store.chapterList || []).map((chapter: any) => ({
      id: chapter.id,
      title: chapter.title,
    })),
  }),
  (payload) => {
    if (!payload.comicTitle || !payload.chapters) return;
    payload.chapters.forEach((chapter) => {
      downloadStore.ensureLocalDownloadRecord(
        chapter.id,
        chapter.title,
        payload.comicTitle as string
      );
    });
  },
  { immediate: true, deep: true }
);
</script>

<style scoped>
.bg-cardbg {
  background-color: #242424;
}

.chapter-item {
  border-radius: 0.5rem;
  transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.chapter-item:hover {
  /* 更明显的 hover 背景 + 轻微 ring，不改动 border */
  background-color: #64748b !important;
  box-shadow: 0 0 0 1px rgba(248, 250, 252, 0.25);
}

.chapter-item--active {
  /* active 状态：略亮一些的深色背景 + 柔和 ring */
  background-color: #4b5563 !important; /* 比默认背景略亮/偏暖 */
  box-shadow: 0 0 0 2px rgba(248, 250, 252, 0.35);
  transform: translateY(-1px);
}

.chapter-item--active:hover {
  /* hover 时保持选中背景，只略微增强 ring */
  background-color: #4b5563 !important;
  box-shadow: 0 0 0 2px rgba(248, 250, 252, 0.5);
}
</style>
