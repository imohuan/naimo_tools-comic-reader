import { useJMComicStore } from "../stores/jmcomic";
import { useSearch } from "./useSearch";
import { eventBus } from "../utils/event-bus";

export function usePagination() {
  const store = useJMComicStore();
  const { handleSearch } = useSearch();

  const handlePageChange = async (page: number, isManual: boolean = false) => {
    store.setIsManualLoading(isManual);
    store.setCurrentPage(page);
    // isManual 为 true 时替换列表，false 时追加列表
    await handleSearch(page, !isManual);

    // 如果是手动翻页，发送滚动到顶部的事件
    if (isManual) {
      eventBus.emit("manual-page-change", { page });
    }
  };

  const handleLoad = async () => {
    if (store.loading || !store.hasMorePages) {
      return;
    }

    if (!store.autoLoadNextPage) {
      return;
    }

    try {
      const nextPage = store.currentPage + 1;
      await handlePageChange(nextPage, false);
    } catch (error) {
      console.error("[handleLoad] 加载失败:", error);
      store.setCurrentPage(store.currentPage - 1);
    }
  };

  return {
    handlePageChange,
    handleLoad,
  };
}
