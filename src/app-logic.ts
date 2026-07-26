import {
  translateLocalizedMessage,
  type Translate,
} from "./i18n/catalogs.ts";
import type { Device, ScrcpyOptions } from "./types.ts";

export const scrcpyOptionsStorageKey = "scrcpy-options";
export const themeStorageKey = "mirrodeck-theme";

export type ThemePreference = "light" | "dark" | "system";
export type StorageReader = (key: string) => string | null;
export type StorageWriter = (key: string, value: string) => void;

const booleanOptionKeys = [
  "audio",
  "control",
  "turnScreenOff",
  "stayAwake",
  "fullscreen",
  "alwaysOnTop",
  "borderless",
] as const satisfies readonly (keyof ScrcpyOptions)[];

const numberOptionRanges = {
  maxSize: [240, 8192],
  maxFps: [1, 240],
  videoBitrateMbps: [1, 100],
} as const satisfies Record<
  "maxFps" | "maxSize" | "videoBitrateMbps",
  readonly [number, number]
>;

const videoCodecs = new Set<ScrcpyOptions["videoCodec"]>([
  "h264",
  "h265",
  "av1",
  "vp8",
  "vp9",
]);
const keyboardModes = new Set<ScrcpyOptions["keyboardMode"]>([
  "default",
  "uhid",
  "disabled",
]);

export function deserializeScrcpyOptions(
  serialized: string | null,
  defaults: ScrcpyOptions,
): ScrcpyOptions {
  if (serialized === null) return { ...defaults };

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return { ...defaults };
  }
  if (!isRecord(parsed)) return { ...defaults };

  const options: ScrcpyOptions = { ...defaults };

  for (const key of booleanOptionKeys) {
    if (typeof parsed[key] === "boolean") options[key] = parsed[key];
  }

  for (const [key, [minimum, maximum]] of Object.entries(numberOptionRanges) as Array<
    [
      keyof typeof numberOptionRanges,
      readonly [number, number],
    ]
  >) {
    const value = parsed[key];
    if (value === null) {
      delete options[key];
    } else if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= minimum &&
      value <= maximum
    ) {
      options[key] = value;
    }
  }

  if (
    typeof parsed.videoCodec === "string" &&
    videoCodecs.has(parsed.videoCodec as ScrcpyOptions["videoCodec"])
  ) {
    options.videoCodec = parsed.videoCodec as ScrcpyOptions["videoCodec"];
  }
  if (
    typeof parsed.keyboardMode === "string" &&
    keyboardModes.has(parsed.keyboardMode as ScrcpyOptions["keyboardMode"])
  ) {
    options.keyboardMode = parsed.keyboardMode as ScrcpyOptions["keyboardMode"];
  }

  if (parsed.recordPath === null || parsed.recordPath === "") {
    delete options.recordPath;
  } else if (
    typeof parsed.recordPath === "string" &&
    !parsed.recordPath.includes("\0")
  ) {
    options.recordPath = parsed.recordPath;
  }

  return options;
}

export function serializeScrcpyOptions(options: ScrcpyOptions): string {
  return JSON.stringify({
    ...options,
    maxSize: options.maxSize ?? null,
    maxFps: options.maxFps ?? null,
    videoBitrateMbps: options.videoBitrateMbps ?? null,
    recordPath: options.recordPath ?? null,
  });
}

export function loadScrcpyOptions(
  read: StorageReader,
  defaults: ScrcpyOptions,
): ScrcpyOptions {
  try {
    return deserializeScrcpyOptions(read(scrcpyOptionsStorageKey), defaults);
  } catch {
    return { ...defaults };
  }
}

export function persistScrcpyOptions(
  write: StorageWriter,
  options: ScrcpyOptions,
): boolean {
  try {
    write(scrcpyOptionsStorageKey, serializeScrcpyOptions(options));
    return true;
  } catch {
    return false;
  }
}

export function parseThemePreference(stored: string | null): ThemePreference {
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

export function loadThemePreference(read: StorageReader): ThemePreference {
  try {
    return parseThemePreference(read(themeStorageKey));
  } catch {
    return "system";
  }
}

export function persistThemePreference(
  write: StorageWriter,
  theme: ThemePreference,
): boolean {
  try {
    write(themeStorageKey, theme);
    return true;
  } catch {
    return false;
  }
}

export function errorMessage(error: unknown, t: Translate): string {
  const localized = translateLocalizedMessage(error, t);
  if (localized) return localized;
  if (typeof error === "string" && error.length > 0) return error;
  if (error instanceof Error && error.message.length > 0) return error.message;
  return t("common.unknownError");
}

export function operationResultMessage(
  result: {
    message?: string;
    messageKey?: string;
    messageValues?: Record<string, string>;
  },
  t: Translate,
): string | undefined {
  return (
    translateLocalizedMessage(
      result.messageKey
        ? { key: result.messageKey, values: result.messageValues }
        : undefined,
      t,
    ) ?? result.message
  );
}

export type ConnectionGuidance = {
  tone: "error" | "info" | "warning";
  title: string;
  message: string;
};

export function connectionGuidance(
  device: Device | undefined,
  scanError: string | undefined,
  t: Translate,
): ConnectionGuidance | undefined {
  if (scanError) {
    return {
      tone: "error",
      title: t("guidance.scanFailedTitle"),
      message: scanError,
    };
  }
  if (!device) {
    return {
      tone: "info",
      title: t("guidance.connectTitle"),
      message: t("guidance.connectMessage"),
    };
  }
  if (device.state === "unauthorized") {
    return {
      tone: "warning",
      title: t("guidance.unauthorizedTitle"),
      message: t("guidance.unauthorizedMessage"),
    };
  }
  if (device.state === "offline") {
    return {
      tone: "error",
      title: t("guidance.offlineTitle"),
      message: t("guidance.offlineMessage"),
    };
  }
  return undefined;
}

export function connectionLabel(
  connection: Device["connection"] | string,
  t: Translate,
): string {
  return {
    usb: t("device.connection.usb"),
    tcpip: t("device.connection.wifi"),
    emulator: t("device.connection.emulator"),
  }[connection] ?? connection;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
