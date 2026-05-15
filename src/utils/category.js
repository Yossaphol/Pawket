const { normalizeText } = require("./text");

function normalizeCategoryName(text) {
  const normalized = normalizeText(text);

  const categoryMap = {
    food: ["อาหาร", "กิน", "ข้าว", "กาแฟ", "food"],
    transport: ["เดินทาง", "รถ", "น้ำมัน", "transport"],
    shopping: ["ช้อปปิ้ง", "ช็อปปิ้ง", "shopping", "ซื้อของ"],
    bills: ["บิล", "ค่าใช้จ่ายประจำ", "ค่าไฟ", "ค่าน้ำ", "bills"],
    health: ["สุขภาพ", "ยา", "หมอ", "health"],
    entertainment: ["บันเทิง", "หนัง", "netflix", "entertainment"],
    other: ["อื่น", "อื่นๆ", "อื่น ๆ", "other"],
    income: ["รายรับ", "income"],
  };

  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some((keyword) => normalized.includes(normalizeText(keyword)))) {
      return category;
    }
  }

  return null;
}

function getCategoryLabel(category) {
  const labels = {
    food: "อาหาร",
    transport: "เดินทาง",
    shopping: "ช้อปปิ้ง",
    bills: "บิล/ค่าใช้จ่ายประจำ",
    health: "สุขภาพ",
    entertainment: "บันเทิง",
    income: "รายรับ",
    other: "อื่น ๆ",
  };

  return labels[category] || category;
}

function inferWalletType(name) {
  const normalized = normalizeText(name);

  if (normalized.includes("เงินสด") || normalized.includes("cash")) {
    return "cash";
  }

  if (
    normalized.includes("ธนาคาร") ||
    normalized.includes("bank") ||
    normalized.includes("บัญชี")
  ) {
    return "bank";
  }

  if (
    normalized.includes("wallet") ||
    normalized.includes("วอลเล็ต") ||
    normalized.includes("truemoney")
  ) {
    return "ewallet";
  }

  if (
    normalized.includes("บัตรเครดิต") ||
    normalized.includes("credit") ||
    normalized.includes("card")
  ) {
    return "credit_card";
  }

  return "other";
}

module.exports = {
  normalizeCategoryName,
  getCategoryLabel,
  inferWalletType,
};

