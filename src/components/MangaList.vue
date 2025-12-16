<template>
  <div class="flex-1 overflow-y-auto">
    <div
      v-if="store.mangas.length === 0 && !store.loading.library"
      class="text-center py-10 text-gray-600 text-xs"
    >
      暂无数据
    </div>

    <n-scrollbar
      ref="scrollbarRef"
      class="menu viewer"
      @click="contextMenuVisible = false"
    >
      <div class="p-2 pr-3">
        <template v-for="manga in store.mangas" :key="manga.name">
          <!-- 单章节漫画 -->
          <div v-if="manga.meta.chapterInfos.length === 1" class="mb-1">
            <div
              class="group flex items-center gap-2 rounded cursor-pointer transition-colors hover:bg-white/5"
              :class="{
                'bg-green-500/10 text-green-400':
                  store.currentManga?.name === manga.name &&
                  store.currentChapter === manga.meta.chapterInfos[0].chapterTitle,
              }"
              @click="handleChapterClick(manga, manga.meta.chapterInfos[0].chapterTitle)"
              @contextmenu.prevent="openContextMenu($event, manga)"
            >
              <div
                class="w-12 h-16 bg-gray-800 rounded-sm overflow-hidden border border-white/10 flex items-center justify-center flex-shrink-0 relative"
              >
                <LazyFileImage
                  :item="coverImageItems[manga.name] || placeholderCoverItems[manga.name]"
                  :file-path="coverImageItems[manga.name]?.path || ''"
                  :get-scroll-container="getScrollContainer"
                  :img-style="{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }"
                  img-class="w-full h-full object-cover"
                  @visible="handleCoverVisible(manga)"
                />
                <div
                  class="absolute bottom-0 right-0 px-1 py-0.5 bg-black/60 text-[8px] text-gray-200"
                >
                  封面
                </div>
              </div>
              <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
                <span
                  class="text-xs truncate font-medium leading-tight"
                  :title="manga.name"
                >
                  {{ manga.name }}
                </span>
                <n-tag
                  size="small"
                  :bordered="false"
                  class="text-[10px] h-4 px-1 bg-white/5 text-gray-500 mt-1 self-start"
                >
                  单章
                </n-tag>
              </div>
            </div>
          </div>

          <!-- 多章节漫画 -->
          <n-collapse
            v-else
            :default-expanded-names="getExpandedName(manga)"
            arrow-placement="right"
            class="mb-1"
          >
            <n-collapse-item :name="manga.name" class="w-full">
              <template #header>
                <div
                  class="flex items-center gap-2 w-full"
                  @contextmenu.prevent="openContextMenu($event, manga)"
                >
                  <div
                    class="w-12 h-16 bg-gray-800 rounded-sm overflow-hidden border border-white/10 flex items-center justify-center flex-shrink-0 relative"
                  >
                    <LazyFileImage
                      :item="
                        coverImageItems[manga.name] || placeholderCoverItems[manga.name]
                      "
                      :file-path="coverImageItems[manga.name]?.path || ''"
                      :get-scroll-container="getScrollContainer"
                      :img-style="{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }"
                      img-class="w-full h-full object-cover"
                      @visible="handleCoverVisible(manga)"
                    />
                    <div
                      class="absolute bottom-0 right-0 px-1 py-0.5 bg-black/60 text-[8px] text-gray-200"
                    >
                      {{ manga.meta.chapterInfos.length }}
                    </div>
                  </div>
                  <div class="flex-1 w-full">
                    <span class="text-xs font-medium leading-tight" :title="manga.name">
                      {{ manga.name }}
                    </span>
                  </div>
                  <n-tag
                    size="small"
                    :bordered="false"
                    class="text-[10px] h-4 px-1 bg-white/5 text-gray-500 flex-shrink-0"
                  >
                    {{ manga.meta.chapterInfos.length }}章
                  </n-tag>
                </div>
              </template>

              <div class="pl-14 pr-2 py-1 space-y-1">
                <div
                  v-for="chapter in manga.meta.chapterInfos"
                  :key="chapter.chapterId"
                  class="px-2 py-1.5 rounded cursor-pointer text-xs transition-colors hover:bg-white/5"
                  :class="{
                    'bg-green-500/10 text-green-400':
                      store.currentManga?.name === manga.name &&
                      store.currentChapter === chapter.chapterTitle,
                  }"
                  @click="handleChapterClick(manga, chapter.chapterTitle)"
                >
                  <span class="truncate block" :title="chapter.chapterTitle">
                    {{ chapter.chapterTitle }}
                  </span>
                </div>
              </div>
            </n-collapse-item>
          </n-collapse>
        </template>
      </div>
    </n-scrollbar>

    <n-dropdown
      placement="bottom-start"
      trigger="manual"
      :show="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      :options="contextMenuOptions"
      @select="handleContextMenuSelect"
      @clickoutside="contextMenuVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import LazyFileImage from "./LazyFileImage.vue";
import { useComicStore } from "../stores/comic";
import type { ImageItem, MangaItem } from "../stores/comic";
import type { ScrollbarInst } from "naive-ui";

const store = useComicStore();
const scrollbarRef = ref<ScrollbarInst | null>(null);

// 封面首图信息
const coverImageItems = reactive<
  Record<string, ImageItem & { key: string; index: number }>
