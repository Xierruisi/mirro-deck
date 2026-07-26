import type { ScrcpyOptions } from "@/types";

export const projectLinks = {
  repository: "https://github.com/xierruisi/mirro-deck",
  releases: "https://github.com/xierruisi/mirro-deck/releases",
  scrcpy: "https://github.com/Genymobile/scrcpy",
  tauri: "https://github.com/tauri-apps/tauri",
} as const;

export const defaultOptions: ScrcpyOptions = {
  maxSize: 1920,
  maxFps: 60,
  videoBitrateMbps: 8,
  videoCodec: "h264",
  audio: true,
  control: true,
  turnScreenOff: false,
  stayAwake: true,
  fullscreen: false,
  alwaysOnTop: false,
  borderless: false,
  keyboardMode: "default",
};

export const presets = [
  {
    id: "default",
    options: defaultOptions,
  },
  {
    id: "smooth",
    options: { maxSize: 1280, maxFps: 60, videoBitrateMbps: 6, videoCodec: "h264" },
  },
  {
    id: "quality",
    options: { maxSize: 2560, maxFps: 60, videoBitrateMbps: 16, videoCodec: "h265" },
  },
  {
    id: "readonly",
    options: { control: false, keyboardMode: "disabled", turnScreenOff: false },
  },
] satisfies Array<{
  id: "default" | "quality" | "readonly" | "smooth";
  options: Partial<ScrcpyOptions>;
}>;
