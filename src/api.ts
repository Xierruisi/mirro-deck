import { invoke } from "@tauri-apps/api/core";
import type {
  Device,
  OperationResult,
  SessionInfo,
  StartSessionRequest,
  ToolchainInfo,
} from "./types";

const browserOperationResult: OperationResult = {
  success: false,
  messageKey: "backend.operation.failed",
};

export type InvokeCommand = <T>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<T>;

export function createApi(
  invokeCommand: InvokeCommand = invoke,
  isTauri = detectTauriRuntime,
) {
  const invokeOrFallback = <T>(
    command: string,
    fallback: T,
    args?: Record<string, unknown>,
  ): Promise<T> =>
    isTauri()
      ? invokeCommand<T>(command, args)
      : Promise.resolve(fallback);

  return {
    toolchain: () => invokeOrFallback<ToolchainInfo>("get_toolchain_info", {
      available: false,
      platform: "browser",
    }),
    devices: () => invokeOrFallback<Device[]>("list_devices", []),
    lanDevices: () => invokeOrFallback<Device[]>("scan_lan_devices", []),
    sessions: () => invokeOrFallback<SessionInfo[]>("list_sessions", []),
    start: (request: StartSessionRequest) =>
      invokeCommand<SessionInfo>("start_session", { request }),
    stop: (sessionId: string) =>
      invokeOrFallback<void>("stop_session", undefined, { sessionId }),
    pair: (address: string, pairingCode: string) =>
      invokeOrFallback("pair_device", browserOperationResult, {
        address,
        pairingCode,
      }),
    connect: (address: string) =>
      invokeOrFallback("connect_device", browserOperationResult, { address }),
    disconnect: (address: string) =>
      invokeOrFallback("disconnect_device", browserOperationResult, { address }),
    restartAdb: () =>
      invokeOrFallback("restart_adb_server", browserOperationResult),
  };
}

export const api = createApi();

function detectTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in window
  );
}
