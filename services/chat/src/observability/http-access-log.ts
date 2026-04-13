export function installHttpAccessLogging(
  app: { getHttpAdapter(): { getInstance(): unknown } },
  service: string,
) {
  const instance = app.getHttpAdapter().getInstance() as {
    addHook(
      name: string,
      hook: (
        request: Record<string, unknown>,
        reply: Record<string, unknown>,
        done: () => void,
      ) => void,
    ): void;
  };

  instance.addHook("onRequest", (request, _reply, done) => {
    request.__startedAt = process.hrtime.bigint();
    done();
  });

  instance.addHook("onResponse", (request, reply, done) => {
    const startedAt =
      typeof request.__startedAt === "bigint"
        ? request.__startedAt
        : process.hrtime.bigint();
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    console.log(
      JSON.stringify({
        level: "info",
        event: "http_access",
        service,
        method: request.method,
        path: request.url,
        requestId: request.id,
        remoteAddress: request.ip,
        statusCode: reply.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        timestamp: new Date().toISOString(),
      }),
    );

    done();
  });
}
