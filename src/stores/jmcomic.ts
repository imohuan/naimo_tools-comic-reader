import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useStorage } from "@vueuse/core";
import {
  ComicAPI,
  type ComicAPISettings,
  type ComicItem,
  type ChapterItem,
  type ChapterImage,
  SearchSort,
} from "../utils/comic-api";

export interface ComicDetail extends ComicItem {
  description?: string;
  tags?: string[];
  likes?: string | number;
  total_views?: string | number;
  series?: Array<{
    id: string;
    name?: string;
    sort?: string;
  }>;
  photos?: Array<{
    id: string;
    title?: string;
    name?: string;
    order?: number;
  }>;
  chapters?: Array<{
    id: string;
    title?: string;
    name?: string;
    order?: number;
  }>;
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export type CacheType = "details" | "chapters" | "searches";

const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24小时

export const useJMComicStore = defineStore("jmcomic", () => {
  // API 实例
  const api = ref<ComicAPI | null>(null);

  // 设置
  const settings = useStorage<ComicAPISettings>("jm-settings", {
    proxyUrl: "",
    apiDomain: "www.cdnblackmyth.club",
    imageDomain: "cdn-msp2.jmapiproxy2.cc",
    appTokenSecret: "18comicAPP",
    appTokenSecret2: "18comicAPPContent",
    appDataSecret: "185Hcomic3PAPP7R",
    appVersion: "1.7.5",
    downloadDir: "",
  });

  // 初始化 API
  if (!api.value) {
    api.value = new ComicAPI(settings.value);
  }

  // 监听设置变化
  const updateSettings = (newSettings: Partial<ComicAPISettings>) => {
    Object.assign(settings.value, newSettings);
    if (api.value) {
      api.value.updateSettings(settings.value);
    }
  };

  // 搜索结果
  const searchState = useStorage("jm-search-state", {
    searchQuery: "",
    searchSort: SearchSort.Latest,
    comicList: [] as ComicItem[],
    currentPage: 1,
    totalItems: 0,
    totalPages: 1,
    hasMorePages: true,
    autoLoadNextPage: false,
  });
  const pageSize = ref(80);
  watch(pageSize, (size) => {
    const normalized = size > 0 ? size : 1;
    if (size <= 0) {
      pageSize.value = 1;
      return;
    }
    const total = searchState.value.totalItems;
    if (total > 0) {
      searchState.value.totalPages = Math.ceil(total / normalized);
    } else {
      searchState.value.totalPages = 1;
    }
  });
  const loading = ref(false);
  const isManualLoading = ref(false); // 是否是手动加载（切换页面）

  // 当前选中的漫画和章节
  const readingState = useStorage("jm-reading-state", {
    currentComicId: null as string | null,
    currentComic: null as ComicDetail | null,
    chapterList: [] as ChapterItem[],
    currentChapterId: null as string | null,
    currentImageIndex: 0,
    rightTab: "detail" as "detail" | "images",
  });
  const currentComic = ref<ComicDetail | null>(null);
  const currentChapter = ref<ChapterItem | null>(null);
  const readingImages = ref<
    Array<{ url: string; index: number; path?: string }>
  >([]);
  const currentChapterImages = ref<ChapterImage[]>([]);
  const detailLoading = ref(false);

  // 图片缩放
  const imageScale = ref(100);

  // 分割面板大小
  const splitSize = ref(0.5);

  // 自动滚动
  const autoScroll = ref(false);
  const autoScrollSpeed = useStorage("jm-auto-scroll-speed", 3);

  // 快捷键配置
  const defaultHotkeys = {
    scrollDown: "ArrowDown",
    scrollUp: "ArrowUp",
    autoScroll: "Space",
    speedUp: "BracketRight",
    speedDown: "BracketLeft",
    nextChapter: "KeyN",
    prevChapter: "KeyP",
  };
  const hotkeys = useStorage("jm-hotkeys", defaultHotkeys);

  // 设置面板显示
  const showSettings = ref(false);

  // 缓存
  const cacheStore = useStorage<{
    details: Record<string, CacheItem<ComicDetail>>;
    chapters: Record<string, CacheItem<any>>;
    searches: Record<string, CacheItem<ComicItem[]>>;
  }>("jm-cache-store", {
    details: {},
    chapters: {},
    searches: {},
  });

  // 缓存工具函数
  const cacheUtils = {
    get<T>(key: string, type: CacheType): T | null {
      const cache = cacheStore.value[type];
      if (!cache || !cache[key]) return null;

      const cached = cache[key];
      const now = Date.now();

      if (now - cached.timestamp > CACHE_EXPIRY_TIME) {
        delete cache[key];
        cacheStore.value[type] = { ...cache } as any;
        return null;
      }

      return cached.data as T;
    },

    set<T>(key: string, data: T, type: CacheType) {
      const cache = cacheStore.value[type];
      cacheStore.value[type] = {
        ...cache,
        [key]: {
          data: data as any,
          timestamp: Date.now(),
        },
      } as any;
    },

    clear(type?: CacheType) {
      if (type) {
        cacheStore.value[type] = {};
      } else {
        cacheStore.value = { details: {}, chapters: {}, searches: {} };
      }
    },

    clearExpired() {
      const now = Date.now();
      (["details", "chapters", "searches"] as CacheType[]).forEach((type) => {
        const cache = cacheStore.value[type];
        const keys = Object.keys(cache);
        let hasChanges = false;

        keys.forEach((key) => {
          if (now - cache[key].timestamp > CACHE_EXPIRY_TIME) {
            delete cache[key];
            hasChanges = true;
          }
        });

        if (hasChanges) {
          cacheStore.value[type] = {
            ...cache,
          } as any;
        }
      });
    },

    getCount(type: CacheType): number {
      const cache = cacheStore.value[type];
      if (!cache) return 0;
      return Object.keys(cache).length;
    },
  };

  // Actions
  function setSearchQuery(query: string) {
    searchState.value.searchQuery = query;
  }

  function setSearchSort(sort: SearchSort) {
    searchState.value.searchSort = sort;
  }

  function setComicList(comics: ComicItem[]) {
    searchState.value.comicList = comics;
  }

  function appendComicList(comics: ComicItem[]) {
    searchState.value.comicList = [...searchState.value.comicList, ...comics];
  }

  function setCurrentPage(page: number) {
    searchState.value.currentPage = page;
  }

  function setTotalItems(total: number) {
    searchState.value.totalItems = total;
    searchState.value.totalPages = Math.ceil(total / pageSize.value);
  }

  function setPageSize(size: number) {
    const normalized = Math.max(1, size);
    if (pageSize.value === normalized) {
      return;
    }
    pageSize.value = normalized;
  }

  function setHasMorePages(hasMore: boolean) {
    searchState.value.hasMorePages = hasMore;
  }

  function toggleAutoLoadNextPage() {
    searchState.value.autoLoadNextPage = !searchState.value.autoLoadNextPage;
  }

  function setLoading(value: boolean) {
    loading.value = value;
  }

  function setIsManualLoading(value: boolean) {
    isManualLoading.value = value;
  }

  function setCurrentComic(comic: ComicDetail | null) {
    currentComic.value = comic;
    readingState.value.currentComicId = comic?.id || null;
    readingState.value.currentComic = comic;
  }

  function setChapterList(chapters: ChapterItem[]) {
    readingState.value.chapterList = chapters;
  }

  function setCurrentChapter(chapter: ChapterItem | null) {
    currentChapter.value = chapter;
    readingState.value.currentChapterId = chapter?.id || null;
  }

  function setReadingImages(
    images: Array<{ url: string; index: number; path?: string }>
  ) {
    readingImages.value = images;
  }

  function setCurrentChapterImages(images: ChapterImage[]) {
    currentChapterImages.value = images;
  }

  function setCurrentImageIndex(index: number) {
    readingState.value.currentImageIndex = index;
  }

  function setImageScale(scale: number) {
    imageScale.value = Math.max(20, Math.min(100, scale));
  }

  function setDetailLoading(value: boolean) {
    detailLoading.value = value;
  }

  function toggleSettings() {
    showSettings.value = !showSettings.value;
  }

  // 设置 rightTab
  function setRightTab(tab: "detail" | "images") {
    readingState.value.rightTab = tab;
  }

  // 恢复阅读状态
  async function restoreReadingState() {
    const state = readingState.value;

    // 如果有保存的漫画ID，尝试恢复
    if (state.currentComicId) {
      // 优先从 readingState 中恢复漫画详情
      if (state.currentComic) {
        currentComic.value = state.currentComic;
        detailLoading.value = false;
      } else {
        // 如果 readingState 中没有，从缓存中获取漫画详情
        const cachedDetail = cacheUtils.get<ComicDetail>(
          state.currentComicId,
          "details"
        );

        if (cachedDetail) {
          // 恢复漫画详情
          currentComic.value = cachedDetail;
          // 同时保存到 readingState 中
          readingState.value.currentComic = cachedDetail;
          detailLoading.value = false;
        } else {
          // 如果没有缓存，确保 detailLoading 为 false
          detailLoading.value = false;
        }
      }

      // 恢复章节列表
      if (state.chapterList && state.chapterList.length > 0) {
        // 章节列表已经在 readingState 中保存了，computed 会自动返回

        // 如果有保存的章节ID，恢复章节
        if (state.currentChapterId) {
          const chapter = state.chapterList.find(
            (ch) => ch.id === state.currentChapterId
          );

          if (chapter) {
            currentChapter.value = chapter;

            // 从缓存中恢复章节图片
            const cachedChapter = cacheUtils.get<any>(
              state.currentChapterId,
              "chapters"
            );

            if (cachedChapter && cachedChapter.images) {
              currentChapterImages.value = cachedChapter.images;
              readingImages.value = cachedChapter.images.map(
                (img: any, idx: number) => ({
                  url: img.url,
                  index: idx,
                })
              );

              // 恢复图片索引
              if (
                state.currentImageIndex >= 0 &&
                state.currentImageIndex < readingImages.value.length
              ) {
                // currentImageIndex 已经通过 computed 自动恢复了
              }
            } else {
              // 如果没有缓存，清空图片列表
              currentChapterImages.value = [];
              readingImages.value = [];
            }
          }
        }
      } else {
        // 如果没有章节列表，确保 detailLoading 为 false
        detailLoading.value = false;
      }
    }

    // 返回保存的 rightTab
    return state.rightTab || "detail";
  }

  return {
    // API
    api: computed(() => api.value),
    settings,
    updateSettings,

    // 搜索
    searchQuery: computed(() => searchState.value.searchQuery),
    searchSort: computed(() => searchState.value.searchSort),
    comicList: computed(() => searchState.value.comicList),
    currentPage: computed(() => searchState.value.currentPage),
    pageSize,
    totalItems: computed(() => searchState.value.totalItems),
    totalPages: computed(() => searchState.value.totalPages),
    hasMorePages: computed(() => searchState.value.hasMorePages),
    loading,
    isManualLoading,
    autoLoadNextPage: computed(() => searchState.value.autoLoadNextPage),

    // 当前内容
    currentComic,
    chapterList: computed(() => readingState.value.chapterList),
    currentChapter,
    readingImages,
    currentChapterImages,
    currentImageIndex: computed(() => readingState.value.currentImageIndex),
    detailLoading,

    // 图片缩放
    imageScale,

    // 自动滚动
    autoScroll,
    autoScrollSpeed,

    // 快捷键
    hotkeys,

    // 设置面板
    showSettings,

    // 缓存
    cacheUtils,

    // Actions
    setSearchQuery,
    setSearchSort,
    setComicList,
    appendComicList,
    setCurrentPage,
    setTotalItems,
    setHasMorePages,
    toggleAutoLoadNextPage,
    setLoading,
    setIsManualLoading,
    setPageSize,
    setCurrentComic,
    setChapterList,
    setCurrentChapter,
    setReadingImages,
    setCurrentChapterImages,
    setCurrentImageIndex,
    setImageScale,
    setDetailLoading,
    toggleSettings,
    setRightTab,
    restoreReadingState,
    splitSize,
  };
});
