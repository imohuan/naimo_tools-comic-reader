<template>
  <div class="flex-1 overflow-hidden flex flex-col">
    <!-- 搜索栏和布局切换 -->
    <div class="p-2 border-b border-gray-800/50 shrink-0">
      <div class="flex items-center gap-2 mb-2">
        <n-input
          v-model:value="store.searchKeyword"
          placeholder="搜索漫画..."
          size="small"
          clearable
          class="flex-1"
        >
          <template #prefix>
            <svg
              class="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
          </template>
        </n-input>
        <n-button-group size="small">
          <n-button
            :type="store.listLayoutMode === 'list' ? 'primary' : 'default'"
            @click="store.setListLayoutMode('list')"
          >
            <template #icon>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            </template>
          </n-button>
          <n-button
            :type="store.listLayoutMode === 'grid' ? 'primary' : 'default'"
            @click="store.setListLayoutMode('grid')"
          >
            <template #icon>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                ></path>
              </svg>
            </template>
          </n-button>
        </n-button-group>
      </div>
      <div v-if="filteredMangas.length > 0" class="text-xs text-gray-500">
        共 {{ filteredMangas.length }} 部漫画
      </div>
    </div>

    <div
      v-if="filteredMangas.length === 0 && !store.loading.library"
      class="text-center py-10 text-gray-600 text-xs flex-1 flex items-center justify-center"
    >
      {{ store.searchKeyword ? "未找到匹配的漫画" : "暂无数据" }}
    </div>

    <n-scrollbar
      v-else
      ref="scrollbarRef"
      class="menu viewer flex-1"
      @click="contextMenuVisible = false"
    >
      <!-- 列表布局 -->
      <div v-if="store.listLayoutMode === 'list'" class="p-2 pr-3">
        <template v-for="manga in filteredMangas" :key="manga.name">
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
                  :item="
                    coverImageItems[getCoverCacheKey(manga)] ||
                    placeholderCoverItems[manga.name]
                  "
                  :file-path="coverImageItems[getCoverCacheKey(manga)]?.path || ''"
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
                  :title="getDisplayName(manga)"
                >
                  {{ getDisplayName(manga) }}
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
                        coverImageItems[getCoverCacheKey(manga)] ||
                        placeholderCoverItems[manga.name]
                      "
                      :file-path="coverImageItems[getCoverCacheKey(manga)]?.path || ''"
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
                    <span
                      class="text-xs font-medium leading-tight"
                      :title="getDisplayName(manga)"
                    >
                      {{ getDisplayName(manga) }}
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

      <!-- Grid 布局 -->
      <div
        v-else
        class="p-2 pr-3 grid gap-2"
        :style="{
          gridTemplateColumns: gridTemplateColumns,
        }"
      >
        <template v-for="manga in filteredMangas" :key="manga.name">
          <div
            class="group cursor-pointer transition-all hover:scale-[1.02]"
            :style="{
              minWidth: shouldShowSingleColumn ? '0' : `${gridItemWidth}px`,
            }"
            @click="handleMangaClick($event, manga)"
            @contextmenu.prevent="openContextMenu($event, manga)"
          >
            <div
              class="rounded overflow-hidden border-2 transition-all"
              :class="{
                'border-white bg-white shadow-lg shadow-gray-500/30': isMangaSelected(
                  manga
                ),
                'border-gray-800 hover:border-gray-700': !isMangaSelected(manga),
              }"
            >
              <!-- 封面 -->
              <div class="w-full aspect-[9/16] bg-gray-800 overflow-hidden relative">
                <LazyFileImage
                  :item="
                    coverImageItems[getCoverCacheKey(manga)] ||
                    placeholderCoverItems[manga.name]
                  "
                  :file-path="coverImageItems[getCoverCacheKey(manga)]?.path || ''"
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
                  class="absolute top-2 right-2 px-1.5 py-0.5 bg-black/70 text-[10px] text-gray-200 rounded"
                >
                  {{ manga.meta.chapterInfos.length }}章
                </div>
                <div
                  v-if="manga.meta.chapterInfos.length === 1"
                  class="absolute bottom-2 left-2 px-1.5 py-0.5 bg-green-500/80 text-[10px] text-white rounded"
                >
                  单章
                </div>
              </div>
              <!-- 标题 -->
              <div class="p-2 bg-[#18181c]">
                <div
                  class="text-xs font-medium leading-tight line-clamp-2 text-gray-200"
                  :title="getDisplayName(manga)"
                >
                  {{ getDisplayName(manga) }}
                </div>
              </div>
            </div>
          </div>
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

    <!-- 章节选择悬浮框 -->
    <n-popover
      placement="bottom-start"
      trigger="manual"
      :show="chapterMenuVisible"
      :x="chapterMenuX"
      :y="chapterMenuY"
      :flip="true"
      :show-arrow="false"
      class="chapter-menu-dropdown"
      @clickoutside="chapterMenuVisible = false"
    >
      <template #trigger>
        <div
          style="
            position: fixed;
            left: 0;
            top: 0;
            width: 0;
            height: 0;
            pointer-events: none;
          "
        ></div>
      </template>
      <div
        class="min-w-[200px] max-w-[300px] max-h-[400px] overflow-y-auto overflow-x-hidden"
      >
        <div
          v-for="option in chapterMenuOptions"
          :key="option.key"
          class="min-w-[200px] max-w-[300px] px-3 py-2 cursor-pointer transition-colors border-b border-gray-700 last:border-b-0 hover:bg-gray-700"
          @click="handleChapterMenuSelect(option.key)"
        >
          <span
            class="block w-full whitespace-nowrap overflow-hidden text-ellipsis text-gray-200 text-sm leading-normal"
            :title="option.label"
            >{{ option.label }}</span
          >
        </div>
      </div>
    </n-popover>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed } from "vue";
