import { describe, expect, it } from "bun:test";
import type { Message } from "discord.js";
import onMessage from "../events/messageCreate";

describe("message command error handling", () => {
    it("catches permission check failures", async () => {
        let executed = false;
        let reply = "";
        const msg = {
            author: { bot: false, tag: "tester" }, content: "test", guild: null,
            reply: async (content: string) => { reply = content; },
        } as unknown as Message;
        await onMessage(msg, new Map([["test", {
            name: "test",
            permissions: [{ type: "CUSTOM", check: async () => { throw new Error("permission failed"); } }],
            execute: async () => { executed = true; },
        }]]));
        expect(executed).toBe(false);
        expect(reply).toBe("⚠️ Error executing command.");
    });

    it("catches a failed denial reaction and awaits a failed error reply", async () => {
        let replyAttempted = false;
        const msg = {
            author: { bot: false, tag: "tester" }, content: "test", guild: null,
            react: async () => { throw new Error("reaction failed"); },
            reply: async () => {
                await Promise.resolve();
                replyAttempted = true;
                throw new Error("reply failed");
            },
        } as unknown as Message;
        await expect(onMessage(msg, new Map([["test", {
            name: "test", permissions: [{ type: "CUSTOM", check: () => false }],
            execute: async () => { throw new Error("should not execute"); },
        }]]))).resolves.toBeUndefined();
        expect(replyAttempted).toBe(true);
    });

    it("catches failed error replies after execution errors", async () => {
        const msg = {
            author: { bot: false, tag: "tester" }, content: "test", guild: null,
            reply: async () => { throw new Error("reply failed"); },
        } as unknown as Message;
        await expect(onMessage(msg, new Map([["test", {
            name: "test", execute: async () => { throw new Error("execute failed"); },
        }]]))).resolves.toBeUndefined();
    });
});
