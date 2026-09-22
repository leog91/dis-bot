import type { Client } from "discord.js";
import { format } from "node:util";

const ANSI_PATTERN = /\x1B\[[0-?]*[ -/]*[@-~]/g;
const ANSI_AT_START_PATTERN = /^\x1B\[[0-?]*[ -/]*[@-~]/;
const MAX_LOG_ENTRIES = 500;
const RESET = "\x1b[0m";
const color = {
    boldCyan: (value: string) => `\x1b[1;36m${value}${RESET}`,
    cyan: (value: string) => `\x1b[36m${value}${RESET}`,
    dim: (value: string) => `\x1b[2m${value}${RESET}`,
    green: (value: string) => `\x1b[32m${value}${RESET}`,
    magenta: (value: string) => `\x1b[35m${value}${RESET}`,
    yellow: (value: string) => `\x1b[33m${value}${RESET}`,
};
const processEvents = process as unknown as {
    once(event: "exit" | "SIGINT" | "SIGTERM", listener: () => void): void;
    off(event: "exit" | "SIGINT" | "SIGTERM", listener: () => void): void;
};

export interface DashboardMember {
    name: string;
    flags: string[];
}

export interface DashboardChannel {
    guild: string;
    channel: string;
    members: DashboardMember[];
}

export interface DashboardState {
    status: string;
    rssMb: number;
    uptimeSeconds: number;
    channels: DashboardChannel[];
    logs: string[];
}

export function stripAnsi(value: string) {
    return value.replace(ANSI_PATTERN, "");
}

function truncateAnsi(value: string, width: number) {
    const visibleValue = stripAnsi(value);
    if (visibleValue.length <= width) return value;

    const suffix = width > 3 ? "..." : "";
    const visibleLimit = Math.max(0, width - suffix.length);
    let result = "";
    let visibleLength = 0;
    let offset = 0;

    while (offset < value.length && visibleLength < visibleLimit) {
        const remaining = value.slice(offset);
        const ansiSequence = remaining.match(ANSI_AT_START_PATTERN)?.[0];
        if (ansiSequence) {
            result += ansiSequence;
            offset += ansiSequence.length;
            continue;
        }

        const character = String.fromCodePoint(value.codePointAt(offset)!);
        result += character;
        offset += character.length;
        visibleLength += character.length;
    }

    return `${result}${suffix}${RESET}`;
}

function wrapAnsi(value: string, width: number) {
    if (stripAnsi(value).length <= width) return [value];

    const lines: string[] = [];
    let line = "";
    let activeStyles = "";
    let visibleLength = 0;
    let offset = 0;

    while (offset < value.length) {
        const remaining = value.slice(offset);
        const ansiSequence = remaining.match(ANSI_AT_START_PATTERN)?.[0];
        if (ansiSequence) {
            line += ansiSequence;
            if (ansiSequence.endsWith("m")) {
                activeStyles = ansiSequence === RESET ? "" : `${activeStyles}${ansiSequence}`;
            }
            offset += ansiSequence.length;
            continue;
        }

        const character = String.fromCodePoint(value.codePointAt(offset)!);
        const characterWidth = character.length;
        if (visibleLength > 0 && visibleLength + characterWidth > width) {
            lines.push(`${line}${RESET}`);
            line = activeStyles;
            visibleLength = 0;
        }
        line += character;
        visibleLength += characterWidth;
        offset += character.length;
    }

    if (visibleLength > 0) lines.push(activeStyles ? `${line}${RESET}` : line);
    return lines;
}

function formatUptime(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map(value => String(value).padStart(2, "0")).join(":");
}

export function renderDashboard(state: DashboardState, terminalColumns: number, terminalRows: number) {
    // Filling the final terminal column enables auto-wrap, which can scroll the pinned header away.
    const columns = Math.max(1, terminalColumns - 1);
    const rows = Math.max(1, terminalRows);
    const memberCount = state.channels.reduce((total, channel) => total + channel.members.length, 0);
    const status = state.status === "ONLINE" ? color.green(state.status) : color.yellow(state.status);
    const lines = [
        `${color.boldCyan("DIS-BOT")} | ${status} | ${color.cyan(`${state.rssMb} MB`)} | uptime ${color.cyan(formatUptime(state.uptimeSeconds))}`,
        "",
        color.boldCyan(`CONNECTED VOICE MEMBERS (${memberCount})`),
    ];

    const memberLines: string[] = [];
    if (state.channels.length === 0) {
        memberLines.push(color.dim("  No members connected"));
    } else {
        for (const channel of state.channels) {
            memberLines.push(color.yellow(`${channel.guild} / ${channel.channel}`));
            for (const member of channel.members) {
                const flags = member.flags.length > 0
                    ? ` ${member.flags.map(flag => flag === "muted" ? color.magenta(`[${flag}]`) : color.cyan(`[${flag}]`)).join(" ")}`
                    : "";
                memberLines.push(`  ${member.name}${flags}`);
            }
        }
    }

    // Always leave enough room for the separator, log title, and recent activity.
    const maxMemberLines = Math.max(1, rows - 10);
    if (memberLines.length > maxMemberLines) {
        const hidden = memberLines.length - maxMemberLines + 1;
        lines.push(...memberLines.slice(0, maxMemberLines - 1), color.dim(`  ... ${hidden} more line(s)`));
    } else {
        lines.push(...memberLines);
    }

    lines.push(color.dim("-".repeat(columns)), color.boldCyan("LOGS"));

    const availableLogLines = Math.max(1, rows - lines.length);
    const logLines = state.logs
        .flatMap(entry => entry.replace(/\r/g, "").split("\n"))
        .filter(line => stripAnsi(line).length > 0)
        .flatMap(line => wrapAnsi(line, columns))
        .slice(-availableLogLines);
    lines.push(...logLines);

    while (lines.length < rows) lines.push("");
    return lines.slice(0, rows).map(line => truncateAnsi(line, columns)).join("\n");
}

export class TerminalDashboard {
    private readonly logs: string[] = [];
    private readonly startedAt = Date.now();
    private readonly originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
    };
    private client: Client | undefined;
    private refreshTimer: ReturnType<typeof setInterval> | undefined;
    private running = false;

    get isActive() {
        return this.running;
    }

    start(client: Client) {
        if (this.running) return;
        this.running = true;
        this.client = client;

        console.log = (...args: unknown[]) => this.addLog(format(...args));
        console.info = (...args: unknown[]) => this.addLog(format(...args));
        console.warn = (...args: unknown[]) => this.addLog(`[WARN] ${format(...args)}`);
        console.error = (...args: unknown[]) => this.addLog(`[ERROR] ${format(...args)}`);

        process.stdout.on("resize", this.render);
        processEvents.once("exit", this.stop);
        processEvents.once("SIGINT", this.handleSigint);
        processEvents.once("SIGTERM", this.handleSigterm);
        process.stdout.write("\x1b[?1049h\x1b[?25l");
        this.refreshTimer = setInterval(this.render, 1000);
        this.refreshTimer.unref();
        this.render();
    }

    stop = () => {
        if (!this.running) return;
        this.running = false;
        if (this.refreshTimer) clearInterval(this.refreshTimer);
        process.stdout.off("resize", this.render);
        processEvents.off("exit", this.stop);
        processEvents.off("SIGINT", this.handleSigint);
        processEvents.off("SIGTERM", this.handleSigterm);
        console.log = this.originalConsole.log;
        console.info = this.originalConsole.info;
        console.warn = this.originalConsole.warn;
        console.error = this.originalConsole.error;
        process.stdout.write("\x1b[?25h\x1b[?1049l");
    };

    private handleSigint = () => {
        this.stop();
        process.exit(130);
    };

    private handleSigterm = () => {
        this.stop();
        process.exit(143);
    };

    private addLog(message: string) {
        this.logs.push(message);
        if (this.logs.length > MAX_LOG_ENTRIES) {
            this.logs.splice(0, this.logs.length - MAX_LOG_ENTRIES);
        }
        this.render();
    }

    private getChannels() {
        const channels: DashboardChannel[] = [];
        if (!this.client) return channels;

        for (const guild of this.client.guilds.cache.values()) {
            for (const channel of guild.channels.cache.values()) {
                if (!channel.isVoiceBased()) continue;
                const members = channel.members
                    .filter(member => !member.user.bot)
                    .map(member => {
                        const flags: string[] = [];
                        if (member.voice.selfMute || member.voice.serverMute) flags.push("muted");
                        if (member.voice.selfDeaf || member.voice.serverDeaf) flags.push("deafened");
                        return { name: member.user.tag, flags };
                    });
                if (members.length > 0) {
                    channels.push({ guild: guild.name, channel: channel.name, members });
                }
            }
        }

        return channels;
    }

    private render = () => {
        if (!this.running) return;
        const screen = renderDashboard({
            status: this.client?.isReady() ? "ONLINE" : "CONNECTING",
            rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
            uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
            channels: this.getChannels(),
            logs: this.logs,
        }, process.stdout.columns ?? 100, process.stdout.rows ?? 30);
        process.stdout.write(`\x1b[H\x1b[2J${screen}`);
    };
}