import LazyFileImage from "./LazyFileImage.vue";
import { useComicStore } from "../stores/comic";
import type { ImageItem, MangaItem } from "../stores/comic";
import type { ScrollbarInst } from "naive-ui";

const store = useComicStore();
const scrollbarRef = ref<ScrollbarInst | null>(null);

// Grid 布局项宽度（根据侧边栏宽度动态计算）
const gridItemWidth = computed(() => {
  const width = store.sidebarWidth;
  if (width <= 250) return 80;
  if (width <= 350) return 100;
  if (width <= 450) return 120;
  return 140;
});

// 判断是否应该单列显示（小区域时）
const shouldShowSingleColumn = computed(() => {
  // 考虑 padding: p-2 (8px) + pr-3 (12px) = 20px，gap: gap-2 = 8px
  // 当侧边栏宽度很小时，只显示一列
  const availableWidth = store.sidebarWidth - 20; // 减去左右 padding (8px + 12px)
  // 严格判断：可用宽度必须小于两列的最小宽度 + gap
  const minTwoColumnWidth = gridItemWidth.value * 2 + 8; // 两列最小宽度 + gap
  // 如果侧边栏宽度小于 220px，或者可用宽度不足以容纳两列，就单列显示
  // 使用更低的阈值确保小空间时强制单列
  return store.sidebarWidth < 220 || availableWidth < minTwoColumnWidth;
});

// Grid 布局的列模板
const gridTemplateColumns = computed(() => {
  if (shouldShowSingleColumn.value) {
    // 单列模式：强制只显示一列
    return "1fr";
  }
  // 多列模式：根据可用空间自动填充
  return `repeat(auto-fill, minmax(${gridItemWidth.value}px, 1fr))`;
});

// 获取显示名称（展开模式下显示"漫画名 - 章节名"）
function getDisplayName(manga: MangaItem): string {
  if (store.expandedMode && manga.meta.chapterInfos.length === 1) {
    return `${manga.name} - ${manga.meta.chapterInfos[0].chapterTitle}`;
  }
  return manga.name;
}

// 判断 Grid 布局中的漫画是否被选中
function isMangaSelected(manga: MangaItem): boolean {
  if (store.currentManga?.name !== manga.name) {
    return false;
  }
  // 展开模式下，单章节漫画需要同时检查章节名
  if (store.expandedMode && manga.meta.chapterInfos.length === 1) {
    return store.currentChapter === manga.meta.chapterInfos[0].chapterTitle;
  }
  // 折叠模式或多章节漫画，只需要检查漫画名
  return true;
}

// 过滤后的漫画列表
const filteredMangas = computed(() => {
  let result = store.mangas;

  if (store.searchKeyword.trim()) {
    const keyword = store.searchKeyword.toLowerCase().trim();
    result = result.filter((manga) => {
      const displayName = getDisplayName(manga);
      return displayName.toLowerCase().includes(keyword);
    });
  }

  return result;
});

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

// 监听展开模式变化，清理封面缓存
watch(
  () => store.expandedMode,
  () => {
    // 切换模式时清理所有封面缓存和加载状态，避免缓存混乱
    // 直接清空对象和集合，比逐个删除更高效
    Object.keys(coverImageItems).forEach((key) => {
      delete coverImageItems[key];
    });
    loadingSet.clear();
  }
);

