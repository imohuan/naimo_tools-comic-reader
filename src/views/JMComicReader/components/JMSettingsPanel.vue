<template>
  <n-modal
    :show="show"
    preset="card"
    title="设置"
    style="width: 90%; max-width: 600px"
    @update:show="$emit('update:show', $event)"
  >
    <n-scrollbar style="max-height: 70vh">
      <div class="flex flex-col gap-4 pr-4">
        <n-alert type="warning" :closable="false" show-icon>
          JMComic 有严格的防盗链保护。要使用此页面，您必须提供一个能转发请求并修改 Headers
          的后端代理地址。
        </n-alert>

        <n-divider>代理设置</n-divider>
        <div>
          <label class="block text-sm font-medium mb-1">代理服务 URL (CORS Proxy)</label>
          <n-select
            v-model:value="localSettings.proxyUrl"
            :options="proxyUrlOptions"
            filterable
            tag
            clearable
            placeholder="例如: http://localhost:3000/proxy?url="
          />
          <p class="text-xs text-gray-500 mt-1">
            代理需要处理请求并将图片数据以二进制流返回，同时设置 Header: `Referer:
            https://jmcomic.me/`
          </p>
          <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-gray-300">启用图片代理</span>
              <n-switch v-model:value="localSettings.imageProxyEnabled" />
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-gray-300">启用 API 代理</span>
              <n-switch v-model:value="localSettings.apiProxyEnabled" />
            </div>
          </div>
        </div>

        <n-divider>API 配置</n-divider>
        <div>
          <label class="block text-sm font-medium mb-1">API 域名 (API_DOMAIN)</label>
          <n-select
            v-model:value="localSettings.apiDomain"
            :options="apiDomainOptions"
            filterable
            tag
            clearable
            placeholder="例如: www.cdnblackmyth.club"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">图片域名 (IMAGE_DOMAIN)</label>
          <n-select
            v-model:value="localSettings.imageDomain"
            :options="imageDomainOptions"
            filterable
            tag
            clearable
            placeholder="例如: cdn-msp2.jmapiproxy2.cc"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1"
            >Token 密钥 (APP_TOKEN_SECRET)</label
          >
          <n-select
            v-model:value="localSettings.appTokenSecret"
            :options="tokenSecretOptions"
            filterable
            tag
            clearable
            placeholder="例如: 18comicAPP"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1"
            >Token 密钥 2 (APP_TOKEN_SECRET_2)</label
          >
          <n-select
            v-model:value="localSettings.appTokenSecret2"
            :options="tokenSecret2Options"
            filterable
            tag
            clearable
            placeholder="例如: 18comicAPPContent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">数据密钥 (APP_DATA_SECRET)</label>
          <n-select
            v-model:value="localSettings.appDataSecret"
            :options="dataSecretOptions"
            filterable
            tag
            clearable
            placeholder="例如: 185Hcomic3PAPP7R"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">应用版本 (APP_VERSION)</label>
          <n-select
            v-model:value="localSettings.appVersion"
            :options="appVersionOptions"
            filterable
            tag
            clearable
            placeholder="例如: 1.7.5"
          />
        </div>

        <n-divider>下载设置</n-divider>
        <div>
          <label class="block text-sm font-medium mb-1">下载目录</label>
          <div class="flex items-center gap-2">
            <n-input
              v-model:value="localSettings.downloadDir"
              placeholder="未设置时使用系统下载目录"
              readonly
            />
            <n-button size="small" @click="handleSelectDownloadDir"> 选择目录 </n-button>
          </div>
          <p class="text-xs text-gray-500 mt-1">用于批量下载章节图片时的保存位置。</p>
        </div>

        <n-divider>快捷键设置</n-divider>
        <div>
          <n-space vertical :size="16">
            <HotkeyBinding
              v-for="(action, key) in actionMap"
              :key="key"
              :label="action.label"
              :action-key="key"
              :current-key="store.hotkeys[key]"
              @update="handleHotkeyUpdate"
            />
          </n-space>
        </div>

        <n-divider>自动滚动设置</n-divider>
        <div>
          <n-space vertical :size="12">
            <div class="flex items-center justify-between">
              <span>滚动速度</span>
              <div class="flex items-center gap-4 w-64">
                <n-slider
                  v-model:value="store.autoScrollSpeed"
                  :min="1"
                  :max="10"
                  :step="1"
                  :tooltip="false"
                  style="width: 200px"
                />
                <span class="text-sm font-mono w-10">{{ store.autoScrollSpeed }}</span>
              </div>
            </div>
          </n-space>
        </div>

        <n-divider>阅读性能</n-divider>
        <div>
          <n-space vertical :size="12">
            <div class="flex items-center justify-between">
              <span>最大同时渲染图片数</span>
              <div class="flex items-center gap-4 w-64">
                <n-input-number
                  v-model:value="store.virtualMaxRenderCount"
                  :min="20"
                  :max="500"
                  :step="10"
                  size="small"
                  style="width: 160px"
                />
              </div>
            </div>
          </n-space>
        </div>

        <n-divider>缓存管理</n-divider>
        <div>
          <p class="text-sm text-gray-400 mb-3">
            缓存用于提升加载速度，自动在24小时后过期。您可以手动清除缓存以获取最新数据。
          </p>
          <div class="flex gap-2">
            <n-button @click="clearCache('details')" size="small">清除详情缓存</n-button>
            <n-button @click="clearCache('chapters')" size="small">清除图片缓存</n-button>
            <n-button @click="clearCache()" size="small" type="error"
              >清除所有缓存</n-button
            >
          </div>
          <p class="text-xs text-gray-500 mt-2">
            当前缓存：详情 {{ getCacheCount("details") }} 项，图片
            {{ getCacheCount("chapters") }} 项
          </p>
        </div>
      </div>
    </n-scrollbar>
    <template #footer>
      <div class="flex justify-between items-center">
        <n-button @click="resetSettings">重置为默认</n-button>
        <div class="flex gap-2">
          <n-button @click="$emit('update:show', false)">关闭</n-button>
          <n-button type="primary" @click="saveSettings">保存</n-button>
        </div>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useMessage } from "naive-ui";
