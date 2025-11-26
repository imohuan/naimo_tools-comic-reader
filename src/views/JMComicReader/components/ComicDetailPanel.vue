<template>
  <div
    class="bg-cardbg rounded-xl p-6 shadow-lg flex flex-col md:flex-row gap-6"
  >
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
          <div
            class="flex items-center justify-center w-full h-full bg-gray-800"
          >
            <n-spin size="small" />
          </div>
        </template>
      </n-image>
    </div>

    <!-- 信息 -->
    <div class="flex-1">
      <h1 class="text-2xl md:text-3xl font-bold text-white mb-2">
        {{ store.currentComic?.title }}
      </h1>
      <p class="text-gray-400 text-sm mb-4">
        JM ID: {{ store.currentComic?.id }}
      </p>

      <div class="flex flex-wrap gap-2 mb-4">
        <n-tag
          v-for="tag in store.currentComic?.tags"
          :key="tag"
          type="default"
          round
        >
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
              size="small"
              tertiary
              :disabled="store.chapterList.length === 0"
              @click="toggleDownloadMode"
            >
              {{ downloadMode ? "退出下载模式" : "下载模式" }}
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
                :disabled="
                  selectedChapterIds.length === 0 || downloadInProgress
                "
                @click="handleDownloadSelectedChapters"
              >
                {{ downloadInProgress ? "下载中..." : "开始下载" }}
              </n-button>
            </div>
          </div>

          <div
            class="relative grid grid-cols-2 sm:grid-cols-3 gap-3"
            ref="downloadGridRef"
          >
            <template v-if="!downloadMode">
              <button
                v-for="chapter in store.chapterList"
                :key="chapter.id"
                class="chapter-item px-4 py-3 bg-gray-700 hover:bg-primary rounded text-sm text-left transition truncate"
                :class="{
                  'bg-primary chapter-item--active':
                    store.currentChapter?.id === chapter.id,
                }"
                @click="handleSelectChapter(chapter)"
              >
                {{ chapter.title }}
              </button>
            </template>
            <template v-else>
              <label
                v-for="(chapter, index) in store.chapterList"
                :key="chapter.id"
                class="chapter-item flex items-center gap-2 px-3 py-2 bg-gray-800 rounded text-xs cursor-pointer hover:bg-primary transition"
                :class="{
                  'chapter-item--active': selectedChapterIds.includes(
                    chapter.id
                  ),
                }"
                ref="chapterItemEls"
                @click="(e) => handleChapterClick(chapter, index, e)"
              >
                <n-checkbox
                  :checked="selectedChapterIds.includes(chapter.id)"
                  @update:checked="(v: boolean) =>
                    handleSelectChapterForDownload(chapter, v)
                  "
                  @click.stop
                />
                <span class="truncate">{{ chapter.title }}</span>
              </label>
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
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { useMessage } from "naive-ui";
import { useJMComicStore } from "@/stores/jmcomic";
import { eventBus } from "@/utils/event-bus";

const store = useJMComicStore();
const message = useMessage();

const downloadMode = ref(false);
const selectedChapterIds = ref<string[]>([]);
const lastClickedIndex = ref<number | null>(null);
const downloadGridRef = ref<HTMLElement | null>(null);
const chapterItemEls = ref<HTMLElement[]>([]);
const isDraggingSelect = ref(false);
const dragStart = ref<{ x: number; y: number } | null>(null);
const dragCurrent = ref<{ x: number; y: number } | null>(null);
const downloadInProgress = ref(false);

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
  chapterItemEls.value.forEach((el, index) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
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

const sanitizeFilename = (name: string): string => {
  return name.replace(/[\\/:*?"<>|]/g, "_");
};

const buildDownloadTasks = async () => {
  const tasks: Array<{
    chapterId: string;
    chapterTitle: string;
    image: any;
    chapterTotal: number;
  }> = [];

  for (const id of selectedChapterIds.value) {
    const chapter = store.chapterList.find((c: any) => c.id === id);
    if (!chapter) continue;

    let result: any = store.cacheUtils.get(id, "chapters");
    if (!result) {
      if (!store.api) {
        throw new Error("API 未初始化");
      }
      result = await store.api.getChapterImages(id);
      if (result && result.images) {
        store.cacheUtils.set(id, result, "chapters");
      }
    }

    if (result && Array.isArray(result.images)) {
      const chapterTotal = result.images.length;
      result.images.forEach((img: any) => {
        tasks.push({
          chapterId: id,
          chapterTitle: chapter.title,
          image: img,
          chapterTotal,
        });
      });
    }
  }

  return tasks;
};

const runWithConcurrency = async (tasks: any[], concurrency = 10) => {
  const limit = Math.max(1, concurrency);
  let index = 0;

  const worker = async () => {
    while (index < tasks.length) {
      const currentIndex = index++;
      const task = tasks[currentIndex];
      await downloadOne(task, currentIndex + 1);
    }
  };

  const workers: Promise<void>[] = [];
  for (let i = 0; i < limit; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
};

const downloadOne = async (
  task: {
    chapterId: string;
    chapterTitle: string;
    image: any;
    chapterTotal: number;
  },
  index: number
) => {
  try {
    let downloadDir: string | undefined = (store.settings as any).downloadDir;
    if (!downloadDir) {
      try {
        downloadDir = await naimo.system.getPath("downloads");
      } catch (e) {
        console.error("获取系统下载目录失败:", e);
        downloadDir = undefined;
      }
    }

    const comicTitle = sanitizeFilename(store.currentComic?.title || "comic");
    const chapterName = sanitizeFilename(task.chapterTitle || "chapter");

    const baseDir = downloadDir || "";
    const directory = baseDir
      ? `${baseDir}/${comicTitle}/${chapterName}`
      : undefined;

    const extMatch = String(task.image.filename || "").match(/\.([^.]+)$/);
    const ext = extMatch ? extMatch[1] : "png";
    const seq = String(task.image.index || index).padStart(3, "0");
    const filename = `${seq}.${ext}`;

    await naimo.download.startDownload({
      url: task.image.url,
      directory,
      saveAsFilename: filename,
      metadata: {
        source: "jm-comic",
        comicTitle: store.currentComic?.title,
        chapterTitle: task.chapterTitle,
        chapterId: task.chapterId,
        chapterTotal: task.chapterTotal,
      },
    });
  } catch (e) {
    console.error("下载图片失败:", e);
  }
};

const handleDownloadSelectedChapters = async () => {
  if (selectedChapterIds.value.length === 0) return;

  try {
    downloadInProgress.value = true;
    const tasks = await buildDownloadTasks();
    if (tasks.length === 0) {
      message.warning("选中章节没有可下载的图片");
      return;
    }

    const concurrency = (store.settings as any).downloadConcurrency || 10;
    await runWithConcurrency(tasks, concurrency);
    message.success("下载任务已开始，在后台进行");
  } catch (error) {
    console.error("批量下载失败:", error);
    message.error("批量下载失败");
  } finally {
    downloadInProgress.value = false;
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
</script>

<style scoped>
.bg-cardbg {
  background-color: #242424;
}

.chapter-item {
  border-radius: 0.5rem;
  transition: background-color 0.15s ease, box-shadow 0.15s ease,
    transform 0.1s ease;
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
