import { watch, onUnmounted } from "vue";
import { useJMComicStore } from "../stores/jmcomic";

export function useAutoScroll(scrollContainer: () => HTMLElement | null) {
  const store = useJMComicStore();
  let autoScrollInterval: number | null = null;

  const startAutoScroll = () => {
    if (autoScrollInterval) return;

    autoScrollInterval = window.setInterval(() => {
      const container = scrollContainer();
      if (!container) return;

      const speed = store.autoScrollSpeed * 2;
      container.scrollTop += speed;
    }, 16);
  };

  const stopAutoScroll = () => {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }
  };

  watch(
    () => store.autoScroll,
    (enabled) => {
      if (enabled) {
        startAutoScroll();
      } else {
        stopAutoScroll();
      }
    }
  );

  onUnmounted(() => {
    stopAutoScroll();
  });

  return {
    startAutoScroll,
    stopAutoScroll,
  };
}
