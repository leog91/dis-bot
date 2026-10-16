import { afterEach, describe, expect, it } from "bun:test";
import { writeFileSync } from "fs";
import { Message, TextChannel } from "discord.js";
import vidCommand from "../commands/text/vid";

const originalSpawn = Bun.spawn;

afterEach(() => {
    Bun.spawn = originalSpawn;
});

describe("vid Reddit handling", () => {
    it("merges audio before sending a video and includes the original post", async () => {
        const url = "https://www.reddit.com/r/test/comments/abc123/example/";
        const commands: string[][] = [];
        const sent: Array<string | Record<string, unknown>> = [];

        Bun.spawn = ((command: string[]) => {
            commands.push(command);

            const outputIndex = command.indexOf("-o");
            const outputTemplate = command[outputIndex + 1];
            writeFileSync(outputTemplate.replace("%(ext)s", "mp4"), "test video");

            return {
                stdout: new Response(" ").body,
                stderr: new Response(" ").body,
                exited: Promise.resolve(0),
            };
        }) as typeof Bun.spawn;

        const channel = Object.create(TextChannel.prototype) as TextChannel;
        Object.defineProperty(channel, "send", {
            value: async (options: string | Record<string, unknown>) => {
                sent.push(options);
                return {
                    edit: async () => {},
                    delete: async () => {},
                };
            },
        });

        const message = {
            author: { toString: () => "<@user>" },
            channel,
            content: `vid ${url}`,
            deletable: false,
            guild: null,
            member: null,
            reply: async () => {},
        } as unknown as Message;

        await vidCommand.execute(message);

        expect(commands).toHaveLength(1);
        expect(commands[0]).toContain("--merge-output-format");
        expect(commands[0]).toContain("bv*+ba/b");
        expect(commands[0]).not.toContain("-g");
        expect(sent).toHaveLength(3);
        expect(sent[1]).toBe("by <@user>:");
        expect(sent[2]).toMatchObject({
            content: `[Original](<${url}>)`,
            files: [{ name: expect.stringMatching(/^reddit-.*\.mp4$/) }],
        });
    });
});

describe("vid Instagram handling", () => {
    it("keeps a visible failure notice when Discord aborts the upload", async () => {
        const url = "https://www.instagram.com/p/Dec_badg07K/";
        const updates: string[] = [];
        let progressDeleted = false;
        const originalConsoleError = console.error;
        const errors: string[] = [];

        Bun.spawn = ((command: string[]) => {
            const outputTemplate = command[command.indexOf("-o") + 1];
            writeFileSync(outputTemplate.replace("%(ext)s", "mp4"), "test video");
            return {
                stdout: new Response(" ").body,
                stderr: new Response(" ").body,
                exited: Promise.resolve(0),
            };
        }) as typeof Bun.spawn;

        const channel = Object.create(TextChannel.prototype) as TextChannel;
        Object.defineProperty(channel, "send", {
            value: async (options: any) => {
                if (options.files) {
                    throw new DOMException("The operation was aborted.", "AbortError");
                }
                return {
                    edit: async (content: string) => { updates.push(content); },
                    delete: async () => { progressDeleted = true; },
                };
            },
        });

        try {
            console.error = (content) => { errors.push(String(content)); };
            await vidCommand.execute({
                author: { toString: () => "test user" },
                channel,
                content: `vid ${url}`,
                deletable: false,
                guild: null,
                member: null,
            } as unknown as Message);
        } finally {
            console.error = originalConsoleError;
        }

        expect(progressDeleted).toBe(false);
        expect(updates.at(-1)).toContain("I couldn't process or upload the video.");
        expect(updates.at(-1)).toContain(url);
        expect(errors).toContain(`vid failed for ${url}: AbortError: The operation was aborted.`);
    });
});
