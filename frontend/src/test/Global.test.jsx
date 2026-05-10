import { describe, expect, test, vi } from "vitest";
import { getCookie, apiFetch } from "../global.jsx";

beforeEach(() => {
  vi.restoreAllMocks();
  document.cookie = "";
});

describe("global utility functions", () => {
  test("getCookie returns a matching cookie value", () => {
    document.cookie = "session=abc123";
    document.cookie = "theme=dark";
    expect(getCookie("session")).toBe("abc123");
    expect(getCookie("theme")).toBe("dark");
  });

  test("apiFetch throws when response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: false, status: 503, statusText: "Service Unavailable" })
    ));

    await expect(apiFetch("health")).rejects.toThrow(
      "Request failed: 503 Service Unavailable"
    );
  });
});
