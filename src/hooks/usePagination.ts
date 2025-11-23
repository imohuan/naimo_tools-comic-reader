import { useJMComicStore } from "../stores/jmcomic";
import { useSearch } from "./useSearch";

export function usePagination() {
  const store = useJMComicStore();
  const { handleSearch } = useSearch();

  const handlePageChange = (page: number) => {
    store.setCurrentPage(page);
    handleSearch(page, false);
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
      store.setCurrentPage(nextPage);
      await handleSearch(nextPage, true);
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
