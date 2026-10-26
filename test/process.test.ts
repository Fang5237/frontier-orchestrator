import assert from "node:assert/strict";
import test from "node:test";
import { ActiveProcessRegistry, runCommand } from "../src/process.js";

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

test("ActiveProcessRegistry terminates an in-flight command", async () => {
  const registry = new ActiveProcessRegistry();
  const startedAt = Date.now();
  const running = runCommand(
    {
      command: process.execPath,
      args: ["-e", "setInterval(() => {}, 1000)"],
      cwd: process.cwd(),
    },
    {
      timeoutMs: 10_000,
      maxCapturedBytes: 10_000,
      registry,
    },
  );

  await delay(100);
  await registry.terminateAll(200);
  const result = await running;

  assert.ok(result.signal !== null || result.exitCode !== 0);
  assert.ok(Date.now() - startedAt < 3_000);
});

test("runCommand terminates the child when the request signal aborts", async () => {
  const controller = new AbortController();
  const startedAt = Date.now();
  const running = runCommand(
    {
      command: process.execPath,
      args: ["-e", "setInterval(() => {}, 1000)"],
      cwd: process.cwd(),
    },
    {
      timeoutMs: 10_000,
      maxCapturedBytes: 10_000,
      signal: controller.signal,
    },
  );

  await delay(100);
  controller.abort();
  const result = await running;

  assert.equal(result.cancelled, true);
  assert.equal(result.timedOut, false);
  assert.ok(result.signal !== null || result.exitCode !== 0);
  assert.ok(Date.now() - startedAt < 3_000);
});
