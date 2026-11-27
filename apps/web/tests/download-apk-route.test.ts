import { describe, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/download-apk/route";

describe("GET /api/download-apk", () => {
  it("streams APK directly with attachment disposition and package-archive MIME type", async () => {
    const fakeStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([0x50, 0x4b, 0x03, 0x04]));
        controller.close();
      }
    });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(fakeStream, {
          status: 200,
          headers: { "content-length": "4" }
        })
      );

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(
      "application/vnd.android.package-archive"
    );
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="Saudavo-v1.0.1.apk"'
    );
    expect(res.headers.get("content-length")).toBe("4");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes)).toEqual([0x50, 0x4b, 0x03, 0x04]);

    fetchSpy.mockRestore();
  });

  it("returns 502 JSON error when upstream APK asset is unavailable", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Not Found", { status: 404 }));

    const res = await GET();
    expect(res.status).toBe(502);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("APK_UNAVAILABLE");

    fetchSpy.mockRestore();
  });
});
