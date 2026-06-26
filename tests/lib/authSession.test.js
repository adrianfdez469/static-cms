import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSessionToken, getSessionMaxAge, validateCredentials, verifySessionToken } from "@/lib/authSession";

beforeEach(() => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-secret");
    vi.stubEnv("ADMIN_USERNAME", "test-username");
    vi.stubEnv("ADMIN_PASSWORD", "test-password");
});

afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

describe("session tokens", () => {
    it("verifies freshly created tokens", async () => {
        const token = await createSessionToken();
        expect(await verifySessionToken(token)).toBe(true);
    })

    it("rejects emptu r malformed tokens", async () => {
        expect(await verifySessionToken(undefined)).toBe(false);
        expect(await verifySessionToken("")).toBe(false);
        expect(await verifySessionToken("not-dot-here")).toBe(false);
    })

    it("rejects a token with a tampered signature", async () => {
        const token = await createSessionToken();
        const [encoded] = token.split(".");
        expect(await verifySessionToken(`${encoded}.deadbeef`)).toBe(false);
    });

    it("rejects a token with a tampered payload", async () => {
        const token = await createSessionToken();
        const [, signature] = token.split(".");
        const forged = Buffer.from(
            JSON.stringify({ admin: true, exp: Date.now() + 100000 })
        ).toString("base64url");
        expect(await verifySessionToken(`${forged}.${signature}`)).toBe(false);
    });

    it("rejects an expired token", async () => {
        const now = 1_000_000;
        const spy = vi.spyOn(Date, "now").mockReturnValue(now);
        const token = await createSessionToken();
        spy.mockReturnValue(now + getSessionMaxAge() * 1000 + 1);
        expect(await verifySessionToken(token)).toBe(false);
    });

    it("throws when the session secret is missing", async () => {
        vi.stubEnv("ADMIN_SESSION_SECRET", "");
        await expect(createSessionToken()).rejects.toThrow(/ADMIN_SESSION_SECRET/);
    });
});

describe("validateCredentials", () => {
    it("accepts correct credentials", () => {
        expect(validateCredentials("test-username", "test-password")).toBe(true);
    });
    it("rejects wrong credentials", () => {
        expect(validateCredentials("test-username", "nope")).toBe(false);
        expect(validateCredentials("intruder", "test-password")).toBe(false);
    });
    it("rejects when env credentials are not configured", () => {
        vi.stubEnv("ADMIN_PASSWORD", "");
        expect(validateCredentials("test-username", "test-password")).toBe(false);
    });
});