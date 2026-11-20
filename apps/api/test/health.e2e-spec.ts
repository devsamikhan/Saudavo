import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { HealthResponseSchema } from "@saudavo/contracts";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("GET /api/v1/health (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 OK matching HealthResponseSchema", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const res = await request(server).get("/api/v1/health").expect(200);

    const parsed = HealthResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.data.status).toBe("ok");
      expect(parsed.data.data.service).toBe("saudavo-api");
    }
  });
});
