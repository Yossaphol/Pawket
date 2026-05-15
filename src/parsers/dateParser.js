const {
  getTodayBangkokDate,
  getBangkokDateWithOffset,
  getCurrentBangkokYearMonth,
  buildDateFromParts,
} = require("../utils/date");

function parseDateInfo(text) {
  let cleanedText = text;
  let date = getTodayBangkokDate();

  const isoMatch = cleanedText.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    date = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    cleanedText = cleanedText.replace(isoMatch[0], "").trim();
    return { date, cleanedText };
  }

  if (cleanedText.includes("เมื่อวาน")) {
    date = getBangkokDateWithOffset(-1);
    cleanedText = cleanedText.replace(/เมื่อวาน/g, "").trim();
    return { date, cleanedText };
  }

  if (cleanedText.includes("วันก่อน")) {
    date = getBangkokDateWithOffset(-2);
    cleanedText = cleanedText.replace(/วันก่อน/g, "").trim();
    return { date, cleanedText };
  }

  if (cleanedText.includes("วันนี้")) {
    date = getTodayBangkokDate();
    cleanedText = cleanedText.replace(/วันนี้/g, "").trim();
    return { date, cleanedText };
  }

  const dayMatch = cleanedText.match(/วันที่\s*(\d{1,2})/);
  if (dayMatch) {
    const { year, month } = getCurrentBangkokYearMonth();
    const day = Number(dayMatch[1]);
    const parsedDate = buildDateFromParts(year, month, day);

    if (parsedDate) {
      date = parsedDate;
    }

    cleanedText = cleanedText.replace(dayMatch[0], "").trim();
  }

  return { date, cleanedText };
}

module.exports = {
  parseDateInfo,
};

