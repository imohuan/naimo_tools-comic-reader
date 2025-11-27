"use strict";
const buffer = require("buffer");
const electron = require("electron");
const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const fsPromises__namespace = /* @__PURE__ */ _interopNamespaceDefault(fsPromises);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const BOOKMARKS_DIR_NAME = "收藏夹";
function naturalSortKey(text) {
  const parts = text.match(/(\d+|\D+)/g) || [];
  return parts.map((part) => {
    const num = parseInt(part, 10);
    return isNaN(num) ? part.toLowerCase() : num;
  });
}
function compareNaturalText(a, b) {
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
function isImageFile(filename) {
  const ext = path__namespace.extname(filename).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(ext);
}
function generateMetaFromStructure(folderPath, mangaName) {
  const items = fs__namespace.readdirSync(folderPath);
  const chapters = [];
  let hasImages = false;
  let hasDirs = false;
  const subDirs = [];
  const sortedItems = items.sort(compareNaturalText);
  for (const item of sortedItems) {
    const itemPath = path__namespace.join(folderPath, item);
    const stats = fs__namespace.statSync(itemPath);
    if (stats.isDirectory()) {
      if (fs__namespace.readdirSync(itemPath).length > 0) {
        hasDirs = true;
        subDirs.push(item);
      }
    } else if (stats.isFile() && isImageFile(item)) {
      hasImages = true;
    }
  }
  if (hasDirs) {
    subDirs.forEach((chapterName, index) => {
      chapters.push({
        chapterId: `gen-${index + 1}`,
        chapterTitle: chapterName,
        order: index + 1
      });
    });
  } else if (hasImages) {
    chapters.push({
      chapterId: "gen-1",
      chapterTitle: mangaName,
      order: 1
    });
  }
  return {
    id: `gen-${mangaName}`,
    name: mangaName,
    chapterInfos: chapters,
    generated: true
  };
}
async function readMetaFile(metaPath) {
  try {
    const content = await fsPromises__namespace.readFile(metaPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function countImagesInDirectory(dirPath) {
  try {
    const items = fs__namespace.readdirSync(dirPath);
    return items.filter((item) => {
      const itemPath = path__namespace.join(dirPath, item);
      return fs__namespace.statSync(itemPath).isFile() && isImageFile(item);
    }).length;
  } catch {
    return 0;
  }
}
async function getMangaList(staticDirs) {
  const folders = [];
  const processedMangas = /* @__PURE__ */ new Set();
  for (const staticDir of staticDirs) {
    try {
      const items = await fsPromises__namespace.readdir(staticDir);
      for (const name of items) {
        if (processedMangas.has(name)) continue;
        const folderPath = path__namespace.join(staticDir, name);
        const stats = await fsPromises__namespace.stat(folderPath);
        if (!stats.isDirectory()) continue;
        const metaPath = path__namespace.join(folderPath, "元数据.json");
        let meta;
        const existingMeta = await readMetaFile(metaPath);
        if (existingMeta) {
          meta = existingMeta;
        } else {
          meta = generateMetaFromStructure(folderPath, name);
        }
        const mtimeMs = Number(stats.mtimeMs);
        const st_mtime = Number(mtimeMs / 1e3);
        folders.push({
          name: String(name),
          meta: {
            id: String(meta.id),
            name: String(meta.name),
            chapterInfos: meta.chapterInfos.map((ch) => ({
              chapterId: String(ch.chapterId),
              chapterTitle: String(ch.chapterTitle),
              order: Number(ch.order)
            })),
            ...meta.generated !== void 0 && {
              generated: Boolean(meta.generated)
            }
          },
          info: {
            st_mtime
          }
        });
        processedMangas.add(name);
      }
    } catch (error) {
      console.error(`读取目录失败: ${staticDir}`, error);
    }
  }
  folders.sort((a, b) => b.info.st_mtime - a.info.st_mtime);
  folders.sort((a, b) => {
    if (a.name === "收藏夹") return -1;
    if (b.name === "收藏夹") return 1;
    return 0;
  });
  return folders;
}
async function getChapterImages(staticDirs, mangaName, chapterInfo) {
  let mangaPath = null;
  for (const staticDir of staticDirs) {
    const testPath = path__namespace.join(staticDir, mangaName);
    try {
      const stats2 = await fsPromises__namespace.stat(testPath);
      if (stats2.isDirectory()) {
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
  let chapterPath;
  if (mangaName === chapterInfo) {
    chapterPath = mangaPath;
  } else {
    chapterPath = path__namespace.join(mangaPath, chapterInfo);
  }
  const stats = await fsPromises__namespace.stat(chapterPath);
  if (!stats.isDirectory()) {
    throw new Error(`章节目录不存在: ${mangaName}/${chapterInfo}`);
  }
  const items = await fsPromises__namespace.readdir(chapterPath);
  const imageEntries = items.reduce((acc, item) => {
    const itemPath = path__namespace.join(chapterPath, item);
    try {
      const stats2 = fs__namespace.statSync(itemPath);
      if (stats2.isFile() && isImageFile(item)) {
        acc.push({ filename: item, mtimeMs: Number(stats2.mtimeMs) });
      }
    } catch {
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
    url: String(`file://${path__namespace.join(chapterPath, filename)}`),
    path: String(path__namespace.join(chapterPath, filename)),
    mtimeMs
  }));
}
async function getMangaChapters(staticDirs, mangaName) {
  let mangaPath = null;
  for (const staticDir of staticDirs) {
    const testPath = path__namespace.join(staticDir, mangaName);
    try {
      const stats = await fsPromises__namespace.stat(testPath);
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
  const metaPath = path__namespace.join(mangaPath, "元数据.json");
  let meta;
  const existingMeta = await readMetaFile(metaPath);
  if (existingMeta) {
    meta = existingMeta;
  } else {
    meta = generateMetaFromStructure(mangaPath, mangaName);
  }
  const chapters = [];
  for (const chapterInfo of meta.chapterInfos) {
    const chapterTitle = chapterInfo.chapterTitle;
    if (!chapterTitle) continue;
    let itemPath;
    if (meta.generated && meta.chapterInfos.length === 1 && chapterTitle === mangaName) {
      itemPath = mangaPath;
    } else {
      itemPath = path__namespace.join(mangaPath, chapterTitle);
    }
    const imageCount = countImagesInDirectory(itemPath);
    chapters.push({
      name: String(chapterTitle),
      image_count: Number(imageCount)
    });
  }
  if (meta.chapterInfos.every((c) => c.order !== void 0)) {
    chapters.sort((a, b) => {
      const orderA = meta.chapterInfos.find((c) => c.chapterTitle === a.name)?.order ?? 0;
      const orderB = meta.chapterInfos.find((c) => c.chapterTitle === b.name)?.order ?? 0;
      return orderA - orderB;
    });
  } else {
    chapters.sort((a, b) => compareNaturalText(a.name, b.name));
  }
  return chapters;
}
async function findMangaPath(staticDirs, mangaName) {
  for (const staticDir of staticDirs) {
    const testPath = path__namespace.join(staticDir, mangaName);
    try {
      const stats = await fsPromises__namespace.stat(testPath);
      if (stats.isDirectory()) {
        return testPath;
      }
    } catch {
      continue;
    }
  }
  return null;
}
async function openMangaFolder(staticDirs, mangaName) {
  const mangaPath = await findMangaPath(staticDirs, mangaName);
  if (!mangaPath) {
    throw new Error(`漫画目录不存在: ${mangaName}`);
  }
  await openFolder(mangaPath);
}
async function deleteMangaFolder(staticDirs, mangaName) {
  const mangaPath = await findMangaPath(staticDirs, mangaName);
  if (!mangaPath) {
    throw new Error(`漫画目录不存在: ${mangaName}`);
  }
  try {
    await fsPromises__namespace.rm(mangaPath, { recursive: true, force: true });
  } catch (error) {
    console.error("删除漫画目录失败:", mangaPath, error);
    throw error;
  }
}
async function updateFolderTimestamp(staticDirs, mangaName) {
  const mangaPath = await findMangaPath(staticDirs, mangaName);
  if (!mangaPath) {
    throw new Error(`文件夹不存在: ${mangaName}`);
  }
  try {
    const now = Date.now() / 1e3;
    const atime = now;
    const mtime = now;
    await fsPromises__namespace.utimes(mangaPath, atime, mtime);
  } catch (error) {
    console.error("更新文件夹时间失败:", mangaPath, error);
    throw error;
  }
}
async function selectMangaDirectory() {
  try {
    const result = await naimo.dialog.showOpen({
      properties: ["openDirectory"]
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
async function openFolder(folderPath) {
  try {
    await naimo.shell.openPath(folderPath);
  } catch (error) {
    console.error("打开文件夹失败:", error);
    throw error;
  }
}
async function ensureBookmarksDir(staticDirs) {
  if (!staticDirs || staticDirs.length === 0) {
    return null;
  }
  const rootDir = String(staticDirs[0]);
  if (!rootDir) {
    return null;
  }
  const bookmarksDir = path__namespace.join(rootDir, BOOKMARKS_DIR_NAME);
  try {
    await fsPromises__namespace.mkdir(bookmarksDir, { recursive: true });
    return bookmarksDir;
  } catch (error) {
    console.error("创建收藏夹目录失败:", error);
    return null;
  }
}
async function saveImageToFavorites(options) {
  const { staticDirs, filename, sourcePath, data } = options;
  const bookmarksDir = await ensureBookmarksDir(staticDirs);
  if (!bookmarksDir) {
    throw new Error("未配置漫画目录，无法保存收藏");
  }
  const targetPath = path__namespace.join(bookmarksDir, filename);
  if (sourcePath) {
    await fsPromises__namespace.copyFile(sourcePath, targetPath);
    return targetPath;
  }
  if (data) {
    const bufferSource = data instanceof ArrayBuffer ? data : data;
    await fsPromises__namespace.writeFile(targetPath, buffer.Buffer.from(bufferSource));
    return targetPath;
  }
  throw new Error("未提供有效的图片数据");
}
async function removeFavoriteImage(options) {
  const bookmarksDir = await ensureBookmarksDir(options.staticDirs);
  if (!bookmarksDir) {
    return;
  }
  const targetPath = path__namespace.join(bookmarksDir, options.filename);
  try {
    await fsPromises__namespace.unlink(targetPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]+/g;
function sanitizeSegment(name) {
  const cleaned = name.replace(INVALID_FILENAME_CHARS, "_").trim();
  return cleaned.length > 0 ? cleaned : "unnamed";
}
async function saveDownloadImage(options) {
  const baseDir = options.baseDir;
  await fsPromises__namespace.mkdir(baseDir, { recursive: true });
  const comicDir = path__namespace.join(baseDir, sanitizeSegment(options.comicTitle));
  const chapterDir = path__namespace.join(comicDir, sanitizeSegment(options.chapterTitle));
  await fsPromises__namespace.mkdir(chapterDir, { recursive: true });
  const targetPath = path__namespace.join(chapterDir, sanitizeSegment(options.filename));
  const bufferSource = options.data instanceof buffer.Buffer ? options.data : buffer.Buffer.from(options.data);
  await fsPromises__namespace.writeFile(targetPath, bufferSource);
  return targetPath;
}
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
  saveDownloadImage
};
electron.contextBridge.exposeInMainWorld("comicReaderAPI", comicReaderAPI);
const handlers = {
  comic: {
    onEnter: async (params) => {
      console.log("漫画阅读功能被触发");
      console.log("参数:", params);
      if (typeof window !== "undefined" && window.naimo) {
        window.naimo.log.info("漫画阅读器已加载", { params });
      }
    }
  }
};
if (typeof module !== "undefined" && module.exports) {
  module.exports = handlers;
}
