import { Message } from "discord.js";


export type CommandType = "TEXT" | "AUDIO";

export type PermissionRule =
    | { type: "USER"; ids: string[] }
    | { type: "ROLE"; ids: string[] }
    | { type: "GUILD"; ids: string[] }
    | { type: "OWNER" }
    | { type: "CUSTOM"; check: (msg: Message) => boolean | Promise<boolean> };

export interface Command {
    name: string;
    description: string;
    type: "TEXT" | "AUDIO";
    permissions?: PermissionRule[];
    hidden?: boolean;
    execute: (msg: Message, args: string[]) => Promise<void>;
}


export function isValidCommand(obj: any): obj is Command {
    return (
        obj &&
        typeof obj.name === "string" &&
        typeof obj.description === "string" &&
        (obj.type === "TEXT" || obj.type === "AUDIO") &&
        typeof obj.execute === "function"
    );
}

export function safeExecute(
    fn: (msg: Message, args: string[]) => Promise<any>
): (msg: Message, args: string[]) => Promise<void> {
    return async (msg, args) => {
        const result = await fn(msg, args);

        // Runtime safety: warn if command returned something.
        if (result !== undefined) {
            console.warn("⚠️ Command returned a non-void result. Fix this!");
        }
    };
}


export function defineCommand<T extends Command>(cmd: T): T {
    return cmd;
}



export async function hasPermission(
    command: Command,
    msg: Message
): Promise<boolean> {

    if (!command.permissions || command.permissions.length === 0)
        return true;

    for (const rule of command.permissions) {

        // owner-only
        if (rule.type === "OWNER") {
            if (msg.client.application?.owner?.id === msg.author.id)
                continue;
            return false;
        }

        // allowed specific users
        if (rule.type === "USER") {
            if (rule.ids.includes(msg.author.id)) continue;
            return false;
        }

        // allowed guilds
        if (rule.type === "GUILD") {
            if (rule.ids.includes(msg.guild?.id || "")) continue;
            return false;
        }

        // allowed roles
        if (rule.type === "ROLE") {
            const member = msg.member;
            if (member && member.roles.cache.some(r => rule.ids.includes(r.id)))
                continue;
            return false;
        }

        // custom logic
        if (rule.type === "CUSTOM") {
            const ok = await rule.check(msg);
            if (ok) continue;
            return false;
        }
    }

    return true;
}


