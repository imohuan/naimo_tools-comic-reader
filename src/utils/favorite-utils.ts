/**
 * 收藏夹目录名（需与 preload 保持一致）
 */
export const BOOKMARKS_DIR_NAME = "收藏夹";

/**
 * 共享的工具函数：处理文件名清洗与收藏文件名生成
 */

export function sanitizeFilename(name: string): string {
  if (!name || typeof name !== "string") {
    return "unnamed";
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return "unnamed";
  }
  return trimmed.replace(/[\\/:*?"<>|]+/g, "_");
}

export interface FavoriteFilenameOptions {
  comicTitle?: string;
  chapterTitle?: string;
  originalName?: string;
  index?: number;
}

export function buildFavoriteFilename(
  options: FavoriteFilenameOptions
): string {
  const comicTitle = options.comicTitle
    ? sanitizeFilename(options.comicTitle)
    : "收藏漫画";
  const chapterTitle = options.chapterTitle
    ? sanitizeFilename(options.chapterTitle)
    : "章节";
  const originalName = options.originalName || "image";
  const extensionMatch = originalName.match(/\.[^/.]+$/);
  const extension = extensionMatch ? extensionMatch[0] : ".jpg";
  const baseName = originalName.replace(/\.[^/.]+$/, "");
  const indexSuffix =
    options.index !== undefined
      ? `#${String(options.index).padStart(3, "0")}`
      : "";
  const uniqueSuffix = Date.now().toString(36);

  const segments = [
    comicTitle,
    chapterTitle,
    indexSuffix || undefined,
    sanitizeFilename(baseName),
    uniqueSuffix,
  ].filter(Boolean);

  return `${segments.join("_")}${extension}`;
}
