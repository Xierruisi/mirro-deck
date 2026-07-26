export interface ToolchainInfo {
  available: boolean;
  platform: string;
  directory?: string;
  scrcpyVersion?: string;
  error?: LocalizedMessage;
}

export interface Device {
  serial: string;
  state: string;
  model?: string;
  product?: string;
  device?: string;
  transportId?: string;
  connection: "usb" | "tcpip" | "emulator";
}

export interface SessionInfo {
  id: string;
  deviceSerial: string;
  startedAtMs: number;
}

export interface SessionEvent {
  eventType: "started" | "log" | "stopping" | "exited" | "error";
  sessionId: string;
  deviceSerial: string;
  level: "info" | "stderr" | "error";
  message?: string;
  messageKey?: string;
  messageValues?: Record<string, string>;
  exitCode?: number;
  timestampMs: number;
}

export interface OperationResult {
  success: boolean;
  message?: string;
  messageKey?: string;
  messageValues?: Record<string, string>;
}

export interface LocalizedMessage {
  key: string;
  values?: Record<string, string>;
}

export interface ScrcpyOptions {
  maxSize?: number;
  maxFps?: number;
  videoBitrateMbps?: number;
  videoCodec: "h264" | "h265" | "av1" | "vp8" | "vp9";
  audio: boolean;
  control: boolean;
  turnScreenOff: boolean;
  stayAwake: boolean;
  fullscreen: boolean;
  alwaysOnTop: boolean;
  borderless: boolean;
  keyboardMode: "default" | "uhid" | "disabled";
  recordPath?: string;
}

export type StartSessionRequest = ScrcpyOptions & { serial: string };
