import { createServer } from "node:http";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDeployRoot = resolve(__dirname, "..", "..");
const defaultScriptPath = resolve(__dirname, "deploy-release.sh");

const port = Number(process.env.DEPLOY_WEBHOOK_PORT ?? "8090");
const token = process.env.DEPLOY_WEBHOOK_TOKEN;
const deployRoot = process.env.DEPLOY_ROOT ?? defaultDeployRoot;
const deployScript = process.env.DEPLOY_SCRIPT ?? defaultScriptPath;
const logPath = process.env.DEPLOY_WEBHOOK_LOG_PATH ?? resolve(deployRoot, "logs", "deploy-webhook.log");
const acceptedRepository = process.env.DEPLOY_REPOSITORY ?? "";
const acceptedRef = process.env.DEPLOY_REF ?? "main";

const metrics = {
  deployRequestsTotal: 0,
  deployAcceptedTotal: 0,
  deployFailedTotal: 0,
  deployRejectedTotal: 0,
  healthRequestsTotal: 0,
  metricsRequestsTotal: 0,
  lastDeploy: null,
};

if (!token) {
  throw new Error("DEPLOY_WEBHOOK_TOKEN must be configured");
}

let activeDeploy = null;

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function createProcessMetrics() {
  const memory = process.memoryUsage();

  return {
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    memory: {
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      externalBytes: memory.external,
    },
  };
}

async function appendLog(entry) {
  await mkdir(dirname(logPath), { recursive: true });
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry,
  });
  console.log(line);
  await appendFile(logPath, `${line}\n`, "utf8");
}

async function logHttpAccess(request, response, startedAt) {
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

  await appendLog({
    level: "info",
    event: "http_access",
    service: "deploy-webhook",
    method: request.method,
    path: request.url,
    statusCode: response.statusCode,
    durationMs: Number(durationMs.toFixed(2)),
    remoteAddress: request.socket.remoteAddress ?? "unknown",
  });
}

function readBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 64) {
        rejectBody(new Error("Payload too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolveBody(body));
    request.on("error", rejectBody);
  });
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "Payload must be an object";
  }

  if (typeof payload.imageTag !== "string" || payload.imageTag.length < 7) {
    return "imageTag must be a non-empty string";
  }

  if (typeof payload.sha !== "string" || payload.sha.length < 7) {
    return "sha must be a non-empty string";
  }

  if (typeof payload.ref !== "string" || payload.ref !== acceptedRef) {
    return `ref must equal ${acceptedRef}`;
  }

  if (acceptedRepository && payload.repository !== acceptedRepository) {
    return `repository must equal ${acceptedRepository}`;
  }

  return null;
}

