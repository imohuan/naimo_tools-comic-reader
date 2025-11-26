/// <reference path="../../typings/naimo.d.ts" />

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
  /**
   * 图片最后修改时间（毫秒）
   */
  mtimeMs?: number;
}

export interface FavoriteSaveOptions {
  staticDirs: string[];
  filename: string;
  sourcePath?: string;
  data?: BufferSource;
}

export interface FavoriteRemoveOptions {
  staticDirs: string[];
  filename: string;
}

export interface ComicReaderAPI {
  getMangaList(staticDirs: string[]): Promise<MangaItem[]>;
  getChapterImages(
    staticDirs: string[],
    mangaName: string,
    chapterInfo: string
  ): Promise<ImageItem[]>;
  getMangaChapters(
    staticDirs: string[],
    mangaName: string
  ): Promise<Array<{ name: string; image_count: number }>>;
  selectMangaDirectory(): Promise<string | null>;
  openFolder(folderPath: string): Promise<void>;
  openMangaFolder(staticDirs: string[], mangaName: string): Promise<void>;
  deleteMangaFolder(staticDirs: string[], mangaName: string): Promise<void>;
  updateFolderTimestamp(staticDirs: string[], mangaName: string): Promise<void>;
  saveImageToFavorites(options: FavoriteSaveOptions): Promise<string>;
  removeFavoriteImage(options: FavoriteRemoveOptions): Promise<void>;
}

declare global {
  interface Window {
    comicReaderAPI: ComicReaderAPI;
    $message?: {
      success: (message: string) => void;
      error: (message: string) => void;
      warning: (message: string) => void;
      info: (message: string) => void;
    };
    $loadMangaList?: () => Promise<void>;
  }
}
