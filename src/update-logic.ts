import type {
  TranslationKey,
  TranslationValues,
} from "./i18n/catalogs.ts";

export type UpdateStatus = {
  phase:
    | "idle"
    | "checking"
    | "current"
    | "available"
    | "installing"
    | "restarting"
    | "error";
  messageKey: TranslationKey;
  messageValues?: TranslationValues;
  progress?: number;
};

export type UpdateDownloadEvent =
  | {
      event: "Started";
      data: { contentLength?: number };
    }
  | {
      event: "Progress";
      data: { chunkLength: number };
    }
  | {
      event: "Finished";
    };

export function createUpdateProgressTracker(): (
  event: UpdateDownloadEvent,
) => UpdateStatus {
  let downloaded = 0;
  let contentLength: number | undefined;

  return (event) => {
    switch (event.event) {
      case "Started":
        downloaded = 0;
        contentLength = positiveByteCount(event.data.contentLength);
        return {
          phase: "installing",
          messageKey: "settings.updates.downloading",
          progress: 0,
        };
      case "Progress": {
        downloaded += positiveByteCount(event.data.chunkLength) ?? 0;
        const progress =
          contentLength === undefined
            ? undefined
            : Math.min(
                100,
                Math.round((downloaded / contentLength) * 100),
              );
        return {
          phase: "installing",
          messageKey:
            progress === undefined
              ? "settings.updates.downloading"
              : "settings.updates.downloadingProgress",
          messageValues:
            progress === undefined ? undefined : { progress },
          progress,
        };
      }
      case "Finished":
        return {
          phase: "installing",
          messageKey: "settings.updates.installing",
          progress: 100,
        };
    }
  };
}

export function updateErrorMessage(
  error: unknown,
  unknownMessage: string,
): Pick<UpdateStatus, "messageKey" | "messageValues"> {
  const message = extractErrorMessage(error);
  if (
    /valid release json|latest(?:\.json)?|release manifest|manifest.*(?:invalid|missing)/i.test(
      message,
    )
  ) {
    return { messageKey: "settings.updates.error.noManifest" };
  }
  if (/\b404\b|not found|no (?:stable )?release/i.test(message)) {
    return { messageKey: "settings.updates.error.noRelease" };
  }
  if (
    /network|connect(?:ion|ed)?|tim(?:e|ed)\s*out|timeout|dns|failed to fetch|offline|socket/i.test(
      message,
    )
  ) {
    return { messageKey: "settings.updates.error.network" };
  }
  return {
    messageKey: "settings.updates.error.generic",
    messageValues: { message: message || unknownMessage },
  };
}

function positiveByteCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error !== "object" || error === null) return "";

  try {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  } catch {
    return "";
  }
}