function runDeploy(imageTag, payload) {
  return new Promise((resolveDeploy, rejectDeploy) => {
    const child = spawn(deployScript, [imageTag], {
      cwd: deployRoot,
      env: {
        ...process.env,
        DEPLOY_REQUEST_SHA: payload.sha,
        DEPLOY_REQUEST_REF: payload.ref,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", rejectDeploy);
    child.on("close", (code) => {
      if (code === 0) {
        resolveDeploy({ stdout, stderr });
        return;
      }

      const error = new Error(`Deploy script exited with code ${code ?? "unknown"}`);
      error.stdout = stdout;
      error.stderr = stderr;
      rejectDeploy(error);
    });
  });
}

const server = createServer(async (request, response) => {
  const startedAt = process.hrtime.bigint();

  if (request.method === "GET" && request.url === "/health") {
    metrics.healthRequestsTotal += 1;
    json(response, 200, {
      status: "ok",
      activeDeploy: activeDeploy !== null,
    });
    await logHttpAccess(request, response, startedAt);
    return;
  }

  if (request.method === "GET" && request.url === "/metrics") {
    metrics.metricsRequestsTotal += 1;
    json(response, 200, {
      service: "deploy-webhook",
      timestamp: new Date().toISOString(),
      process: createProcessMetrics(),
      activeDeploy,
      counters: metrics,
    });
    await logHttpAccess(request, response, startedAt);
    return;
  }

  if (request.method !== "POST" || request.url !== "/deploy") {
    json(response, 404, { error: "Not found" });
    await logHttpAccess(request, response, startedAt);
    return;
  }

  metrics.deployRequestsTotal += 1;

  if (request.headers["x-deploy-token"] !== token) {
    metrics.deployRejectedTotal += 1;
    await appendLog({
      level: "warn",
      event: "deploy_rejected",
      reason: "invalid_token",
    });
    json(response, 401, { error: "Unauthorized" });
    await logHttpAccess(request, response, startedAt);
    return;
  }

  if (activeDeploy !== null) {
    metrics.deployRejectedTotal += 1;
    json(response, 409, {
      error: "Deploy already in progress",
      activeTag: activeDeploy.imageTag,
    });
    await appendLog({
      level: "warn",
      event: "deploy_rejected",
      reason: "active_deploy_in_progress",
      activeTag: activeDeploy.imageTag,
    });
    await logHttpAccess(request, response, startedAt);
    return;
  }

  try {
    const rawBody = await readBody(request);
    const payload = JSON.parse(rawBody);
    const validationError = validatePayload(payload);

    if (validationError) {
      metrics.deployRejectedTotal += 1;
      json(response, 400, { error: validationError });
      await appendLog({
        level: "warn",
        event: "deploy_rejected",
        reason: "invalid_payload",
        detail: validationError,
      });
      await logHttpAccess(request, response, startedAt);
      return;
    }

    activeDeploy = {
      imageTag: payload.imageTag,
      startedAt: new Date().toISOString(),
    };

    await appendLog({
      level: "info",
      event: "deploy_started",
      imageTag: payload.imageTag,
      sha: payload.sha,
      ref: payload.ref,
      repository: payload.repository,
    });

    const result = await runDeploy(payload.imageTag, payload);

    metrics.deployAcceptedTotal += 1;
    metrics.lastDeploy = {
      status: "success",
      imageTag: payload.imageTag,
      sha: payload.sha,
      finishedAt: new Date().toISOString(),
    };

    await appendLog({
      level: "info",
      event: "deploy_succeeded",
      imageTag: payload.imageTag,
      sha: payload.sha,
    });
    if (result.stdout.trim()) {
      await appendLog({
        level: "info",
        event: "deploy_stdout",
        imageTag: payload.imageTag,
        output: result.stdout.trim(),
      });
    }
    if (result.stderr.trim()) {
      await appendLog({
        level: "warn",
        event: "deploy_stderr",
        imageTag: payload.imageTag,
        output: result.stderr.trim(),
      });
    }

    json(response, 202, {
      accepted: true,
      imageTag: payload.imageTag,
      sha: payload.sha,
    });
    await logHttpAccess(request, response, startedAt);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown deploy error";
    const stdout = error && typeof error === "object" && "stdout" in error ? String(error.stdout ?? "") : "";
    const stderr = error && typeof error === "object" && "stderr" in error ? String(error.stderr ?? "") : "";

    metrics.deployFailedTotal += 1;
    metrics.lastDeploy = {
      status: "failed",
      message,
      finishedAt: new Date().toISOString(),
    };

    await appendLog({
      level: "error",
      event: "deploy_failed",
      message,
    });
    if (stdout.trim()) {
      await appendLog({
        level: "info",
        event: "deploy_stdout",
        output: stdout.trim(),
      });
    }
    if (stderr.trim()) {
      await appendLog({
        level: "error",
        event: "deploy_stderr",
        output: stderr.trim(),
      });
    }

    json(response, 500, { error: message });
    await logHttpAccess(request, response, startedAt);
  } finally {
    activeDeploy = null;
  }
});

server.listen(port, () => {
  void appendLog({
    level: "info",
    event: "webhook_server_started",
    port,
  });
});
