import { spawn } from "node:child_process";

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3211"],
  { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] },
);

let settled = false;
let buffer = "";

const ready = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    reject(new Error(`Lot 11 Next server did not emit readiness within 30s. Output:\n${buffer}`));
  }, 30_000);

  const onData = (chunk) => {
    const text = chunk.toString();
    buffer += text;
    process.stdout.write(text);
    if (!settled && /Ready in|Local:/i.test(buffer)) {
      settled = true;
      clearTimeout(timeout);
      resolve();
    }
  };

  server.stdout.on("data", onData);
  server.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    buffer += text;
    process.stderr.write(text);
  });
  server.once("exit", (code) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    reject(new Error(`Lot 11 Next server exited before readiness with code ${code}. Output:\n${buffer}`));
  });
});

async function stopServer() {
  if (server.exitCode !== null || server.signalCode !== null) return;
  const exited = new Promise((resolve) => server.once("exit", resolve));
  const forceKill = setTimeout(() => {
    if (server.exitCode === null && server.signalCode === null) server.kill("SIGKILL");
  }, 5_000);
  server.kill("SIGTERM");
  await exited;
  clearTimeout(forceKill);
}

try {
  await ready;
  await import("./carte-lot11-neighborhood-browser.mjs");
} finally {
  await stopServer();
}
