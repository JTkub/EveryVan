const partsInBangkok = (
  value: Date,
  options: Intl.DateTimeFormatOptions,
) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    ...options,
  }).formatToParts(value);
  return (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
};

export const bangkokDateInput = (value = new Date()) => {
  const part = partsInBangkok(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const bangkokDateTimeInput = (value = new Date()) => {
  const part = partsInBangkok(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
};

export const thaiDate = (value?: string) =>
  value
    ? new Date(`${value}T00:00:00+07:00`).toLocaleDateString("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "วันนี้";

export const thaiTodayLong = () =>
  new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

