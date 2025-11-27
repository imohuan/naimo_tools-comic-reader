import mitt from "mitt";

export type ImageDecodeEvent = {
  type: "image-loaded" | "image-decoded" | "image-error";
  imageUrl: string;
  imageIndex: number;
  decodedUrl?: string;
  error?: Error;
};

export type EventMap = {
  "image-decode": ImageDecodeEvent;
  "chapter-loaded": { chapterId: string; images: any[] };
  "comic-selected": { comicId: string };
  "chapter-selected": { chapterId: string };
  "manual-page-change": { page: number };
};

export const eventBus = mitt<EventMap>();
