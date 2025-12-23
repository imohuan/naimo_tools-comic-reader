import CryptoJS from "crypto-js";
import axios, { type AxiosRequestConfig } from "axios";

export interface ComicAPISettings {
  apiDomain?: string;
  imageDomain?: string;
  appTokenSecret?: string;
  appTokenSecret2?: string;
  appDataSecret?: string;
  appVersion?: string;
  proxyUrl?: string;
  imageProxyEnabled?: boolean;
  apiProxyEnabled?: boolean;
  downloadDir?: string;
}

export interface ComicItem {
  id: string;
  title: string;
  author: string;
  date?: string;
  cover?: string;
  description?: string;
  tags?: string[];
}

export enum SearchSort {
  Latest = "mr",
  View = "mv",
  Picture = "mp",
  Like = "tf",
}

export interface ChapterItem {
  id: string;
  title: string;
  order: number;
}

export interface ChapterImage {
  url: string;
  filename: string;
  filenameWithoutExt: string;
  blockNum: number;
  index: number;
  processedUrl?: string | null;
  isProcessing?: boolean;
}

export interface ChapterImagesResult {
  chapterId: string;
  scrambleId: number;
  images: ChapterImage[];
  total: number;
}

export class ComicAPI {
  private API_DOMAIN: string = "";
  private IMAGE_DOMAIN: string = "";
  private APP_TOKEN_SECRET: string = "";
  private APP_TOKEN_SECRET_2: string = "";
  private APP_DATA_SECRET: string = "";
  private APP_VERSION: string = "";
  private PROXY_URL: string = "";
  private API_PROXY_ENABLED = false;

  private buildApiUrl(path: string): string {
    const rawUrl = `https://${this.API_DOMAIN}${path}`;
    if (this.API_PROXY_ENABLED && this.PROXY_URL) {
      return `${this.PROXY_URL}${encodeURIComponent(rawUrl)}&type=api`;
    }
    return rawUrl;
  }

  constructor(settings: ComicAPISettings = {}) {
    this.updateSettings(settings);
  }

  updateSettings(settings: ComicAPISettings) {
    this.API_DOMAIN = settings.apiDomain || "www.cdnzack.cc";
    this.IMAGE_DOMAIN = settings.imageDomain || "cdn-msp2.jmapiproxy2.cc";
    this.APP_TOKEN_SECRET = settings.appTokenSecret || "18comicAPP";
    this.APP_TOKEN_SECRET_2 = settings.appTokenSecret2 || "18comicAPPContent";
    this.APP_DATA_SECRET = settings.appDataSecret || "185Hcomic3PAPP7R";
    this.APP_VERSION = settings.appVersion || "2.0.6";
    this.PROXY_URL = settings.proxyUrl || "";
    this.API_PROXY_ENABLED =
      settings.apiProxyEnabled !== undefined ? settings.apiProxyEnabled : false;
  }

  private md5(str: string): string {
    return CryptoJS.MD5(str).toString();
  }

  private generateToken(timestamp: number, isScrambleId = false): string {
    const secret = isScrambleId
      ? this.APP_TOKEN_SECRET_2
      : this.APP_TOKEN_SECRET;
    return this.md5(timestamp + secret);
  }

