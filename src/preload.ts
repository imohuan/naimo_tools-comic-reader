/// <reference path="../typings/naimo.d.ts" />

import { Buffer } from "buffer";
import { contextBridge } from "electron";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as path from "path";
import { BOOKMARKS_DIR_NAME } from "./utils/favorite-utils";

// ==================== 类型定义 ====================

interface MangaMeta {
  id: string;
  name: string;
  chapterInfos: ChapterInfo[];
  generated?: boolean;
}

interface ChapterInfo {
  chapterId: string;
  chapterTitle: string;
  order: number;
}

interface MangaItem {
  name: string;
  meta: MangaMeta;
  info: {
    st_mtime: number;
  };
}

interface ImageItem {
  filename: string;
  url: string;
  path: string;
  mtimeMs?: number;
}

// ==================== 工具函数 ====================

/**
 * 自然排序键函数
 */
function naturalSortKey(text: string): (string | number)[] {
  const parts = text.match(/(\d+|\D+)/g) || [];
  return parts.map((part) => {
    const num = parseInt(part, 10);
    return isNaN(num) ? part.toLowerCase() : num;
  });
}

function compareNaturalText(a: string, b: string): number {
  const keyA = naturalSortKey(a);
  const keyB = naturalSortKey(b);
  for (let i = 0; i < Math.max(keyA.length, keyB.length); i++) {
    const valA = keyA[i] ?? "";
    const valB = keyB[i] ?? "";
    if (valA < valB) return -1;
    if (valA > valB) return 1;
  }
  return 0;
}

/**
 * 检查文件是否为图片
 */
function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(ext);
}

/**
 * 从目录结构生成元数据
 */
function generateMetaFromStructure(
  folderPath: string,
  mangaName: string
): MangaMeta {
  const items = fs.readdirSync(folderPath);
  const chapters: ChapterInfo[] = [];

  let hasImages = false;
  let hasDirs = false;
  const subDirs: string[] = [];

  // 排序
  const sortedItems = items.sort(compareNaturalText);

  for (const item of sortedItems) {
    const itemPath = path.join(folderPath, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      if (fs.readdirSync(itemPath).length > 0) {
        hasDirs = true;
        subDirs.push(item);
      }
    } else if (stats.isFile() && isImageFile(item)) {
      hasImages = true;
    }
  }

  if (hasDirs) {
    // 多章节模式
    subDirs.forEach((chapterName, index) => {
      chapters.push({
        chapterId: `gen-${index + 1}`,
        chapterTitle: chapterName,
        order: index + 1,
      });
    });
  } else if (hasImages) {
    // 单章节模式
    chapters.push({
      chapterId: "gen-1",
      chapterTitle: mangaName,
      order: 1,
    });
  }

  return {
    id: `gen-${mangaName}`,
    name: mangaName,
    chapterInfos: chapters,
    generated: true,
  };
}

/**
 * 读取元数据文件
 */
async function readMetaFile(metaPath: string): Promise<MangaMeta | null> {
  try {
    const content = await fsPromises.readFile(metaPath, "utf-8");
    return JSON.parse(content) as MangaMeta;
  } catch {
    return null;
  }
}

/**
 * 统计目录中的图片数量
 */
function countImagesInDirectory(dirPath: string): number {
  try {
    const items = fs.readdirSync(dirPath);
    return items.filter((item) => {
      const itemPath = path.join(dirPath, item);
      return fs.statSync(itemPath).isFile() && isImageFile(item);
    }).length;
  } catch {
    return 0;
  }
}

// ==================== API 函数 ====================

/**
 * 获取漫画列表
 */
async function getMangaList(staticDirs: string[]): Promise<MangaItem[]> {
  const folders: MangaItem[] = [];
  const processedMangas = new Set<string>();

  for (const staticDir of staticDirs) {
    try {
      const items = await fsPromises.readdir(staticDir);

      for (const name of items) {
        if (processedMangas.has(name)) continue;

        const folderPath = path.join(staticDir, name);
        const stats = await fsPromises.stat(folderPath);

        if (!stats.isDirectory()) continue;

        const metaPath = path.join(folderPath, "元数据.json");
        let meta: MangaMeta;

        const existingMeta = await readMetaFile(metaPath);
        if (existingMeta) {
          meta = existingMeta;
        } else {
          meta = generateMetaFromStructure(folderPath, name);
        }

        // 确保所有数据都是可序列化的，手动构建纯对象
        const mtimeMs = Number(stats.mtimeMs);
        const st_mtime = Number(mtimeMs / 1000);

        folders.push({
          name: String(name),
          meta: {
            id: String(meta.id),
            name: String(meta.name),
            chapterInfos: meta.chapterInfos.map((ch) => ({
              chapterId: String(ch.chapterId),
              chapterTitle: String(ch.chapterTitle),
              order: Number(ch.order),
            })),
            ...(meta.generated !== undefined && {
              generated: Boolean(meta.generated),
            }),
          },
          info: {
            st_mtime: st_mtime,
          },
        });

        processedMangas.add(name);
      }
    } catch (error) {
      console.error(`读取目录失败: ${staticDir}`, error);
    }
  }

  // 按创建时间排序
  folders.sort((a, b) => b.info.st_mtime - a.info.st_mtime);
  // 将"收藏夹"排到最前
  folders.sort((a, b) => {
    if (a.name === "收藏夹") return -1;
    if (b.name === "收藏夹") return 1;
    return 0;
  });

  return folders;
}

