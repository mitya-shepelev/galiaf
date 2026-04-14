import "dotenv/config";
import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { AuthConfigService } from "./auth/auth-config.service.js";
import { installHttpAccessLogging } from "./observability/http-access-log.js";

function resolveCorsOrigin(allowedOrigins: string[]): true | string[] {
  if (allowedOrigins.length === 0 || allowedOrigins.includes("*")) {
    return true;
  }

  return allowedOrigins;
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.get(AuthConfigService).validateRuntimeSafety();

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: resolveCorsOrigin(
      (process.env.AUTH_ALLOWED_CORS_ORIGINS ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
    credentials: true,
  });

  installHttpAccessLogging(app, "chat");

  const port = Number(process.env.PORT ?? 4010);
  await app.listen(port, "0.0.0.0");

  Logger.log(`Chat service is listening on port ${port}`, "Bootstrap");
}

void bootstrap();