  private decryptData(timestamp: number, encryptedData: string): string {
    try {
      const keyHash = this.md5(timestamp + this.APP_DATA_SECRET);
      const key = keyHash.substring(0, 32);
      const keyBytes = CryptoJS.enc.Utf8.parse(key);

      const decrypted = CryptoJS.AES.decrypt(encryptedData, keyBytes, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error("解密失败: " + (error as Error).message);
    }
  }

  private calculateBlockNum(
    scrambleId: number,
    chapterId: number,
    filename: string
  ): number {
    if (chapterId < scrambleId) {
      return 0;
    } else if (chapterId < 268850) {
      return 10;
    } else {
      const x = chapterId < 421926 ? 10 : 8;
      const s = `${chapterId}${filename}`;
      const hash = this.md5(s);
      let blockNum = hash.charCodeAt(hash.length - 1);
      blockNum %= x;
      blockNum = blockNum * 2 + 2;
      return blockNum;
    }
  }

  async stitchImage(imageUrl: string, blockNum: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = function () {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("无法获取 canvas 上下文"));
            return;
          }

          const width = img.width;
          const height = img.height;

          canvas.width = width;
          canvas.height = height;

          const remainderHeight = height % blockNum;

          for (let i = 0; i < blockNum; i++) {
            let blockHeight = Math.floor(height / blockNum);
            const srcImgYStart =
              height - blockHeight * (i + 1) - remainderHeight;
            let dstImgYStart = blockHeight * i;

            if (i === 0) {
              blockHeight += remainderHeight;
            } else {
              dstImgYStart += remainderHeight;
            }

            ctx.drawImage(
              img,
              0,
              srcImgYStart,
              width,
              blockHeight,
              0,
              dstImgYStart,
              width,
              blockHeight
            );
          }

          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve(url);
            } else {
              reject(new Error("图片拼接失败：无法创建 Blob"));
            }
          }, "image/webp");
        } catch (error) {
          reject(new Error("图片拼接失败: " + (error as Error).message));
        }
      };

      img.onerror = function () {
        reject(new Error("图片加载失败"));
      };

      img.src = imageUrl;
    });
  }

  private async apiRequest(
    path: string,
    method: "GET" | "POST" = "GET",
    params: Record<string, any> | null = null,
    data: Record<string, any> | null = null,
    isScrambleId = false
  ): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const token = this.generateToken(timestamp, isScrambleId);
    const tokenparam = `${timestamp},${this.APP_VERSION}`;
    const url = this.buildApiUrl(path);

    const config: AxiosRequestConfig = {
      method,
      url,
      headers: {
        token: token,
        tokenparam: tokenparam,
      },
      withCredentials: true,
    };

    if (params) {
      config.params = params;
    }

    if (data && method === "POST") {
      const formData = new URLSearchParams();
      for (const key in data) {
        formData.append(key, data[key]);
      }
      config.data = formData.toString();
      config.headers!["content-type"] = "application/x-www-form-urlencoded";
    }

    try {
      const response = await axios(config);

      if (response.data && response.data.code !== undefined) {
        if (response.data.code !== 200) {
          throw new Error(
            `API 返回错误: code=${response.data.code}, message=${response.data.msg || "未知错误"
            }`
          );
        }

        if (typeof response.data.data === "string" && response.data.data) {
          try {
            const decrypted = this.decryptData(timestamp, response.data.data);
            response.data.data = JSON.parse(decrypted);
          } catch {
            try {
              response.data.data = JSON.parse(response.data.data);
            } catch {
              // 保持原样
            }
          }
        }
      }

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401) {
          throw new Error("未授权：请先登录或 Cookie 已过期");
        }
        throw new Error(`HTTP ${status}: ${error.response.statusText || ""}`);
      } else if (error.request) {
        throw new Error("网络请求失败，请检查网络连接");
      } else {
        throw error;
      }
    }
  }

  async search(
    keyword: string,
    page = 1,
    sort = SearchSort.Latest
  ): Promise<{ data: any; code: number }> {
    const params = {
      main_tag: 0,
      search_query: keyword,
      page: page,
      o: sort,
    };

    const response = await this.apiRequest("/search", "GET", params);
    console.log({ search: response });
    return response;
  }

  async getComic(aid: string): Promise<any> {
    const params = { id: aid };
    const response = await this.apiRequest("/album", "GET", params);
    console.log({ getComic: response });

    return response.data || response;
  }

  async getChapterImages(chapterId: string): Promise<ChapterImagesResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    const scrambleToken = this.generateToken(timestamp, true);
    const scrambleTokenparam = `${timestamp},${this.APP_VERSION}`;

    const scrambleParams = {
      id: chapterId,
      v: timestamp,
      mode: "vertical",
      page: 0,
      app_img_shunt: 1,
      express: "off",
    };

    let scrambleId = 220980;
    try {
      const scrambleResponse = await axios({
        method: "GET",
        url: this.buildApiUrl("/chapter_view_template"),
        params: scrambleParams,
        headers: {
          token: scrambleToken,
          tokenparam: scrambleTokenparam,
        },
        withCredentials: true,
      });

      const body = scrambleResponse.data;
      const match = body.match(/var scramble_id = (\d+);/);
      if (match) {
        scrambleId = parseInt(match[1]);
      }
    } catch (e) {
      console.warn("获取 scramble_id 失败，使用默认值:", e);
    }

    const chapterParams = { id: chapterId };
    const chapterResponse = await this.apiRequest(
      "/chapter",
      "GET",
      chapterParams
    );

    let chapterData: any;
    if (
      chapterResponse.data &&
      typeof chapterResponse.data === "object" &&
      !Array.isArray(chapterResponse.data)
    ) {
      chapterData = chapterResponse.data;
    } else if (chapterResponse.images) {
      chapterData = chapterResponse;
    } else {
      chapterData = chapterResponse.data || chapterResponse;
    }

    if (
      !chapterData ||
      !chapterData.images ||
      !Array.isArray(chapterData.images)
    ) {
      if (
        chapterData.images &&
        Array.isArray(chapterData.images) &&
        chapterData.images.length === 0
      ) {
        throw new Error(
          "章节图片列表为空。可能的原因：1) 需要登录才能查看此章节；2) 章节 ID 不正确；3) 该章节确实没有图片"
        );
      }
      throw new Error(
        `章节数据中没有图片列表。返回的数据: ${JSON.stringify(
          chapterData
        ).substring(0, 200)}`
      );
    }

    if (chapterData.images.length === 0) {
      throw new Error(
        "该章节没有图片。可能的原因：1) 需要登录才能查看此章节；2) 章节 ID 不正确；3) 该章节确实没有图片"
      );
    }

    const images = chapterData.images.map((filename: string, index: number) => {
      const url = `https://${this.IMAGE_DOMAIN}/media/photos/${chapterId}/${filename}`;
      const filenameWithoutExt = filename.replace(/\.[^/.]+$/, "");
      const blockNum = this.calculateBlockNum(
        scrambleId,
        parseInt(chapterId),
        filenameWithoutExt
      );
      return {
        url,
        filename,
        filenameWithoutExt,
        blockNum,
        index: index + 1,
        processedUrl: null,
        isProcessing: false,
      };
    });

    return {
      chapterId,
      scrambleId,
      images,
      total: images.length,
    };
  }

  async processImage(image: ChapterImage): Promise<string> {
    if (image.processedUrl && image.processedUrl.startsWith("blob:")) {
      return image.processedUrl;
    }

    if (image.blockNum === 0) {
      image.processedUrl = image.url;
      return image.url;
    }

    if (image.isProcessing) {
      return image.url;
    }

    image.isProcessing = true;
    try {
      const processedUrl = await this.stitchImage(image.url, image.blockNum);
      if (processedUrl && processedUrl.startsWith("blob:")) {
        image.processedUrl = processedUrl;
        return processedUrl;
      } else {
        return image.url;
      }
    } catch (error) {
      console.error("图片拼接失败:", error);
      return image.url;
    } finally {
      image.isProcessing = false;
    }
  }
}