import { useJMComicStore } from "@/stores/jmcomic";
import type { ComicAPISettings } from "@/utils/comic-api";
import HotkeyBinding from "@/components/HotkeyBinding.vue";

defineProps<{
  show: boolean;
}>();

defineEmits<{
  "update:show": [value: boolean];
}>();

const store = useJMComicStore();
const message = useMessage();

const localSettings = ref<ComicAPISettings>({ ...store.settings });

watch(
  () => store.settings,
  (newSettings) => {
    localSettings.value = { ...newSettings };
  },
  { deep: true }
);

const proxyUrlOptions = [
  {
    label: "(默认) http://localhost:3000/proxy?url=",
    value: "http://localhost:3000/proxy?url=",
  },
  {
    label: "CorsProxy.io https://corsproxy.io/?",
    value: "https://corsproxy.io/?",
  },
  {
    label: "AllOrigins https://api.allorigins.win/get?url=",
    value: "https://api.allorigins.win/get?url=",
  },
  {
    label: "CORS.SH https://proxy.cors.sh/",
    value: "https://proxy.cors.sh/",
  },
  {
    label: "ThingProxy https://thingproxy.freeboard.io/fetch/",
    value: "https://thingproxy.freeboard.io/fetch/",
  },
  {
    label: "CORS Anywhere https://cors-anywhere.herokuapp.com/",
    value: "https://cors-anywhere.herokuapp.com/",
  },
  { label: "清空", value: "" },
];

const apiDomainOptions = [
  { label: "www.cdnbea.club", value: "www.cdnbea.club" },
  { label: "www.cdnzack.cc", value: "www.cdnzack.cc" },
  { label: "www.cdnblackmyth.club", value: "www.cdnblackmyth.club" },
  { label: "jmcomic.me", value: "jmcomic.me" },
  { label: "jmcomic1.me", value: "jmcomic1.me" },
];

const imageDomainOptions = [
  { label: "cdn-msp2.jmapiproxy2.cc", value: "cdn-msp2.jmapiproxy2.cc" },
  { label: "cdn-msp.jmapiproxy2.cc", value: "cdn-msp.jmapiproxy2.cc" },
  { label: "img.jmcomic.me", value: "img.jmcomic.me" },
];

const tokenSecretOptions = [{ label: "18comicAPP", value: "18comicAPP" }];

const tokenSecret2Options = [{ label: "18comicAPPContent", value: "18comicAPPContent" }];

const dataSecretOptions = [{ label: "185Hcomic3PAPP7R", value: "185Hcomic3PAPP7R" }];

const appVersionOptions = [
  { label: "2.0.13", value: "2.0.13" },
  { label: "2.0.6", value: "2.0.6" },
  { label: "1.7.5", value: "1.7.5" },
];

const saveSettings = () => {
  store.updateSettings(localSettings.value);
  message.success("设置已保存");
};

const resetSettings = () => {
  localSettings.value = {
    proxyUrl: "",
    imageProxyEnabled: true,
    apiProxyEnabled: false,
    apiDomain: "www.cdnblackmyth.club",
    imageDomain: "cdn-msp2.jmapiproxy2.cc",
    appTokenSecret: "18comicAPP",
    appTokenSecret2: "18comicAPPContent",
    appDataSecret: "185Hcomic3PAPP7R",
    appVersion: "1.7.5",
    downloadDir: "",
  };
  message.info("已重置为默认设置");
};

const handleSelectDownloadDir = async () => {
  try {
    const dir = await naimo.download.selectDownloadDirectory();
    if (dir) {
      (localSettings.value as any).downloadDir = dir;
      message.success("已选择下载目录");
    }
  } catch (error) {
    console.error("选择下载目录失败:", error);
    message.error("选择下载目录失败");
  }
};

const clearCache = (type?: "details" | "chapters") => {
  store.cacheUtils.clear(type);
  if (type) {
    message.success(`已清除${type === "details" ? "详情" : "图片"}缓存`);
  } else {
    message.success("已清除所有缓存");
  }
};

const getCacheCount = (type: "details" | "chapters") => {
  return store.cacheUtils.getCount(type);
};

const actionMap = {
  scrollDown: { label: "向下滚动" },
  scrollUp: { label: "向上滚动" },
  autoScroll: { label: "切换自动滚动" },
  speedUp: { label: "增加滚动速度" },
  speedDown: { label: "减少滚动速度" },
};

function handleHotkeyUpdate(actionKey: string, newKey: string) {
  (store.hotkeys as any)[actionKey] = newKey;
}
</script>