>({});
const placeholderCoverItems = reactive<
  Record<string, ImageItem & { key: string; index: number }>
>({});
// 正在加载的封面集合，避免重复加载
const loadingSet = new Set<string>();

watch(
  () => store.mangas.map((manga) => manga.name),
  (names) => {
    names.forEach((name) => {
      if (!placeholderCoverItems[name]) {
        placeholderCoverItems[name] = {
          key: name,
          index: 0,
          filename: name,
          path: "",
          url: "",
        };
      }
    });
  },
  { immediate: true }
);

function getScrollContainer() {
  return (scrollbarRef.value as any)?.containerRef || null;
}

async function handleCoverVisible(manga: MangaItem) {
  const cacheKey = manga.name;
  if (coverImageItems[cacheKey] || loadingSet.has(cacheKey)) {
    return;
  }
  await loadCoverImage(manga);
}

// 直接加载封面图片
async function loadCoverImage(manga: MangaItem) {
  const cacheKey = manga.name;

  if (loadingSet.has(cacheKey)) {
    return;
  }

  loadingSet.add(cacheKey);

  try {
    // 获取第一章节的第一张图片作为封面
    if (manga.meta.chapterInfos.length === 0) {
      return;
    }

    const firstChapter = manga.meta.chapterInfos[0];
    const staticDirsArray = [...store.staticDirs].map((dir) => String(dir));
    const images = await window.comicReaderAPI.getChapterImages(
      staticDirsArray,
      String(manga.name),
      String(firstChapter.chapterTitle)
    );

    if (images.length === 0) {
      return;
    }

    const firstImage = images[0];
    let filePath = firstImage.path;

    if (!filePath && firstImage.url.startsWith("file://")) {
      filePath = decodeURIComponent(firstImage.url.replace(/^file:\/\/\//, ""));
    }

    if (!filePath) {
      return;
    }

    coverImageItems[cacheKey] = {
      key: cacheKey,
      index: 0,
      filename: firstImage.filename || manga.name,
      path: filePath,
      url: firstImage.url || "",
      mtimeMs: firstImage.mtimeMs,
    };
  } catch (error) {
    console.error(`[MangaList] loadCoverImage: ${cacheKey} 加载失败`, error);
  } finally {
    loadingSet.delete(cacheKey);
  }
}

const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuVisible = ref(false);
const contextMenuManga = ref<MangaItem | null>(null);
const contextMenuOptions = ref<
  Array<{
    label: string;
    key: "pin" | "delete" | "openFolder";
  }>
>([]);

function getExpandedName(manga: typeof store.mangas[0]) {
  if (store.currentManga?.name === manga.name && store.currentChapter) {
    return manga.name;
  }
  return null;
}

async function handleChapterClick(manga: typeof store.mangas[0], chapterTitle: string) {
  const chapters = manga.meta.chapterInfos;

  if (chapters.length === 0) {
    if (window.$message) {
      window.$message.warning("该漫画没有章节");
    }
    return;
  }

  store.setCurrentManga(manga);
  await loadChapter(manga, chapterTitle);
}

async function loadChapter(manga: typeof store.mangas[0], chapterTitle: string) {
  store.setCurrentManga(manga);
  store.setCurrentChapter(chapterTitle);
  store.setLoading("chapter", true);

  try {
    // 确保传递的是纯数组
    const staticDirsArray = [...store.staticDirs].map((dir) => String(dir));
    const images = await window.comicReaderAPI.getChapterImages(
      staticDirsArray,
      String(manga.name),
      String(chapterTitle)
    );
    store.setCurrentImages(images);
  } catch (error) {
    console.error("加载章节失败:", error);
    if (window.$message) {
      window.$message.error("加载章节失败");
    }
    if (window.naimo) {
      window.naimo.log.error("加载章节失败", error);
    }
  } finally {
    store.setLoading("chapter", false);
  }
}

function openContextMenu(event: MouseEvent, manga: MangaItem) {
  event.preventDefault();
  contextMenuManga.value = manga;
  contextMenuX.value = event.clientX;
  contextMenuY.value = event.clientY;

  contextMenuOptions.value = [
    {
      label: "顶置",
      key: "pin",
    },
    {
      label: "打开文件夹",
      key: "openFolder",
    },
    {
      label: "删除",
      key: "delete",
    },
  ];

  contextMenuVisible.value = true;
}

async function handleContextMenuSelect(key: "pin" | "delete" | "openFolder") {
  const manga = contextMenuManga.value;
  if (!manga) return;

  if (key === "pin") {
    await store.pinManga(manga.name);
  } else if (key === "openFolder") {
    try {
      const staticDirsArray = [...store.staticDirs].map((dir) => String(dir));
      await window.comicReaderAPI.openMangaFolder(staticDirsArray, manga.name);
    } catch (error) {
      console.error("打开文件夹失败", error);
      if (window.$message) {
        window.$message.error("打开文件夹失败");
      }
    }
  } else if (key === "delete") {
    await store.deleteManga(manga.name);
  }

  contextMenuVisible.value = false;
}
</script>

<style>
.menu .n-scrollbar-rail__scrollbar {
  transform: translateX(1px) !important;
  /* width: 18px !important; */
  border-radius: 0px !important;
  right: 0;
}
</style>
