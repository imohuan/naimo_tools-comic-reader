import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useStorage } from "@vueuse/core";
import { useNaimoStorage } from "@/hooks/useNaimoStorage";

export interface MangaItem {
  name: string;
  meta: {
    id: string;
    name: string;
    chapterInfos: Array<{
      chapterId: string;
      chapterTitle: string;
      order: number;
    }>;
    generated?: boolean;
  };
  info: {
    st_mtime: number;
  };
}

export interface ImageItem {
  filename: string;
  url: string;
  path: string;
  mtimeMs?: number;
}

export const useComicStore = defineStore("comic", () => {
  // 状态
  // 测试用默认路径
  const defaultDirs: string[] = [
    // "C:\\Users\\IMOHUAN\\AppData\\Roaming\\com.lanyeeee.jmcomic-downloader\\漫画下载",
  ];
  const staticDirs = useNaimoStorage<string[]>(
    "comic-reader-static-dirs",
    defaultDirs
  );
  const mangas = ref<MangaItem[]>([]);
  const currentManga = ref<MangaItem | null>(null);
  const currentChapter = ref<string>("");
  const currentImages = ref<ImageItem[]>([]);
  const currentPage = ref(0);
  const zoom = useStorage("comic-reader-zoom", 85);
  const sidebarCollapsed = ref(false);
  const loading = ref({ library: false, chapter: false });
  const autoScroll = ref(false);
  const autoScrollSpeed = useStorage("comic-reader-auto-scroll-speed", 3);
  const autoScrollTimer = ref<number | null>(null);
  const rotation = ref(0);

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
  const hotkeys = useStorage("comic-reader-hotkeys", defaultHotkeys);

  // 设置面板显示
  const showSettings = ref(false);

  // 计算属性
  const hasCurrentManga = computed(() => currentManga.value !== null);
  const hasCurrentChapter = computed(() => currentChapter.value !== "");
  const totalPages = computed(() => currentImages.value.length);
  const currentPageInfo = computed(
    () => `${currentPage.value} / ${totalPages.value}`
  );

  // Actions
  function addStaticDir(dir: string) {
    if (!staticDirs.value.includes(dir)) {
      staticDirs.value.push(dir);
    }
  }

  function removeStaticDir(dir: string) {
    const index = staticDirs.value.indexOf(dir);
    if (index > -1) {
      staticDirs.value.splice(index, 1);
    }
  }

  function setMangas(newMangas: MangaItem[]) {
    mangas.value = newMangas;
  }

  function setCurrentManga(manga: MangaItem | null) {
    currentManga.value = manga;
  }

  function setCurrentChapter(chapter: string) {
    currentChapter.value = chapter;
  }

  function setCurrentImages(images: ImageItem[]) {
    currentImages.value = images;
    currentPage.value = 0;
  }

  function setCurrentPage(page: number) {
    currentPage.value = page;
  }

  function setZoom(value: number) {
    zoom.value = value;
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  function setLoading(key: "library" | "chapter", value: boolean) {
    loading.value[key] = value;
  }

  function toggleAutoScroll() {
    autoScroll.value = !autoScroll.value;
  }

  function setAutoScrollSpeed(speed: number) {
    autoScrollSpeed.value = Math.max(1, Math.min(10, speed));
  }

  function setRotation(angle: number) {
    rotation.value = angle % 360;
  }

  function toggleSettings() {
    showSettings.value = !showSettings.value;
  }

  async function pinManga(name: string) {
    const dirs = [...staticDirs.value].map((d) => String(d));
    try {
      await window.comicReaderAPI.updateFolderTimestamp(dirs, name);
      if (window.$message) {
        window.$message.success(`已顶置：${name}`);
      }
      if (window.$loadMangaList) {
        await window.$loadMangaList();
      }
    } catch (error) {
      console.error("顶置漫画失败:", error);
      if (window.$message) {
        window.$message.error("顶置失败");
      }
    }
  }

  async function deleteManga(name: string) {
    const dirs = [...staticDirs.value].map((d) => String(d));
    try {
      await window.comicReaderAPI.deleteMangaFolder(dirs, name);
      if (window.$message) {
        window.$message.success(`已删除漫画：${name}`);
      }
      if (currentManga.value?.name === name) {
        currentManga.value = null;
        currentChapter.value = "";
        currentImages.value = [];
        currentPage.value = 0;
      }
      if (window.$loadMangaList) {
        await window.$loadMangaList();
      }
    } catch (error) {
      console.error("删除漫画失败:", error);
      if (window.$message) {
        window.$message.error("删除失败");
      }
    }
  }

  return {
    // State
    staticDirs,
    mangas,
    currentManga,
    currentChapter,
    currentImages,
    currentPage,
    zoom,
    sidebarCollapsed,
    loading,
    autoScroll,
    autoScrollSpeed,
    autoScrollTimer,
    rotation,
    hotkeys,
    showSettings,
    // Computed
    hasCurrentManga,
    hasCurrentChapter,
    totalPages,
    currentPageInfo,
    // Actions
    addStaticDir,
    removeStaticDir,
    setMangas,
    setCurrentManga,
    setCurrentChapter,
    setCurrentImages,
    setCurrentPage,
    setZoom,
    toggleSidebar,
    setLoading,
    toggleAutoScroll,
    setAutoScrollSpeed,
    setRotation,
    toggleSettings,
    pinManga,
    deleteManga,
  };
});
