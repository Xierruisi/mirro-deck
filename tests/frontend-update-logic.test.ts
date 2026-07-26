import assert from "node:assert/strict";
import test from "node:test";

import {
  createUpdateProgressTracker,
  updateErrorMessage,
} from "../src/update-logic.ts";

test("update errors distinguish missing manifests from missing releases", () => {
  for (const error of [
    "Could not parse as valid release JSON",
    "latest.json is unavailable",
    new Error("release manifest missing"),
    { message: "manifest invalid" },
  ]) {
    assert.deepEqual(updateErrorMessage(error, "Unknown"), {
      messageKey: "settings.updates.error.noManifest",
    });
  }

  for (const error of [
    "HTTP 404",
    new Error("release not found"),
    { message: "No stable release" },
  ]) {
    assert.deepEqual(updateErrorMessage(error, "Unknown"), {
      messageKey: "settings.updates.error.noRelease",
    });
  }
});

test("update errors recognize common network failure wording", () => {
  for (const error of [
    "network failure",
    "connection refused",
    "request timed out",
    "request time out",
    "request timeout",
    "DNS lookup failed",
    "Failed to fetch",
    "host is offline",
    "socket closed",
  ]) {
    assert.deepEqual(updateErrorMessage(error, "Unknown"), {
      messageKey: "settings.updates.error.network",
    });
  }
});

test("generic update errors preserve useful text and use a safe fallback", () => {
  assert.deepEqual(updateErrorMessage(new Error("signature mismatch"), "Unknown"), {
    messageKey: "settings.updates.error.generic",
    messageValues: { message: "signature mismatch" },
  });
  assert.deepEqual(updateErrorMessage({ message: "permission denied" }, "Unknown"), {
    messageKey: "settings.updates.error.generic",
    messageValues: { message: "permission denied" },
  });

  for (const error of [undefined, null, 42, {}, { message: 42 }]) {
    assert.deepEqual(updateErrorMessage(error, "Unknown"), {
      messageKey: "settings.updates.error.generic",
      messageValues: { message: "Unknown" },
    });
  }

  const hostile = Object.defineProperty({}, "message", {
    get() {
      throw new Error("getter failed");
    },
  });
  assert.deepEqual(updateErrorMessage(hostile, "Unknown"), {
    messageKey: "settings.updates.error.generic",
    messageValues: { message: "Unknown" },
  });
});

test("download progress accumulates chunks, rounds, and caps at 100 percent", () => {
  const track = createUpdateProgressTracker();

  assert.deepEqual(
    track({ event: "Started", data: { contentLength: 1000 } }),
    {
      phase: "installing",
      messageKey: "settings.updates.downloading",
      progress: 0,
    },
  );
  assert.deepEqual(track({ event: "Progress", data: { chunkLength: 250 } }), {
    phase: "installing",
    messageKey: "settings.updates.downloadingProgress",
    messageValues: { progress: 25 },
    progress: 25,
  });
  assert.deepEqual(track({ event: "Progress", data: { chunkLength: 255 } }), {
    phase: "installing",
    messageKey: "settings.updates.downloadingProgress",
    messageValues: { progress: 51 },
    progress: 51,
  });
  assert.deepEqual(track({ event: "Progress", data: { chunkLength: 1000 } }), {
    phase: "installing",
    messageKey: "settings.updates.downloadingProgress",
    messageValues: { progress: 100 },
    progress: 100,
  });
  assert.deepEqual(track({ event: "Finished" }), {
    phase: "installing",
    messageKey: "settings.updates.installing",
    progress: 100,
  });
});

test("unknown download sizes remain indeterminate and malformed chunks are ignored", () => {
  for (const contentLength of [undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const track = createUpdateProgressTracker();
    track({ event: "Started", data: { contentLength } });
    assert.deepEqual(track({ event: "Progress", data: { chunkLength: 50 } }), {
      phase: "installing",
      messageKey: "settings.updates.downloading",
      messageValues: undefined,
      progress: undefined,
    });
  }

  const track = createUpdateProgressTracker();
  track({ event: "Started", data: { contentLength: 100 } });
  for (const chunkLength of [-10, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(track({ event: "Progress", data: { chunkLength } }), {
      phase: "installing",
      messageKey: "settings.updates.downloadingProgress",
      messageValues: { progress: 0 },
      progress: 0,
    });
  }
});

test("a new download start resets accumulated progress", () => {
  const track = createUpdateProgressTracker();
  track({ event: "Started", data: { contentLength: 100 } });
  track({ event: "Progress", data: { chunkLength: 90 } });
  assert.deepEqual(
    track({ event: "Started", data: { contentLength: 200 } }),
    {
      phase: "installing",
      messageKey: "settings.updates.downloading",
      progress: 0,
    },
  );
  assert.deepEqual(track({ event: "Progress", data: { chunkLength: 20 } }), {
    phase: "installing",
    messageKey: "settings.updates.downloadingProgress",
    messageValues: { progress: 10 },
    progress: 10,
  });
});

test("progress before a start event is handled as indeterminate", () => {
  const track = createUpdateProgressTracker();
  assert.deepEqual(track({ event: "Progress", data: { chunkLength: 10 } }), {
    phase: "installing",
    messageKey: "settings.updates.downloading",
    messageValues: undefined,
    progress: undefined,
  });
});
