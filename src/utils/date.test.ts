import { describe, expect, it } from "vitest";
import {
  bangkokDateInput,
  bangkokDateTimeInput,
  thaiDate,
} from "./date";

describe("Bangkok date helpers", () => {
  it("uses the Bangkok calendar day around UTC midnight", () => {
    const value = new Date("2026-07-28T18:30:00.000Z");
    expect(bangkokDateInput(value)).toBe("2026-07-29");
    expect(bangkokDateTimeInput(value)).toBe("2026-07-29T01:30");
  });

  it("formats a trip date in Thai", () => {
    expect(thaiDate("2026-07-28")).toContain("28");
  });
});

