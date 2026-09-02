const GOOGLE_TTS_ENDPOINT = "https://translate.google.com/translate_tts";
const MAX_TEXT_LENGTH = 200;
const SPLIT_PUNCTUATION = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

const isSplitCharacter = (character: string): boolean =>
    /\s/.test(character) || SPLIT_PUNCTUATION.includes(character);

export function getGoogleTTSUrls(text: string, lang: string): string[] {
    if (!text) throw new TypeError("text should be a non-empty string");
    if (!lang) throw new TypeError("lang should be a non-empty string");

    const chunks: string[] = [];
    let start = 0;

    while (text.length - start > MAX_TEXT_LENGTH) {
        let end = start + MAX_TEXT_LENGTH - 1;

        if (!isSplitCharacter(text[end]) && !isSplitCharacter(text[end + 1])) {
            while (end >= start && !isSplitCharacter(text[end])) end--;
            if (end < start) {
                throw new Error("TTS text contains a word longer than 200 characters");
            }
        }

        chunks.push(text.slice(start, end + 1));
        start = end + 1;
    }

    chunks.push(text.slice(start));

    return chunks.map((chunk) => {
        const params = new URLSearchParams({
            ie: "UTF-8",
            q: chunk,
            tl: lang,
            total: "1",
            idx: "0",
            textlen: String(chunk.length),
            client: "tw-ob",
            prev: "input",
            ttsspeed: "1",
        });

        return `${GOOGLE_TTS_ENDPOINT}?${params}`;
    });
}
