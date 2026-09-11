import type { CivilRange } from "@repo/core/application/browse/ports";
import { describe, expect, it } from "vitest";
import { TemporalCivilDate } from "./civilDate";

const range = (start: string, end: string): CivilRange => ({
  start: Date.parse(start),
  end: Date.parse(end),
});

describe("TemporalCivilDate", () => {
  it.each([
    ["2024-02", "UTC", 29, "2024-02-01T00:00:00Z", "2024-03-01T00:00:00Z"],
    ["2023-02", "UTC", 28, "2023-02-01T00:00:00Z", "2023-03-01T00:00:00Z"],
    [
      "2024-12",
      "Asia/Tokyo",
      31,
      "2024-11-30T15:00:00Z",
      "2024-12-31T15:00:00Z",
    ],
    [
      "2024-03",
      "America/New_York",
      31,
      "2024-03-01T05:00:00Z",
      "2024-04-01T04:00:00Z",
    ],
    [
      "2024-11",
      "America/New_York",
      30,
      "2024-11-01T04:00:00Z",
      "2024-12-01T05:00:00Z",
    ],
    [
      "2011-12",
      "Pacific/Apia",
      31,
      "2011-12-01T10:00:00Z",
      "2011-12-31T10:00:00Z",
    ],
  ])("builds %s in %s as contiguous half-open days", (month, zone, count, start, end) => {
    const result = TemporalCivilDate.month(month, zone);
    expect(result.range).toEqual(range(start, end));
    expect(result.days).toHaveLength(count);
    expect(result.days[0]?.range.start).toBe(result.range.start);
    expect(result.days.at(-1)?.range.end).toBe(result.range.end);
    for (const [index, day] of result.days.entries()) {
      expect(day.date).toBe(`${month}-${String(index + 1).padStart(2, "0")}`);
      expect(day.range.end).toBeGreaterThanOrEqual(day.range.start);
      if (index > 0)
        expect(day.range.start).toBe(result.days[index - 1]?.range.end);
    }
    expect(
      result.days.reduce(
        (total, day) => total + day.range.end - day.range.start,
        0,
      ),
    ).toBe(result.range.end - result.range.start);
  });

  it.each([
    [
      "2024-03-10",
      "America/New_York",
      "2024-03-10T05:00:00Z",
      "2024-03-11T04:00:00Z",
    ],
    [
      "2024-11-03",
      "America/New_York",
      "2024-11-03T04:00:00Z",
      "2024-11-04T05:00:00Z",
    ],
    [
      "2018-11-04",
      "America/Sao_Paulo",
      "2018-11-04T03:00:00Z",
      "2018-11-05T02:00:00Z",
    ],
    [
      "2020-11-01",
      "America/Havana",
      "2020-11-01T04:00:00Z",
      "2020-11-02T05:00:00Z",
    ],
    [
      "2011-12-30",
      "Pacific/Apia",
      "2011-12-30T10:00:00Z",
      "2011-12-30T10:00:00Z",
    ],
  ])("resolves the first valid instant for %s in %s", (date, zone, start, end) => {
    const result = TemporalCivilDate.month(date.slice(0, 7), zone);
    expect(result.days.find((day) => day.date === date)?.range).toEqual(
      range(start, end),
    );
  });

  it.each([
    ["2024-02-29T14:59:59.999Z", "Asia/Tokyo", "2024-02"],
    ["2024-02-29T15:00:00.000Z", "Asia/Tokyo", "2024-03"],
    ["2024-03-01T00:00:00.000Z", "America/New_York", "2024-02"],
    ["2024-12-31T15:00:00.000Z", "Asia/Tokyo", "2025-01"],
    ["2011-12-30T10:00:00.000Z", "Pacific/Apia", "2011-12"],
  ])("gets the civil month of %s in %s", (instant, zone, expected) => {
    expect(TemporalCivilDate.currentMonth(new Date(instant), zone)).toBe(
      expected,
    );
  });

  it.each([
    "",
    "2024-2",
    "2024-00",
    "2024-13",
    "2024-02-01",
    " 2024-02",
  ])("rejects invalid month %s", (month) => {
    expect(() => TemporalCivilDate.month(month, "UTC")).toThrow(
      expect.objectContaining({ code: "BROWSE_MONTH" }),
    );
  });

  it.each([
    "",
    "Not/AZone",
    "+09:00",
  ])("rejects non-IANA timezone %s", (zone) => {
    expect(() => TemporalCivilDate.month("2024-03", zone)).toThrow(
      expect.objectContaining({ code: "BROWSE_MONTH" }),
    );
    expect(() =>
      TemporalCivilDate.currentMonth(new Date("2024-03-01T00:00:00Z"), zone),
    ).toThrow(expect.objectContaining({ code: "BROWSE_ZONE" }));
  });
});