/**
 * 获取章节图片列表
 */
async function getChapterImages(
  staticDirs: string[],
  mangaName: string,
  chapterInfo: string
): Promise<ImageItem[]> {
  // 查找漫画目录
  let mangaPath: string | null = null;
  for (const staticDir of staticDirs) {
    const testPath = path.join(staticDir, mangaName);
    try {
      const stats = await fsPromises.stat(testPath);
      if (stats.isDirectory()) {
        mangaPath = testPath;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!mangaPath) {
    throw new Error(`漫画目录不存在: ${mangaName}`);
  }

  // 确定章节路径
  let chapterPath: string;
  if (mangaName === chapterInfo) {
    // 单章节模式
    chapterPath = mangaPath;
  } else {
    chapterPath = path.join(mangaPath, chapterInfo);
  }

  const stats = await fsPromises.stat(chapterPath);
  if (!stats.isDirectory()) {
    throw new Error(`章节目录不存在: ${mangaName}/${chapterInfo}`);
  }

  // 读取图片文件
  const items = await fsPromises.readdir(chapterPath);
  const imageEntries = items.reduce<
    Array<{ filename: string; mtimeMs: number }>
  >((acc, item) => {
    const itemPath = path.join(chapterPath, item);
    try {
      const stats = fs.statSync(itemPath);
      if (stats.isFile() && isImageFile(item)) {
        acc.push({ filename: item, mtimeMs: Number(stats.mtimeMs) });
      }
    } catch {
      // 忽略不可读文件
    }
    return acc;
  }, []);

  const shouldSortByTime = mangaName === BOOKMARKS_DIR_NAME;
  if (shouldSortByTime) {
    imageEntries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  } else {
    imageEntries.sort((a, b) => compareNaturalText(a.filename, b.filename));
  }

  return imageEntries.map(({ filename, mtimeMs }) => ({
    filename: String(filename),
    url: String(`file://${path.join(chapterPath, filename)}`),
    path: String(path.join(chapterPath, filename)),
    mtimeMs,
  }));
}

/**
 * 获取漫画的章节列表
 */
async function getMangaChapters(
  staticDirs: string[],
  mangaName: string
): Promise<Array<{ name: string; image_count: number }>> {
  let mangaPath: string | null = null;
  for (const staticDir of staticDirs) {
    const testPath = path.join(staticDir, mangaName);
    try {
      const stats = await fsPromises.stat(testPath);
      if (stats.isDirectory()) {
        mangaPath = testPath;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!mangaPath) {
    throw new Error(`漫画目录不存在: ${mangaName}`);
  }

  const metaPath = path.join(mangaPath, "元数据.json");
  let meta: MangaMeta;

  const existingMeta = await readMetaFile(metaPath);
  if (existingMeta) {
    meta = existingMeta;
  } else {
    meta = generateMetaFromStructure(mangaPath, mangaName);
  }

  const chapters: Array<{ name: string; image_count: number }> = [];

  for (const chapterInfo of meta.chapterInfos) {
    const chapterTitle = chapterInfo.chapterTitle;
    if (!chapterTitle) continue;

    let itemPath: string;
    if (
      meta.generated &&
      meta.chapterInfos.length === 1 &&
      chapterTitle === mangaName
    ) {
      itemPath = mangaPath;
    } else {
      itemPath = path.join(mangaPath, chapterTitle);
    }

    const imageCount = countImagesInDirectory(itemPath);
    chapters.push({
      name: String(chapterTitle),
      image_count: Number(imageCount),
    });
  }

  // 按 order 排序
  if (meta.chapterInfos.every((c) => c.order !== undefined)) {
    chapters.sort((a, b) => {
      const orderA =
        meta.chapterInfos.find((c) => c.chapterTitle === a.name)?.order ?? 0;
      const orderB =
        meta.chapterInfos.find((c) => c.chapterTitle === b.name)?.order ?? 0;
      return orderA - orderB;
    });
  } else {
    chapters.sort((a, b) => compareNaturalText(a.name, b.name));
  }

  return chapters;
}

/**
 * 根据 staticDirs 和漫画名找到漫画根目录
 */
async function findMangaPath(
  staticDirs: string[],
  mangaName: string
): Promise<string | null> {
  for (const staticDir of staticDirs) {
    const testPath = path.join(staticDir, mangaName);
    try {
      const stats = await fsPromises.stat(testPath);
      if (stats.isDirectory()) {
        return testPath;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function openMangaFolder(
  staticDirs: string[],
  mangaName: string
): Promise<void> {
  const mangaPath = await findMangaPath(staticDirs, mangaName);
  if (!mangaPath) {
    throw new Error(`漫画目录不存在: ${mangaName}`);
  }

  await openFolder(mangaPath);
}

/**
 * 删除漫画目录
 */
async function deleteMangaFolder(
  staticDirs: string[],
  mangaName: string
): Promise<void> {
  const mangaPath = await findMangaPath(staticDirs, mangaName);
  if (!mangaPath) {
    throw new Error(`漫画目录不存在: ${mangaName}`);
  }

  try {
    await fsPromises.rm(mangaPath, { recursive: true, force: true });
  } catch (error) {
    console.error("删除漫画目录失败:", mangaPath, error);
    throw error;
  }
}

/**
 * 修改漫画目录的更新时间（用于顶置）
 */
async function updateFolderTimestamp(
  staticDirs: string[],
  mangaName: string
): Promise<void> {
  const mangaPath = await findMangaPath(staticDirs, mangaName);
  if (!mangaPath) {
    throw new Error(`文件夹不存在: ${mangaName}`);
  }

  try {
    const now = Date.now() / 1000;
    const atime = now;
    const mtime = now;
    await fsPromises.utimes(mangaPath, atime, mtime);
  } catch (error) {
    console.error("更新文件夹时间失败:", mangaPath, error);
    throw error;
  }
}

/**
 * 选择漫画目录
 */
async function selectMangaDirectory(): Promise<string | null> {
  try {
    const result = await naimo.dialog.showOpen({
      properties: ["openDirectory"],
    });

    if (!result || result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error("选择目录失败:", error);
    return null;
  }
}

/**
 * 打开文件夹
 */
async function openFolder(folderPath: string): Promise<void> {
  try {
    await naimo.shell.openPath(folderPath);
  } catch (error) {
    console.error("打开文件夹失败:", error);
    throw error;
  }
}

interface FavoriteSaveOptions {
  staticDirs: string[];
  filename: string;
  sourcePath?: string;
  data?: BufferSource;
}

interface FavoriteRemoveOptions {
  staticDirs: string[];
  filename: string;
}

async function ensureBookmarksDir(
  staticDirs: string[]
): Promise<string | null> {
  if (!staticDirs || staticDirs.length === 0) {
    return null;
  }
  const rootDir = String(staticDirs[0]);
  if (!rootDir) {
    return null;
  }
  const bookmarksDir = path.join(rootDir, BOOKMARKS_DIR_NAME);
  try {
    await fsPromises.mkdir(bookmarksDir, { recursive: true });
    return bookmarksDir;
  } catch (error) {
    console.error("创建收藏夹目录失败:", error);
    return null;
  }
}

async function saveImageToFavorites(
  options: FavoriteSaveOptions
): Promise<string> {
  const { staticDirs, filename, sourcePath, data } = options;
  const bookmarksDir = await ensureBookmarksDir(staticDirs);
  if (!bookmarksDir) {
    throw new Error("未配置漫画目录，无法保存收藏");
  }
  const targetPath = path.join(bookmarksDir, filename);

  if (sourcePath) {
    await fsPromises.copyFile(sourcePath, targetPath);
    return targetPath;
  }

  if (data) {
    const bufferSource =
      data instanceof ArrayBuffer ? data : (data as unknown as ArrayBufferLike);
    await fsPromises.writeFile(targetPath, Buffer.from(bufferSource));
    return targetPath;
  }

  throw new Error("未提供有效的图片数据");
}

async function removeFavoriteImage(
  options: FavoriteRemoveOptions
): Promise<void> {
  const bookmarksDir = await ensureBookmarksDir(options.staticDirs);
  if (!bookmarksDir) {
    return;
  }
  const targetPath = path.join(bookmarksDir, options.filename);
  try {
    await fsPromises.unlink(targetPath);
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

// ==================== 暴露插件 API ====================

const comicReaderAPI = {
  getMangaList,
  getChapterImages,
  getMangaChapters,
  selectMangaDirectory,
  openFolder,
  openMangaFolder,
  deleteMangaFolder,
  updateFolderTimestamp,
  saveImageToFavorites,
  removeFavoriteImage,
};

contextBridge.exposeInMainWorld("comicReaderAPI", comicReaderAPI);

// ==================== 功能处理器导出 ====================

const handlers = {
  comic: {
    onEnter: async (params: any) => {
      console.log("漫画阅读功能被触发");
      console.log("参数:", params);

      if (typeof window !== "undefined" && (window as any).naimo) {
        (window as any).naimo.log.info("漫画阅读器已加载", { params });
      }
    },
  },
};

// 使用 CommonJS 导出（Electron 环境）
if (typeof module !== "undefined" && module.exports) {
  module.exports = handlers;
}

// ==================== 类型扩展 ====================

declare global {
  interface Window {
    comicReaderAPI: typeof comicReaderAPI;
  }
}
