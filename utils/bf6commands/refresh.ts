import { refreshBF6Data } from "../bf6data";
import { REFRESH_OWNER_ID } from "./constants";
import type { BF6Handler } from "./constants";

export const refreshHandler: BF6Handler = async (_sub, msg, _args, safeReply) => {
    if (msg.author.id !== REFRESH_OWNER_ID) {
        await safeReply("🚫 5 USD to leog");
        return;
    }
    const { durationMs } = await refreshBF6Data();
    await safeReply(
        `force refresh completed in ${durationMs.toFixed(0)} ms.  \n https://is.gd/1Cm9Ta`
    );
};
