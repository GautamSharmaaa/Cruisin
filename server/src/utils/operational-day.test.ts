import { it, expect } from "vitest";
import { operationalDay } from "./operational-day.js";
it("uses the local calendar day in Kolkata across UTC midnight", () => {
  const r = operationalDay(new Date("2026-11-04T23:00:00Z"), "Asia/Kolkata");
  expect(r.from.toISOString()).toBe("2026-11-04T18:30:00.000Z");
  expect(r.to.toISOString()).toBe("2026-11-05T18:30:00.000Z");
});
it("handles a 23-hour DST transition without inventing a fixed day length", () => {
  const r = operationalDay(
    new Date("2026-03-08T15:00:00Z"),
    "America/New_York",
  );
  expect(r.to.getTime() - r.from.getTime()).toBe(23 * 3600000);
});
it("rejects invalid timezone input", () => {
  expect(() => operationalDay(new Date(), "invalid/zone")).toThrow();
});
