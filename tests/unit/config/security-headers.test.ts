import nextConfig from "../../../next.config";
import { describe, expect, it } from "vitest";

describe("Next.js security headers", () => {
  it("sets the baseline headers on every route", async () => {
    const headers = await nextConfig.headers?.();

    expect(headers).toEqual([
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]);
  });
});
