import { describe, expect, it } from "bun:test";
import { renderDashboard, stripAnsi } from "../utils/terminalDashboard";

describe("terminal dashboard", () => {
    it("strips colors from captured console output", () => {
        expect(stripAnsi("\x1b[31merror\x1b[0m")).toBe("error");
    });

    it("renders connected members and keeps the latest logs", () => {
        const screen = renderDashboard({
            status: "ONLINE",
            rssMb: 84,
            uptimeSeconds: 3661,
            channels: [{
                guild: "Test server",
                channel: "General",
                members: [{ name: "leo", flags: ["muted"] }],
            }],
            logs: ["old log", "new log"],
        }, 80, 15);

        const plainScreen = stripAnsi(screen);
        expect(plainScreen).toContain("DIS-BOT | ONLINE | 84 MB | uptime 01:01:01");
        expect(plainScreen).toContain("Test server / General");
        expect(plainScreen).toContain("leo [muted]");
        expect(plainScreen).toContain("new log");
        expect(screen.split("\n")).toHaveLength(15);
    });

    it("preserves colors from captured logs", () => {
        const coloredLog = "\x1b[32mgreen log\x1b[0m";
        const screen = renderDashboard({
            status: "ONLINE",
            rssMb: 84,
            uptimeSeconds: 0,
            channels: [],
            logs: [coloredLog],
        }, 80, 10);

        expect(screen).toContain(coloredLog);
    });

    it("wraps log lines instead of truncating them", () => {
        const log = "a very long log line that cannot fit";
        const screen = renderDashboard({
            status: "ONLINE",
            rssMb: 84,
            uptimeSeconds: 0,
            channels: [],
            logs: [log],
        }, 20, 15);

        const plainLines = screen.split("\n").map(stripAnsi);
        const logLines = plainLines.slice(plainLines.indexOf("LOGS") + 1).filter(Boolean);
        expect(logLines.join("")).toBe(log);
        expect(logLines).toHaveLength(2);
        expect(logLines.every(line => line.length < 20)).toBe(true);
        expect(logLines.every(line => !line.endsWith("..."))).toBe(true);
    });

    it("continues log colors across wrapped lines", () => {
        const message = "x".repeat(50);
        const screen = renderDashboard({
            status: "ONLINE",
            rssMb: 84,
            uptimeSeconds: 0,
            channels: [],
            logs: [`\x1b[32m${message}\x1b[0m`],
        }, 20, 15);

        const lines = screen.split("\n");
        const logIndex = lines.findIndex(line => stripAnsi(line) === "LOGS");
        const wrappedLogs = lines.slice(logIndex + 1).filter(line => stripAnsi(line).length > 0);
        expect(wrappedLogs.map(stripAnsi).join("")).toBe(message);
        expect(wrappedLogs).toHaveLength(3);
        expect(wrappedLogs.every(line => line.startsWith("\x1b[32m"))).toBe(true);
    });

    it("reserves the final column when several logs fill the terminal width", () => {
        const screen = renderDashboard({
            status: "ONLINE",
            rssMb: 92,
            uptimeSeconds: 30,
            channels: [{
                guild: "Server",
                channel: "General",
                members: [{ name: "leo", flags: [] }],
            }],
            logs: Array.from({ length: 20 }, (_, index) => `${index} ${"x".repeat(100)}`),
        }, 80, 20);

        const lines = screen.split("\n");
        expect(lines).toHaveLength(20);
        expect(lines.every(line => stripAnsi(line).length < 80)).toBe(true);
        expect(stripAnsi(lines[0])).toContain("DIS-BOT | ONLINE");
        expect(stripAnsi(screen)).toContain("Server / General");
    });
});
