import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const simulate = process.argv.includes("--simulate-update");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viteBin = path.join(root, "node_modules/vite/bin/vite.js");

const child = spawn(process.execPath, [viteBin], {
  stdio: "inherit",
  env: {
    ...process.env,
    QUIZAPP_SIMULATE_UPDATE: simulate ? "1" : "",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
