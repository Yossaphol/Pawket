function getTodayBangkokDate() {
  return formatBangkokDate(new Date());
}

function getBangkokDateWithOffset(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return formatBangkokDate(date);
}

function formatBangkokDate(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year").value;
  const month = parts.find((part) => part.type === "month").value;
  const day = parts.find((part) => part.type === "day").value;

  return `${year}-${month}-${day}`;
}

function buildDateFromParts(year, month, day) {
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getCurrentBangkokYearMonth() {
  const today = getTodayBangkokDate();
  const [year, month] = today.split("-");

  return {
    year: Number(year),
    month: Number(month),
  };
}

module.exports = {
  getTodayBangkokDate,
  getBangkokDateWithOffset,
  formatBangkokDate,
  buildDateFromParts,
  getCurrentBangkokYearMonth,
};

