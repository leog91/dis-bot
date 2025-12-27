import fs from "fs";
import path from "path";
import chalk from "chalk";

const LOG_DIR = path.join(__dirname, "../logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

export type LogType = "INFO" | "VOICE" | "MESSAGE" | "ERROR" | "BUTTON" | "SELECT";

export function logger(server: string, message: string, type: LogType = "INFO") {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${server}] [${type}] ${message}\n`;

    // Write to daily file
    const logFile = path.join(LOG_DIR, `${new Date().toISOString().slice(0, 10)}.log`);
    fs.appendFileSync(logFile, line, "utf8");

    // Color console output
    let colorLine = line;
    switch (type) {
        case "INFO": colorLine = chalk.white(line); break;
        case "VOICE": colorLine = message.includes("joined") ? chalk.green(line)
            : message.includes("left") ? chalk.red(line)
                : chalk.yellow(line);
            break;
        case "MESSAGE": colorLine = chalk.cyan(line); break;
        case "ERROR": colorLine = chalk.redBright(line); break;
    }

    console.log(colorLine.trim());
}