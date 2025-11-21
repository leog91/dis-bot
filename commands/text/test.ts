import { defineCommand } from "..";

export default defineCommand({
    name: "test",
    description: "Only selected users can run this",
    type: "TEXT",
    hidden: true,
    permissions: [
        { type: "USER", ids: ["158794899083231232"] }
    ],
    async execute(msg) {
        msg.reply("test complete.");
    }
});