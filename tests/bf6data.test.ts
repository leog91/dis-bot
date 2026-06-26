import { describe, it, expect } from "bun:test";
import { formatHistoryTime, previousCalendarMonth, resolveMonth } from "../utils/bf6data";

describe("formatHistoryTime", () => {
    it("formats seconds as hours and minutes", () => {
        expect(formatHistoryTime(0)).toBe("0s");
        expect(formatHistoryTime(59)).toBe("0m");
        expect(formatHistoryTime(60)).toBe("1m");
        expect(formatHistoryTime(3599)).toBe("59m");
        expect(formatHistoryTime(3600)).toBe("1h 0m");
        expect(formatHistoryTime(3661)).toBe("1h 1m");
        expect(formatHistoryTime(7200)).toBe("2h 0m");
    });

    it("ignores remaining seconds", () => {
        expect(formatHistoryTime(3666)).toBe("1h 1m");
    });
});

describe("previousCalendarMonth", () => {
    it("returns the previous calendar month", () => {
        expect(previousCalendarMonth("2025-06")).toBe("2025-05");
        expect(previousCalendarMonth("2025-01")).toBe("2024-12");
        expect(previousCalendarMonth("2024-12")).toBe("2024-11");
    });

    it("handles year boundaries", () => {
        expect(previousCalendarMonth("2025-03")).toBe("2025-02");
        expect(previousCalendarMonth("2025-02")).toBe("2025-01");
    });
});

describe("resolveMonth", () => {
    it("accepts YYYY-MM format", () => {
        expect(resolveMonth("2025-06")).toBe("2025-06");
        expect(resolveMonth("2024-01")).toBe("2024-01");
    });

    it("rejects invalid months", () => {
        expect(resolveMonth("2025-13")).toBeNull();
        expect(resolveMonth("2025-00")).toBeNull();
    });

    it("resolves month names to current or previous year", () => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const prevYear = currentYear - 1;

        // Months already passed (or equal) in the current year resolve to the current year.
        // Months still to come resolve to the previous year.
        expect(resolveMonth("january")).toBe(currentMonth >= 1 ? `${currentYear}-01` : `${prevYear}-01`);
        expect(resolveMonth("jun")).toBe(currentMonth >= 6 ? `${currentYear}-06` : `${prevYear}-06`);
        expect(resolveMonth("dec")).toBe(currentMonth >= 12 ? `${currentYear}-12` : `${prevYear}-12`);
    });

    it("rejects unknown month names", () => {
        expect(resolveMonth("foobar")).toBeNull();
    });
});
