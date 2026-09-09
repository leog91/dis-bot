import { afterEach, describe, expect, it } from "bun:test";
import {
    getShorterVidUrlIfAvailable,
} from "../services/vid.service";

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

describe("getShorterVidUrlIfAvailable", () => {
    it("accepts an is.gd URL that redirects to the requested media", async () => {
        const mediaUrl = "https://cdn.example.com/video.mp4?token=abc";
        const requests: string[] = [];

        globalThis.fetch = (async (input) => {
            const requestUrl = String(input);
            requests.push(requestUrl);

            if (requestUrl.startsWith("https://is.gd/create.php")) {
                return new Response("https://is.gd/video1");
            }

            return new Response(null, {
                status: 301,
                headers: { location: mediaUrl },
            });
        }) as typeof fetch;

        expect(await getShorterVidUrlIfAvailable(mediaUrl)).toBe("https://is.gd/video1");
        expect(requests).toHaveLength(2);
    });

    it("rejects a wrong is.gd destination and falls back to v.gd", async () => {
        const mediaUrl = "https://cdn.example.com/video.mp4?token=abc";
        const requests: string[] = [];

        globalThis.fetch = (async (input) => {
            const requestUrl = String(input);
            requests.push(requestUrl);

            if (requestUrl.startsWith("https://is.gd/create.php")) {
                return new Response("https://is.gd/wrong1");
            }
            if (requestUrl === "https://is.gd/wrong1") {
                return new Response(null, {
                    status: 301,
                    headers: { location: "https://example.com/not-the-video" },
                });
            }
            if (requestUrl.startsWith("https://v.gd/create.php")) {
                return new Response("https://v.gd/video2");
            }

            return new Response(null, {
                status: 302,
                headers: { location: mediaUrl },
            });
        }) as typeof fetch;

        expect(await getShorterVidUrlIfAvailable(mediaUrl)).toBe("https://v.gd/video2");
        expect(requests).toHaveLength(4);
    });

    it("returns the media URL when neither shortener has a valid destination", async () => {
        const mediaUrl = "https://cdn.example.com/video.mp4?token=abc";

        globalThis.fetch = (async (input) => {
            const requestUrl = String(input);

            if (requestUrl.startsWith("https://is.gd/create.php")) {
                return new Response("https://is.gd/wrong1");
            }
            if (requestUrl.startsWith("https://v.gd/create.php")) {
                return new Response("https://v.gd/wrong2");
            }

            return new Response(null, {
                status: 301,
                headers: { location: "https://example.com/not-the-video" },
            });
        }) as typeof fetch;

        expect(await getShorterVidUrlIfAvailable(mediaUrl)).toBe(mediaUrl);
    });
});
