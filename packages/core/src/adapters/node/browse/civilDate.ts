import { Temporal } from "@js-temporal/polyfill";
import type {
  CivilDatePort,
  CivilRange,
} from "@repo/core/application/browse/ports";
import { BusinessRuleError } from "@repo/core/domain/error";

function dayStart(date: Temporal.PlainDate, zone: string) {
  return date.toZonedDateTime({ timeZone: zone }).epochMilliseconds;
}

function validateZone(zone: string): void {
  if (/^[+\-\u2212]/.test(zone))
    throw new RangeError("Expected a named time zone");
  new Intl.DateTimeFormat("en", { timeZone: zone });
}

export const TemporalCivilDate: CivilDatePort = {
  currentMonth(now, zone) {
    try {
      validateZone(zone);
      return Temporal.Instant.fromEpochMilliseconds(now.getTime())
        .toZonedDateTimeISO(zone)
        .toPlainDate()
        .toPlainYearMonth()
        .toString();
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      throw new BusinessRuleError(
        "BROWSE_ZONE",
        "有効なタイムゾーンを選んでください。",
      );
    }
  },
  month(month, zone) {
    try {
      validateZone(zone);
      if (!/^\d{4}-\d{2}$/.test(month))
        throw new RangeError("Invalid civil month");
      const first = Temporal.PlainYearMonth.from(month).toPlainDate({ day: 1 });
      const after = first.add({ months: 1 });
      const days: { date: string; range: CivilRange }[] = [];
      for (
        let date = first;
        Temporal.PlainDate.compare(date, after) < 0;
        date = date.add({ days: 1 })
      )
        days.push({
          date: date.toString(),
          range: {
            start: dayStart(date, zone),
            end: dayStart(date.add({ days: 1 }), zone),
          },
        });
      return {
        range: { start: dayStart(first, zone), end: dayStart(after, zone) },
        days,
      };
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      throw new BusinessRuleError(
        "BROWSE_MONTH",
        "有効な年月とタイムゾーンを選んでください。",
      );
    }
  },
};
