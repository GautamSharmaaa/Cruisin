export const operationalDay = (
  now: Date,
  timeZone: string,
): { from: Date; to: Date } => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = (date: Date) =>
    Object.fromEntries(
      formatter
        .formatToParts(date)
        .filter((p) => p.type !== "literal")
        .map((p) => [p.type, Number(p.value)]),
    );
  const offset = (instant: number): number => {
    const p = parts(new Date(instant));
    return (
      Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
      Math.floor(instant / 1000) * 1000
    );
  };
  const p = parts(now);
  const midnight = Date.UTC(p.year, p.month - 1, p.day);
  const utc = (wall: number): Date => {
    let guess = wall - offset(wall);
    guess = wall - offset(guess);
    return new Date(guess);
  };
  return { from: utc(midnight), to: utc(midnight + 86400000) };
};
