import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import {
  applySecurityHeaders,
  loadLocalEnvFiles,
  resolveTrustProxy,
  resolveWebOrigin
} from "./common/http/security.config";

async function bootstrap(): Promise<void> {
  loadLocalEnvFiles();
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance() as {
    disable?: (setting: string) => void;
    set?: (setting: string, val: unknown) => void;
  };
  expressApp.disable?.("x-powered-by");
  expressApp.set?.("trust proxy", resolveTrustProxy());

  app.use(applySecurityHeaders(process.env.NODE_ENV === "production"));
  app.use(cookieParser());
  app.setGlobalPrefix("api/v1");

  const webOrigin = resolveWebOrigin();
  app.enableCors({
    origin: webOrigin,
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "X-CSRF-Token",
      "X-CSRF-Sync",
      "Idempotency-Key"
    ]
  });

  const port = Number(process.env.API_PORT ?? "4000");
  await app.listen(port);
}

void bootstrap();
