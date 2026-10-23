import { spawn, type ChildProcess } from "node:child_process";

/** `next start` forks a child, so kill the whole process group. SIGKILL, because a graceful shutdown keeps serving the browser's open connections. */
export function stop(proc: ChildProcess) {
  try { if (proc.pid) process.kill(-proc.pid, "SIGKILL"); } catch { /* already gone */ }
}

/** Starts an extra production server (reusing the build) with its own environment. */
export async function startServer(port: number, env: Record<string, string> = {}): Promise<ChildProcess> {
  const proc = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    stdio: "ignore",
    detached: true,
    env: { ...process.env, ...env },
  });
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`http://localhost:${port}/login`, { redirect: "manual" })).status < 500) return proc; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  stop(proc);
  throw new Error(`test server on port ${port} did not start`);
}
