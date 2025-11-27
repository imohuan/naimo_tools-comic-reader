import { useMessage } from "naive-ui";
import { useJMComicStore } from "../stores/jmcomic";
import type { ComicItem } from "../utils/comic-api";

export function useSearch() {
  const store = useJMComicStore();
  const message = useMessage();

  const applyFirstPagePageSize = (page: number, count: number) => {
    if (page === 1) {
      store.setPageSize(Math.max(1, count));
    }
  };

  const processSearchResponse = (response: any, page: number): ComicItem[] => {
    let data = response.data || response;
    let items: any[] = [];

    if (data && data.content && Array.isArray(data.content)) {
      items = data.content;
      applyFirstPagePageSize(page, items.length);
      if (data.total) {
        const total = parseInt(data.total) || 0;
        store.setTotalItems(total);
      } else {
        store.setTotalItems(items.length * store.currentPage);
      }
    } else if (data && data.list && Array.isArray(data.list)) {
      items = data.list;
      applyFirstPagePageSize(page, items.length);
      store.setTotalItems(items.length);
    } else if (Array.isArray(data)) {
      items = data;
      applyFirstPagePageSize(page, items.length);
      store.setTotalItems(items.length);
    }

    return items.map((item) => {
      const albumId = item.id || item.aid || item.album_id;
      const rawImage =
        item.image || item.thumb || item.cover || item.thumb_url || "";
      return {
        id: albumId,
        title: item.name || item.title || "未知标题",
        author: item.author || item.author_name || "未知作者",
        date: item.update_at
          ? new Date(item.update_at * 1000).toLocaleDateString()
          : "",
        cover: processCoverUrl(rawImage, albumId),
        description: item.description || item.intro || "",
        tags: item.tags || [],
      };
    });
  };

  const processCoverUrl = (image: string, albumId: string): string => {
    const imageDomain = store.settings.imageDomain || "cdn-msp2.jmapiproxy2.cc";

    if (!image) {
      if (albumId) {
        return `https://${imageDomain}/media/albums/${albumId}_3x4.jpg`;
      }
      return "";
    }

    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }

    if (image.startsWith("media/")) {
      return `https://${imageDomain}/${image}`;
    } else if (image.startsWith("albums/")) {
      return `https://${imageDomain}/media/${image}`;
    } else if (albumId) {
      return `https://${imageDomain}/media/albums/${albumId}_3x4.jpg`;
    } else {
      return `https://${imageDomain}/media/albums/${image}`;
    }
  };

  const generateSearchCacheKey = (
    query: string,
    page: number,
    sort: string
  ): string => {
    return `${query || ""}_${page}_${sort}`;
  };

  const handleSearch = async (page = 1, append = false) => {
    if (!store.searchQuery && page === 1) {
      return;
    }

    if (page === 1 && !append) {
      store.setComicList([]);
      store.setCurrentPage(1);
      store.setHasMorePages(true);
    }

    // 生成缓存 key
    const cacheKey = generateSearchCacheKey(
      store.searchQuery || "",
      page,
      store.searchSort
    );

    // 尝试从缓存获取
    const cachedResult = store.cacheUtils.get<ComicItem[]>(
      cacheKey,
      "searches"
    );

    if (cachedResult) {
      applyFirstPagePageSize(page, cachedResult.length);
      // 使用缓存数据
      if (append) {
        store.appendComicList(cachedResult);
      } else {
        store.setComicList(cachedResult);
      }

      // 更新分页信息
      if (cachedResult.length === 0 || store.currentPage >= store.totalPages) {
        store.setHasMorePages(false);
      } else {
        store.setHasMorePages(true);
      }

      store.setLoading(false);
      store.setIsManualLoading(false);
      return;
    }

    store.setLoading(true);
    try {
      if (!store.api) {
        throw new Error("API 未初始化");
      }

      const response = await store.api.search(
        store.searchQuery || "",
        page,
        store.searchSort
      );
      const newItems = processSearchResponse(response, page);

      // 保存到缓存
      store.cacheUtils.set(cacheKey, newItems, "searches");

      if (append) {
        store.appendComicList(newItems);
      } else {
        store.setComicList(newItems);
      }

      if (newItems.length === 0 || store.currentPage >= store.totalPages) {
        store.setHasMorePages(false);
      } else {
        store.setHasMorePages(true);
      }
    } catch (error: any) {
      console.error("[handleSearch] 搜索失败:", error);
      message.error("搜索失败: " + error.message);
      if (!append) {
        store.setComicList([]);
      }
    } finally {
      store.setLoading(false);
      store.setIsManualLoading(false);
    }
  };

  return {
    handleSearch,
    processCoverUrl,
  };
}