// 监听漫画列表变化，清理不再存在的缓存项
watch(
  () => store.mangas,
  (newMangas) => {
    // 获取当前所有有效的缓存键
    const validKeys = new Set<string>();
    newMangas.forEach((manga) => {
      validKeys.add(getCoverCacheKey(manga));
    });

    // 清理不再有效的缓存项
    Object.keys(coverImageItems).forEach((key) => {
      if (!validKeys.has(key)) {
        delete coverImageItems[key];
      }
    });

    // 清理不再有效的加载状态
    loadingSet.forEach((key) => {
      if (!validKeys.has(key)) {
        loadingSet.delete(key);
      }
    });
  },
  { deep: true }
);

function getScrollContainer() {
  return (scrollbarRef.value as any)?.containerRef || null;
}

// 获取封面的缓存键，展开模式下需要包含章节信息以区分不同章节
function getCoverCacheKey(manga: MangaItem): string {
  if (store.expandedMode && manga.meta.chapterInfos.length === 1) {
    // 展开模式下，使用漫画名+章节名作为唯一键
    return `${manga.name}::${manga.meta.chapterInfos[0].chapterTitle}`;
  }
  // 折叠模式下，使用漫画名作为键
  return manga.name;
}

async function handleCoverVisible(manga: MangaItem) {
  const cacheKey = getCoverCacheKey(manga);
  if (coverImageItems[cacheKey] || loadingSet.has(cacheKey)) {
    return;
  }
  await loadCoverImage(manga);
}

// 直接加载封面图片
async function loadCoverImage(manga: MangaItem) {
  const cacheKey = getCoverCacheKey(manga);

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

// 章节选择菜单
const chapterMenuX = ref(0);
const chapterMenuY = ref(0);
const chapterMenuVisible = ref(false);
const chapterMenuManga = ref<MangaItem | null>(null);
const chapterMenuOptions = ref<
  Array<{
    label: string;
    key: string;
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

// Grid 布局点击处理
async function handleMangaClick(event: MouseEvent, manga: MangaItem) {
  const chapters = manga.meta.chapterInfos;

  if (chapters.length === 0) {
    if (window.$message) {
      window.$message.warning("该漫画没有章节");
    }
    return;
  }

  // 展开模式下，每个章节都是独立项，直接加载，不需要弹出菜单
  if (store.expandedMode || chapters.length === 1) {
    // 单章节直接加载
    await handleChapterClick(manga, chapters[0].chapterTitle);
  } else {
    // 多章节显示章节选择菜单
    chapterMenuManga.value = manga;

    // 计算菜单位置，确保不超出屏幕
    const menuMaxWidth = 300;
    const menuMaxHeight = 400;
    const padding = 8; // 距离屏幕边缘的最小距离

    let x = event.clientX;
    let y = event.clientY;

    // 检查右边界
    if (x + menuMaxWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuMaxWidth - padding;
    }
    // 检查左边界
    if (x < padding) {
      x = padding;
    }

    // 检查下边界
    if (y + menuMaxHeight > window.innerHeight - padding) {
      // 如果下方空间不足，尝试向上显示
      const spaceAbove = y - padding;
      const spaceBelow = window.innerHeight - y - padding;
      if (spaceAbove > spaceBelow && spaceAbove >= 200) {
        // 向上显示，但需要调整 y 坐标
        y = y - Math.min(menuMaxHeight, spaceAbove);
      } else {
        // 保持在下方，但限制高度
        y = window.innerHeight - menuMaxHeight - padding;
      }
    }
    // 检查上边界
    if (y < padding) {
      y = padding;
    }

    chapterMenuX.value = x;
    chapterMenuY.value = y;

    chapterMenuOptions.value = chapters.map((chapter) => ({
      label: chapter.chapterTitle,
      key: chapter.chapterTitle,
    }));

    chapterMenuVisible.value = true;
  }
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

// 章节选择菜单处理
async function handleChapterMenuSelect(key: string) {
  const manga = chapterMenuManga.value;
  if (!manga) return;

  await handleChapterClick(manga, key);
  chapterMenuVisible.value = false;
}
</script>

<style>
.menu .n-scrollbar-rail__scrollbar {
  transform: translateX(1px) !important;
  /* width: 18px !important; */
  border-radius: 0px !important;
  right: 0;
}

/* 章节选择菜单样式 */
:global(.chapter-menu-dropdown .n-popover__content) {
  padding: 0 !important;
  background: transparent !important;
}
</style>
