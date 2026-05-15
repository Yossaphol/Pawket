function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, "");
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeWalletWords(text, walletName) {
  let result = text;

  const words = [
    walletName,
    "เงินสด",
    "cash",
    "ธนาคาร",
    "bank",
    "บัญชี",
    "e-wallet",
    "ewallet",
    "วอลเล็ต",
    "wallet",
    "truemoney",
    "บัตรเครดิต",
    "credit card",
    "credit",
    "card",
  ];

  for (const word of words) {
    result = result.replace(new RegExp(escapeRegExp(word), "gi"), "");
  }

  return result.trim();
}

module.exports = {
  normalizeText,
  escapeRegExp,
  removeWalletWords,
};

