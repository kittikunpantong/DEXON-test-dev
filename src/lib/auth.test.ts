import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";
import { safeNext } from "./return-path";

describe("password", () => {
  it("accepts the password that was hashed and rejects a different one", async () => {
    const stored = await hashPassword("Dexon#2026");
    expect(await verifyPassword("Dexon#2026", stored)).toBe(true);
    expect(await verifyPassword("wrong-password", stored)).toBe(false);
    expect(await verifyPassword("Dexon#2026", "not-a-hash")).toBe(false);
  });
});

describe("safeNext", () => {
  it("keeps in-app paths and drops external targets", () => {
    expect(safeNext("/lines/6-PL")).toBe("/lines/6-PL");
    expect(safeNext("https://example.com")).toBe("/");
    expect(safeNext("//example.com")).toBe("/");
    expect(safeNext("/login")).toBe("/");
    expect(safeNext("/api/auth/google")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});
