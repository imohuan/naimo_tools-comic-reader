import { ref, watch, onMounted } from "vue";
import type { Ref } from "vue";

interface Serializer<T> {
  read: (raw: unknown) => T;
  write: (value: T) => unknown;
}

interface UseNaimoStorageOptions<T> {
  /**
   * 自定义序列化方案（默认直接将值交给 naimo.storage 处理，
   * 在无 naimo 环境下使用 JSON 序列化）
   */
  serializer?: Serializer<T>;
  /**
   * watch 是否使用深度监听
   */
  deep?: boolean;
}

/**
 * 一个类似 @vueuse/core useStorage 的通用 hooks，
 * 但底层使用 naimo.storage 进行持久化（在可用时）。
 *
 * - 优先使用 window.naimo.storage
 * - 退化为 localStorage（浏览器环境）或纯内存 ref
 */
export function useNaimoStorage<T>(
  key: string,
  initialValue: T,
  options: UseNaimoStorageOptions<T> = {}
): Ref<T> {
  const { serializer, deep = true } = options;

  const state = ref<T>(initialValue) as Ref<T>;
  const initialized = ref(false);

  const defaultSerializer: Serializer<T> = {
    read(raw: unknown): T {
      // naimo.storage: 直接返回
      return (raw as T) ?? initialValue;
    },
    write(value: T): unknown {
      return value as unknown;
    },
  };

  const jsonSerializer: Serializer<T> = {
    read(raw: unknown): T {
      if (typeof raw !== "string") return initialValue;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return initialValue;
      }
    },
    write(value: T): unknown {
      try {
        return JSON.stringify(value);
      } catch {
        return "";
      }
    },
  };

  const naimoSerializer = serializer ?? defaultSerializer;
  const localSerializer = serializer ?? jsonSerializer;

  const hasNaimoStorage =
    typeof window !== "undefined" && !!window.naimo && !!window.naimo.storage;

  const hasLocalStorage =
    typeof window !== "undefined" && !!window.localStorage;

  const load = async () => {
    if (hasNaimoStorage) {
      try {
        const raw = await window.naimo!.storage.getItem(key);
        if (raw !== undefined && raw !== null) {
          state.value = naimoSerializer.read(raw);
        }
      } catch (error) {
        console.error("[useNaimoStorage] 读取 naimo.storage 失败:", error);
      }
    } else if (hasLocalStorage) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw !== null) {
          state.value = localSerializer.read(raw);
        }
      } catch (error) {
        console.error("[useNaimoStorage] 读取 localStorage 失败:", error);
      }
    }

    initialized.value = true;
  };

  const save = async (value: T) => {
    if (hasNaimoStorage) {
      try {
        const payload = naimoSerializer.write(value);
        await window.naimo!.storage.setItem(
          key,
          JSON.parse(JSON.stringify(payload))
        );
      } catch (error) {
        console.error("[useNaimoStorage] 写入 naimo.storage 失败:", error);
      }
    } else if (hasLocalStorage) {
      try {
        const payload = localSerializer.write(value);
        window.localStorage.setItem(key, JSON.stringify(payload));
      } catch (error) {
        console.error("[useNaimoStorage] 写入 localStorage 失败:", error);
      }
    }
  };

  // 初次挂载时从存储中加载
  onMounted(() => {
    void load();
  });

  // 值变化时写回存储
  watch(
    state,
    (val) => {
      if (!initialized.value) return;
      void save(val);
    },
    { deep }
  );

  return state;
}
