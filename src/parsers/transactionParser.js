const { parseDateInfo } = require("./dateParser");
const { detectWalletFromText } = require("../services/walletService");

async function parseTransaction(userId, text) {
  const dateInfo = parseDateInfo(text);
  const walletInfo = await detectWalletFromText(userId, dateInfo.cleanedText);

  const cleanText = walletInfo.cleanedText.trim();
  const amountMatch = cleanText.match(/\d+(\.\d+)?/);

  if (!amountMatch) {
    return null;
  }

  const amount = Number(amountMatch[0]);
  const lowerText = cleanText.toLowerCase();

  const incomeKeywords = [
    "เงินเดือน",
    "ได้เงิน",
    "รายได้",
    "โบนัส",
    "ฟรีแลนซ์",
    "salary",
  ];
  const foodKeywords = [
    "กิน",
    "ข้าว",
    "กาแฟ",
    "ชา",
    "อาหาร",
    "ขนม",
    "มื้อ",
    "ร้านอาหาร",
  ];
  const transportKeywords = [
    "น้ำมัน",
    "รถ",
    "แท็กซี่",
    "bts",
    "mrt",
    "grab",
    "วิน",
    "เดินทาง",
  ];
  const shoppingKeywords = [
    "ซื้อ",
    "shopee",
    "lazada",
    "เสื้อ",
    "ของ",
    "ช้อป",
    "shopping",
  ];
  const billKeywords = [
    "ค่าไฟ",
    "ค่าน้ำ",
    "เน็ต",
    "โทรศัพท์",
    "บิล",
    "บัตรเครดิต",
  ];
  const healthKeywords = ["ยา", "หมอ", "โรงพยาบาล", "คลินิก", "สุขภาพ"];
  const entertainmentKeywords = [
    "หนัง",
    "netflix",
    "spotify",
    "เกม",
    "คอนเสิร์ต",
  ];

  let type = "expense";
  let category = "other";

  if (incomeKeywords.some((word) => lowerText.includes(word))) {
    type = "income";
    category = "income";
  } else if (foodKeywords.some((word) => lowerText.includes(word))) {
    category = "food";
  } else if (transportKeywords.some((word) => lowerText.includes(word))) {
    category = "transport";
  } else if (shoppingKeywords.some((word) => lowerText.includes(word))) {
    category = "shopping";
  } else if (billKeywords.some((word) => lowerText.includes(word))) {
    category = "bills";
  } else if (healthKeywords.some((word) => lowerText.includes(word))) {
    category = "health";
  } else if (entertainmentKeywords.some((word) => lowerText.includes(word))) {
    category = "entertainment";
  }

  return {
    type,
    amount,
    category,
    note: cleanText.replace(amountMatch[0], "").trim(),
    rawText: text,
    transactionDate: dateInfo.date,
    walletId: walletInfo.wallet ? walletInfo.wallet.id : null,
    walletName: walletInfo.wallet ? walletInfo.wallet.name : null,
  };
}

module.exports = {
  parseTransaction,
};

