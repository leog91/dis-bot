import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import path from "path";
import { tmpdir } from "os";
import { ComponentType, type Interaction, type Message } from "discord.js";
import { CrashCounterStore, crashCounterStore } from "../services/crashCounter.service";
import interactionCreate from "../events/interactionCreate";
import crashCommand from "../commands/text/crash";

describe("crash counter", () => {
    let directory: string;
    let store: CrashCounterStore;
    let updateSpy: ReturnType<typeof spyOn>;
    let getGuildSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        directory = mkdtempSync(path.join(tmpdir(), "dis-bot-crash-test-"));
        store = new CrashCounterStore(path.join(directory, "state.json"));
        updateSpy = spyOn(crashCounterStore, "update").mockImplementation((...args) => store.update(...args));
        getGuildSpy = spyOn(crashCounterStore, "getGuild").mockImplementation((id) => store.getGuild(id));
    });

    afterEach(() => {
        updateSpy.mockRestore();
        getGuildSpy.mockRestore();
        rmSync(directory, { recursive: true, force: true });
    });

    function component(id: string, select = false, fetchUser = async () => ({ username: "tester" })) {
        let acknowledged = false;
        return {
            guild: { id: "guild", name: "test" }, user: { tag: "tester" },
            message: { id: directory, components: [] },
            customId: id, componentType: select ? ComponentType.UserSelect : ComponentType.Button,
            values: ["user"], isMessageComponent: () => true, isButton: () => !select,
            client: { users: { fetch: async () => {
                expect(acknowledged).toBe(true);
                return fetchUser();
            } } },
            deferUpdate: async () => { acknowledged = true; },
            editReply: async () => {}, reply: async () => {},
        } as unknown as Interaction;
    }

    it("preserves overlapping button updates and acknowledges before fetching", async () => {
        await interactionCreate(component("crash_user_select", true));
        let release: (value: { username: string }) => void;
        const pendingUser = new Promise<{ username: string }>((resolve) => { release = resolve; });
        const first = interactionCreate(component("crash_add", false, () => pendingUser));
        await interactionCreate(component("crash_add"));
        release!({ username: "tester" });
        await first;
        expect(store.getGuild("guild").users.user.crashes).toBe(2);
        await interactionCreate(component("crash_remove"));
        expect(store.getGuild("guild").users.user.crashes).toBe(1);
    });

    it("does not overwrite updates while the crash command is sending its reply", async () => {
        store.update("guild", "user", "tester", 1);
        const msg = {
            guild: { id: "guild" },
            reply: async () => { store.update("guild", "user", "tester", 1); },
        } as unknown as Message;
        await crashCommand.execute(msg);
        expect(store.getGuild("guild").users.user.crashes).toBe(2);
    });

    it("contains user-fetch and acknowledgement failures", async () => {
        await expect(interactionCreate(component("crash_user_select", true, async () => {
            throw new Error("fetch failed");
        }))).resolves.toBeUndefined();
        const button = component("crash_add");
        Object.assign(button, { deferUpdate: async () => { throw new Error("defer failed"); } });
        await expect(interactionCreate(button)).resolves.toBeUndefined();
        expect(updateSpy).not.toHaveBeenCalled();
    });

    it("contains storage and edit failures", async () => {
        await interactionCreate(component("crash_user_select", true));
        updateSpy.mockImplementationOnce(() => { throw new Error("storage failed"); });
        await expect(interactionCreate(component("crash_add"))).resolves.toBeUndefined();
        const button = component("crash_add");
        Object.assign(button, { editReply: async () => { throw new Error("edit failed"); } });
        await expect(interactionCreate(button)).resolves.toBeUndefined();
        expect(store.getGuild("guild").users.user.crashes).toBe(1);
    });

    it("keeps counts nonnegative and preserves other guilds", () => {
        store.update("other", "user", "other", 2);
        store.update("guild", "user", "tester", -1);
        expect(store.getGuild("guild").users.user.crashes).toBe(0);
        expect(store.getGuild("other").users.user.crashes).toBe(2);
    });
});
