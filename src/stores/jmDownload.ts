import { defineStore } from "pinia";
import { computed, reactive, ref, watch } from "vue";
import { useStorage } from "@vueuse/core";
import { useJMComicStore } from "./jmcomic";
import type { ChapterImage } from "@/utils/comic-api";

export type ChapterStatus =
  | "pending"
  | "fetching"
  | "queued"
  | "downloading"
  | "completed"
  | "error";

export interface ChapterDownloadItem {
  chapterId: string;
  chapterTitle: string;
  comicTitle: string;
  status: ChapterStatus;
  total: number;
  finished: number;
  error?: string;
  createdAt: number;
  comicDirName: string;
  chapterDirName: string;
}

interface ImageDownloadTask {
  id: string;
  chapterId: string;
  chapterTitle: string;
  comicTitle: string;
  url: string;
  filename: string;
  index: number;
  total: number;
  blockNum: number;
  originalFilename: string;
}

const sanitizeSegment = (name: string): string => {
  return (name || "unnamed").replace(/[\\/:*?"<>|]/g, "_").trim() || "unnamed";
};

const buildFilename = (image: ChapterImage, fallbackIndex: number): string => {
  const extMatch = image.filename?.match(/\.([^.]+)$/);
  const ext = extMatch ? extMatch[1] : "png";
  const seq = String(image.index ?? fallbackIndex).padStart(3, "0");
  return `${seq}.${ext}`;
};

export const useJMDownloadStore = defineStore("jmDownload", () => {
  const comicStore = useJMComicStore();

  const chapterDownloads = reactive<Record<string, ChapterDownloadItem>>({});
  const fetchQueue = ref<string[]>([]);
  const imageQueue = ref<ImageDownloadTask[]>([]);
  const cancelledChapters = new Set<string>();

  const activeFetchCount = ref(0);
  const activeDownloadCount = ref(0);
  const downloadRoot = ref<string>("");
  const pendingLocalChecks = new Map<
    string,
    Promise<ChapterDownloadItem | null>
  >();

  const fetchConcurrencyStorage = useStorage("jm-fetch-concurrency", 2);
  const fetchConcurrency = computed({
    get: () => Math.max(1, Number(fetchConcurrencyStorage.value) || 2),
    set: (value: number) => {
      fetchConcurrencyStorage.value = Math.max(1, value || 1);
    },
  });

  const downloadConcurrencyStorage = useStorage("jm-download-concurrency", 10);
  const downloadConcurrency = computed({
    get: () => Math.max(1, Number(downloadConcurrencyStorage.value) || 10),
    set: (value: number) => {
      downloadConcurrencyStorage.value = Math.max(1, value || 1);
    },
  });

  const hasActiveTasks = computed(() => {
    return (
      fetchQueue.value.length > 0 ||
      imageQueue.value.length > 0 ||
      activeFetchCount.value > 0 ||
      activeDownloadCount.value > 0
    );
  });

  const comicGroups = computed(() => {
    const groups: Record<
      string,
      {
        key: string;
        comicTitle: string;
        chapters: ChapterDownloadItem[];
        finishedChapters: number;
        totalChapters: number;
      }
    > = {};

    Object.values(chapterDownloads)
      .sort((a, b) => a.createdAt - b.createdAt)
      .forEach((item) => {
        const key = item.comicTitle || "未知作品";
        if (!groups[key]) {
          groups[key] = {
            key,
            comicTitle: key,
            chapters: [],
            finishedChapters: 0,
            totalChapters: 0,
          };
        }
        const group = groups[key];
        group.chapters.push(item);
        group.totalChapters += 1;
        if (item.status === "completed") {
          group.finishedChapters += 1;
        }
      });

    return Object.values(groups);
  });

  const totalChapters = computed(() =>
    comicGroups.value.reduce((sum, group) => sum + group.totalChapters, 0)
  );

  const finishedChapters = computed(() =>
    comicGroups.value.reduce((sum, group) => sum + group.finishedChapters, 0)
  );

  const downloadInProgress = computed(() => hasActiveTasks.value);

  const resolveDownloadDirectory = async (): Promise<string> => {
    const manualDir = (comicStore.settings as any).downloadDir;
    if (manualDir) {
      downloadRoot.value = manualDir;
      return manualDir;
    }

    if (downloadRoot.value) {
      return downloadRoot.value;
    }

    const naimo = (globalThis as any).naimo;
    if (naimo?.system?.getPath) {
      try {
        const dir = await naimo.system.getPath("downloads");
        if (dir) {
          downloadRoot.value = dir;
          return dir;
        }
      } catch (error) {
        console.warn("获取系统下载目录失败:", error);
      }
    }

    throw new Error("请先在设置中配置下载目录");
  };

  const fetchChapterImages = async (
    chapterId: string
  ): Promise<ChapterImage[]> => {
    let cached = comicStore.cacheUtils.get<{
      images?: ChapterImage[];
    }>(chapterId, "chapters");

    if (!cached || !cached.images) {
      if (!comicStore.api) {
        throw new Error("API 未初始化");
      }
      cached = await comicStore.api.getChapterImages(chapterId);
      if (cached && cached.images) {
        comicStore.cacheUtils.set(chapterId, cached, "chapters");
      }
    }

    if (!cached || !Array.isArray(cached.images)) {
      throw new Error("章节没有可下载的图片");
    }

    return cached.images;
  };

  const enqueueImageTasks = (
    chapter: ChapterDownloadItem,
    images: ChapterImage[]
  ) => {
    images.forEach((image, idx) => {
      imageQueue.value.push({
        id: `${chapter.chapterId}-${image.index ?? idx}`,
        chapterId: chapter.chapterId,
        chapterTitle: chapter.chapterTitle,
        comicTitle: chapter.comicTitle,
        url: image.url,
        filename: sanitizeSegment(buildFilename(image, idx)),
        index: image.index ?? idx,
        total: images.length,
        blockNum: image.blockNum ?? 0,
        originalFilename: image.filename || `${idx}.png`,
      });
    });
  };

  const processFetchQueue = () => {
    if (!fetchQueue.value.length) return;
    while (
      activeFetchCount.value < fetchConcurrency.value &&
      fetchQueue.value.length > 0
    ) {
      const chapterId = fetchQueue.value.shift();
      if (!chapterId) continue;
      const chapter = chapterDownloads[chapterId];
      if (!chapter || cancelledChapters.has(chapterId)) continue;
      chapter.status = "fetching";
      activeFetchCount.value += 1;

      fetchChapterImages(chapterId)
        .then((images) => {
          if (cancelledChapters.has(chapterId)) {
            cancelledChapters.delete(chapterId);
            return;
          }
          chapter.total = images.length;
          chapter.finished = 0;
          if (images.length === 0) {
            chapter.status = "error";
            chapter.error = "章节没有图片";
            return;
          }
          enqueueImageTasks(chapter, images);
          chapter.status = "queued";
          processDownloadQueue();
        })
        .catch((error: any) => {
          chapter.status = "error";
          chapter.error = error?.message || "获取章节图片失败";
        })
        .finally(() => {
          activeFetchCount.value -= 1;
          processFetchQueue();
        });
    }
  };

  const downloadImage = async (task: ImageDownloadTask) => {
    const chapter = chapterDownloads[task.chapterId];
    if (!chapter) return;
    if (cancelledChapters.has(task.chapterId)) {
      return;
    }

    if (chapter.status === "queued" || chapter.status === "fetching") {
      chapter.status = "downloading";
    }

    const getDecodedArrayBuffer = async (): Promise<ArrayBuffer> => {
      // 需要拼接/解码
      if (task.blockNum > 0 && comicStore.api) {
        const tempImage: ChapterImage = {
          url: task.url,
          filename: task.originalFilename,
          filenameWithoutExt: task.originalFilename.replace(/\.[^/.]+$/, ""),
          blockNum: task.blockNum,
          index: task.index,
          processedUrl: undefined,
          isProcessing: false,
        };

        const processedUrl = await comicStore.api.processImage(tempImage);
        const finalUrl = processedUrl || task.url;
        const response = await fetch(finalUrl);
        if (!response.ok) {
          throw new Error(
            `下载失败：${response.statusText || response.status}`
          );
        }
        const buffer = await response.arrayBuffer();
        if (processedUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(processedUrl);
        }
        return buffer;
      }

      // 直接原图
      const response = await fetch(task.url);
      if (!response.ok) {
        throw new Error(`下载失败：${response.statusText || response.status}`);
      }
      return response.arrayBuffer();
    };

    const data = await getDecodedArrayBuffer();
    const baseDir = await resolveDownloadDirectory();

    await window.comicReaderAPI.saveDownloadImage({
      baseDir,
      comicTitle: chapter.comicTitle || "comic",
      chapterTitle: chapter.chapterTitle || "chapter",
      filename: task.filename,
      data,
    });

    chapter.finished += 1;
    if (chapter.finished >= chapter.total) {
      chapter.status = "completed";
    }
  };

  const processDownloadQueue = () => {
    if (!imageQueue.value.length) return;
    while (
      activeDownloadCount.value < downloadConcurrency.value &&
      imageQueue.value.length > 0
    ) {
      const task = imageQueue.value.shift();
      if (!task) continue;
      if (cancelledChapters.has(task.chapterId)) {
        continue;
      }

      activeDownloadCount.value += 1;
      downloadImage(task)
        .catch((error: any) => {
          const chapter = chapterDownloads[task.chapterId];
          if (chapter) {
            chapter.status = "error";
            chapter.error = error?.message || "图片下载失败";
          }
        })
        .finally(() => {
          activeDownloadCount.value -= 1;
          processDownloadQueue();
        });
    }
  };

  const startDownload = async (chapterIds: string[]) => {
    if (!chapterIds.length) return false;

    let added = false;
    const comicTitle = comicStore.currentComic?.title || "未知作品";

    chapterIds.forEach((id) => {
      if (chapterDownloads[id]) return;
      const chapterInfo =
        comicStore.chapterList?.find((chapter: any) => chapter.id === id) ||
        null;
      const chapterTitle = chapterInfo?.title || `章节 ${id}`;
      chapterDownloads[id] = {
        chapterId: id,
        chapterTitle,
        comicTitle,
        status: "pending",
        total: 0,
        finished: 0,
        createdAt: Date.now(),
        comicDirName: sanitizeSegment(comicTitle),
        chapterDirName: sanitizeSegment(chapterTitle),
      };
      fetchQueue.value.push(id);
      added = true;
    });

    if (added) {
      processFetchQueue();
    }

    return added;
  };

  const deleteDownload = (chapterId: string) => {
    cancelledChapters.add(chapterId);
    fetchQueue.value = fetchQueue.value.filter((id) => id !== chapterId);
    imageQueue.value = imageQueue.value.filter(
      (task) => task.chapterId !== chapterId
    );
    delete chapterDownloads[chapterId];
  };

  watch(
    () => fetchConcurrency.value,
    () => {
      processFetchQueue();
    }
  );

  watch(
    () => downloadConcurrency.value,
    () => {
      processDownloadQueue();
    }
  );

  const ensureLocalDownloadRecord = async (
    chapterId: string,
    chapterTitle: string,
    comicTitle: string
  ): Promise<ChapterDownloadItem | null> => {
    if (!chapterId || !chapterTitle || !comicTitle) return null;
    if (chapterDownloads[chapterId]) {
      return chapterDownloads[chapterId];
    }

    const pending = pendingLocalChecks.get(chapterId);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const baseDir = await resolveDownloadDirectory();
        if (!window.comicReaderAPI?.getChapterImages) {
          return null;
        }
        const comicDirName = sanitizeSegment(comicTitle);
        const chapterDirName = sanitizeSegment(chapterTitle);
        const images = await window.comicReaderAPI.getChapterImages(
          [baseDir],
          comicDirName,
          chapterDirName
        );
        if (images && images.length > 0) {
          chapterDownloads[chapterId] = {
            chapterId,
            chapterTitle,
            comicTitle,
            status: "completed",
            total: images.length,
            finished: images.length,
            createdAt: Date.now(),
            comicDirName,
            chapterDirName,
          };
          return chapterDownloads[chapterId];
        }
      } catch (error) {
        console.warn("检测本地章节失败:", error);
      } finally {
        pendingLocalChecks.delete(chapterId);
      }
      return null;
    })();

    pendingLocalChecks.set(chapterId, promise);
    return promise;
  };

  const getChapterDownload = (chapterId: string) => chapterDownloads[chapterId];

  const getDownloadedChapterImages = async (chapterId: string) => {
    const chapter = chapterDownloads[chapterId];
    if (!chapter || chapter.status !== "completed") {
      return null;
    }

    const baseDir = await resolveDownloadDirectory();
    if (!window.comicReaderAPI?.getChapterImages) {
      return null;
    }

    try {
      const images = await window.comicReaderAPI.getChapterImages(
        [baseDir],
        chapter.comicDirName,
        chapter.chapterDirName
      );
      return images;
    } catch (error) {
      console.error("读取已下载章节失败:", error);
      return null;
    }
  };

  return {
    downloadInProgress,
    fetchConcurrency,
    downloadConcurrency,
    comicGroups,
    totalChapters,
    finishedChapters,
    startDownload,
    deleteDownload,
    chapterDownloads,
    getChapterDownload,
    getDownloadedChapterImages,
    ensureLocalDownloadRecord,
  };
});
