import assert from "node:assert/strict";
import test from "node:test";

import { createApi, type InvokeCommand } from "../src/api.ts";
import type { StartSessionRequest } from "../src/types.ts";

test("browser API calls return deterministic fallbacks without invoking Tauri", async () => {
  const invoked: string[] = [];
  const invokeCommand: InvokeCommand = async <T>(command: string) => {
    invoked.push(command);
    throw new Error("Tauri should not be invoked");
  };
  const api = createApi(invokeCommand, () => false);

  assert.deepEqual(await api.toolchain(), {
    available: false,
    platform: "browser",
  });
  assert.deepEqual(await api.devices(), []);
  assert.deepEqual(await api.lanDevices(), []);
  assert.deepEqual(await api.sessions(), []);
  assert.equal(await api.stop("session-1"), undefined);
  assert.deepEqual(await api.pair("192.0.2.1:37123", "123456"), {
    success: false,
    messageKey: "backend.operation.failed",
  });
  assert.deepEqual(await api.connect("192.0.2.1:5555"), {
    success: false,
    messageKey: "backend.operation.failed",
  });
  assert.deepEqual(await api.disconnect("192.0.2.1:5555"), {
    success: false,
    messageKey: "backend.operation.failed",
  });
  assert.deepEqual(await api.restartAdb(), {
    success: false,
    messageKey: "backend.operation.failed",
  });
  assert.deepEqual(invoked, []);
});

test("desktop API calls use the exact Tauri command and argument shapes", async () => {
  const calls: Array<{
    command: string;
    args: Record<string, unknown> | undefined;
  }> = [];
  const invokeCommand: InvokeCommand = async <T>(
    command: string,
    args?: Record<string, unknown>,
  ) => {
    calls.push({ command, args });
    if (command === "get_toolchain_info") {
      return { available: true, platform: "test" } as T;
    }
    if (command === "list_devices" || command === "scan_lan_devices" || command === "list_sessions") {
      return [] as T;
    }
    if (command === "start_session") {
      return {
        id: "session-1",
        deviceSerial: "device-1",
        startedAtMs: 1,
      } as T;
    }
    if (command === "stop_session") return undefined as T;
    return { success: true, message: command } as T;
  };
  const api = createApi(invokeCommand, () => true);
  const request: StartSessionRequest = {
    serial: "device-1",
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

  await api.toolchain();
  await api.devices();
  await api.lanDevices();
  await api.sessions();
  await api.start(request);
  await api.stop("session-1");
  await api.pair("192.0.2.1:37123", "123456");
  await api.connect("192.0.2.1:5555");
  await api.disconnect("192.0.2.1:5555");
  await api.restartAdb();

  assert.deepEqual(calls, [
    { command: "get_toolchain_info", args: undefined },
    { command: "list_devices", args: undefined },
    { command: "scan_lan_devices", args: undefined },
    { command: "list_sessions", args: undefined },
    { command: "start_session", args: { request } },
    { command: "stop_session", args: { sessionId: "session-1" } },
    {
      command: "pair_device",
      args: { address: "192.0.2.1:37123", pairingCode: "123456" },
    },
    {
      command: "connect_device",
      args: { address: "192.0.2.1:5555" },
    },
    {
      command: "disconnect_device",
      args: { address: "192.0.2.1:5555" },
    },
    { command: "restart_adb_server", args: undefined },
  ]);
});

test("session start remains a desktop-only command even in browser mode", async () => {
  const calls: string[] = [];
  const invokeCommand: InvokeCommand = async <T>(command: string) => {
    calls.push(command);
    return {
      id: "session-1",
      deviceSerial: "device-1",
      startedAtMs: 1,
    } as T;
  };
  const api = createApi(invokeCommand, () => false);
  const request: StartSessionRequest = {
    serial: "device-1",
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

  await api.start(request);
  assert.deepEqual(calls, ["start_session"]);
});
