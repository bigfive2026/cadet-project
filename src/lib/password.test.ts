import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password (SPEC-AUTH)", () => {
  it("hashes and verifies a password roundtrip", async () => {
    const hash = await hashPassword("demo1234!");
    expect(hash).not.toBe("demo1234!");
    await expect(verifyPassword("demo1234!", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("demo1234!");
    await expect(verifyPassword("wrong-pass", hash)).resolves.toBe(false);
  });

  it("produces different hashes for the same input (salt randomness)", async () => {
    const a = await hashPassword("demo1234!");
    const b = await hashPassword("demo1234!");
    expect(a).not.toBe(b);
  });
});
