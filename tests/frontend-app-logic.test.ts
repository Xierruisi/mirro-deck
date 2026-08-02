import assert from "node:assert/strict";
import test from "node:test";

import {
  connectionGuidance,
  connectionLabel,
  deserializeScrcpyOptions,
  errorMessage,
  findNewAvailableWirelessDevice,
  loadScrcpyOptions,
  loadThemePreference,
  operationResultMessage,
  parseThemePreference,
  persistScrcpyOptions,
  persistThemePreference,
  scrcpyOptionsStorageKey,
  serializeScrcpyOptions,
  themeStorageKey,
} from "../src/app-logic.ts";
import { translateCatalogMessage, type Translate } from "../src/i18n/catalogs.ts";
import type { Device, ScrcpyOptions } from "../src/types.ts";

const defaults: ScrcpyOptions = {
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

const english: Translate = (key, values) =>
  translateCatalogMessage("en", key, values);
const translationKey: Translate = (key) => key;

test("missing, invalid, and non-object option payloads fall back to a fresh default object", () => {
  for (const serialized of [null, "", "{", "null", "[]", '"text"', "42"]) {
    const result = deserializeScrcpyOptions(serialized, defaults);
    assert.deepEqual(result, defaults);
    assert.notStrictEqual(result, defaults);
  }
});

test("option deserialization accepts only supported fields and values", () => {
  const options = deserializeScrcpyOptions(
    JSON.stringify({
      maxSize: 2560,
      maxFps: 120,
      videoBitrateMbps: 32,
      videoCodec: "av1",
      audio: false,
      control: false,
      turnScreenOff: true,
      stayAwake: false,
      fullscreen: true,
      alwaysOnTop: true,
      borderless: true,
      keyboardMode: "uhid",
      recordPath: "/tmp/capture.mkv",
      unknownOption: "ignored",
    }),
    defaults,
  );

  assert.deepEqual(options, {
    maxSize: 2560,
    maxFps: 120,
    videoBitrateMbps: 32,
    videoCodec: "av1",
    audio: false,
    control: false,
    turnScreenOff: true,
    stayAwake: false,
    fullscreen: true,
    alwaysOnTop: true,
    borderless: true,
    keyboardMode: "uhid",
    recordPath: "/tmp/capture.mkv",
  });
  assert.equal("unknownOption" in options, false);
});

test("option deserialization rejects wrong types, unsupported enums, and out-of-range numbers", () => {
  const result = deserializeScrcpyOptions(
    JSON.stringify({
      maxSize: 239,
      maxFps: 241,
      videoBitrateMbps: 1.5,
      videoCodec: "mpeg2",
      keyboardMode: "magic",
      audio: "yes",
      control: 1,
      recordPath: "bad\0path",
    }),
    defaults,
  );
  assert.deepEqual(result, defaults);
});

test("option number validation follows backend limits inclusively", () => {
  assert.deepEqual(
    deserializeScrcpyOptions(
      JSON.stringify({
        maxSize: 240,
        maxFps: 1,
        videoBitrateMbps: 1,
      }),
      defaults,
    ),
    { ...defaults, maxSize: 240, maxFps: 1, videoBitrateMbps: 1 },
  );
  assert.deepEqual(
    deserializeScrcpyOptions(
      JSON.stringify({
        maxSize: 8192,
        maxFps: 240,
        videoBitrateMbps: 100,
      }),
      defaults,
    ),
    { ...defaults, maxSize: 8192, maxFps: 240, videoBitrateMbps: 100 },
  );
});

test("explicit nulls preserve optional unset values across serialization", () => {
  const options: ScrcpyOptions = {
    ...defaults,
    maxSize: undefined,
    maxFps: undefined,
    videoBitrateMbps: undefined,
    recordPath: undefined,
  };
  const serialized = serializeScrcpyOptions(options);
  assert.deepEqual(JSON.parse(serialized), {
    videoCodec: "h264",
    audio: true,
    control: true,
    turnScreenOff: false,
    stayAwake: true,
    fullscreen: false,
    alwaysOnTop: false,
    borderless: false,
    keyboardMode: "default",
    maxSize: null,
    maxFps: null,
    videoBitrateMbps: null,
    recordPath: null,
  });
  const restored = deserializeScrcpyOptions(serialized, defaults);
  assert.equal(restored.maxSize, undefined);
  assert.equal(restored.maxFps, undefined);
  assert.equal(restored.videoBitrateMbps, undefined);
  assert.equal(restored.recordPath, undefined);
  assert.deepEqual(
    JSON.parse(serializeScrcpyOptions(restored)),
    JSON.parse(serialized),
  );
});

test("option storage helpers use the stable key and tolerate inaccessible storage", () => {
  let writtenKey = "";
  let writtenValue = "";
  assert.equal(
    persistScrcpyOptions((key, value) => {
      writtenKey = key;
      writtenValue = value;
    }, defaults),
    true,
  );
  assert.equal(writtenKey, scrcpyOptionsStorageKey);
  assert.deepEqual(deserializeScrcpyOptions(writtenValue, defaults), defaults);

  assert.equal(
    persistScrcpyOptions(() => {
      throw new Error("quota exceeded");
    }, defaults),
    false,
  );
  assert.deepEqual(
    loadScrcpyOptions(() => {
      throw new Error("storage denied");
    }, defaults),
    defaults,
  );
});

test("theme preference parsing and storage always fall back to system safely", () => {
  assert.equal(parseThemePreference("light"), "light");
  assert.equal(parseThemePreference("dark"), "dark");
  assert.equal(parseThemePreference("system"), "system");
  assert.equal(parseThemePreference("DARK"), "system");
  assert.equal(parseThemePreference(""), "system");
  assert.equal(parseThemePreference(null), "system");
  assert.equal(
    loadThemePreference(() => {
      throw new Error("storage denied");
    }),
    "system",
  );

  let stored: [string, string] | undefined;
  assert.equal(
    persistThemePreference((key, value) => {
      stored = [key, value];
    }, "dark"),
    true,
  );
  assert.deepEqual(stored, [themeStorageKey, "dark"]);
  assert.equal(
    persistThemePreference(() => {
      throw new Error("storage denied");
    }, "light"),
    false,
  );
});

test("finds only newly available wireless devices after pairing", () => {
  const previous: Device[] = [
    {
      serial: "usb-1",
      state: "device",
      connection: "usb",
    },
    {
      serial: "192.0.2.10:5555",
      state: "device",
      connection: "tcpip",
    },
  ];
  const connected: Device = {
    serial: "adb-device-guid._adb-tls-connect._tcp",
    state: "device",
    model: "Pixel 9",
    connection: "tcpip",
  };
  const offline: Device = {
    serial: "adb-offline-guid._adb-tls-connect._tcp",
    state: "offline",
    connection: "tcpip",
  };

  assert.equal(
    findNewAvailableWirelessDevice(previous, [
      ...previous,
      { serial: "192.0.2.20:5555", state: "offline", connection: "tcpip" },
      connected,
    ]),
    connected,
  );
  assert.equal(
    findNewAvailableWirelessDevice([...previous, offline], [
      ...previous,
      { ...offline, state: "device" },
    ])?.serial,
    offline.serial,
  );
  assert.equal(findNewAvailableWirelessDevice(previous, previous), undefined);
});

test("errors prefer localized payloads, then useful text, then the unknown fallback", () => {
  assert.equal(
    errorMessage(
      { key: "common.version", values: { version: "4.1" } },
      english,
    ),
    "Version 4.1",
  );
  assert.equal(errorMessage("plain failure", english), "plain failure");
  assert.equal(errorMessage(new Error("typed failure"), english), "typed failure");
  assert.equal(errorMessage("", english), "An unknown error occurred");
  assert.equal(errorMessage(new Error(""), english), "An unknown error occurred");
  assert.equal(errorMessage({ message: "untrusted shape" }, english), "An unknown error occurred");
  assert.equal(errorMessage(null, english), "An unknown error occurred");
});

test("operation results translate known keys and fall back to backend text", () => {
  assert.equal(
    operationResultMessage(
      {
        message: "fallback",
        messageKey: "common.version",
        messageValues: { version: "4.1" },
      },
      english,
    ),
    "Version 4.1",
  );
  assert.equal(
    operationResultMessage(
      { message: "fallback", messageKey: "unknown.key" },
      english,
    ),
    "fallback",
  );
  assert.equal(operationResultMessage({}, english), undefined);
});

test("connection guidance prioritizes scan errors and covers device states", () => {
  const baseDevice: Device = {
    serial: "serial",
    state: "device",
    connection: "usb",
  };

  assert.deepEqual(
    connectionGuidance(baseDevice, "ADB failed", translationKey),
    {
      tone: "error",
      title: "guidance.scanFailedTitle",
      message: "ADB failed",
    },
  );
  assert.deepEqual(connectionGuidance(undefined, undefined, translationKey), {
    tone: "info",
    title: "guidance.connectTitle",
    message: "guidance.connectMessage",
  });
  assert.deepEqual(
    connectionGuidance(
      { ...baseDevice, state: "unauthorized" },
      undefined,
      translationKey,
    ),
    {
      tone: "warning",
      title: "guidance.unauthorizedTitle",
      message: "guidance.unauthorizedMessage",
    },
  );
  assert.deepEqual(
    connectionGuidance(
      { ...baseDevice, state: "offline" },
      undefined,
      translationKey,
    ),
    {
      tone: "error",
      title: "guidance.offlineTitle",
      message: "guidance.offlineMessage",
    },
  );
  assert.equal(
    connectionGuidance(baseDevice, undefined, translationKey),
    undefined,
  );
});

test("connection labels translate known transports and preserve future transports", () => {
  assert.equal(connectionLabel("usb", translationKey), "device.connection.usb");
  assert.equal(
    connectionLabel("tcpip", translationKey),
    "device.connection.wifi",
  );
  assert.equal(
    connectionLabel("emulator", translationKey),
    "device.connection.emulator",
  );
  assert.equal(connectionLabel("relay", translationKey), "relay");
});
