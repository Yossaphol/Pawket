const supabase = require("../supabase");
const { inferWalletType } = require("../utils/category");
const { normalizeText, removeWalletWords } = require("../utils/text");
const { formatMoney } = require("../utils/format");

async function getWalletsText(userId) {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return "ยังไม่มีกระเป๋าครับ";
  }

  const walletText = data
    .map((wallet, index) => {
      const defaultText = wallet.is_default ? " ค่าเริ่มต้น" : "";
      return `${index + 1}. ${wallet.name}${defaultText}\n   ยอด: ${formatMoney(
        wallet.balance
      )} บาท`;
    })
    .join("\n\n");

  return (
    `กระเป๋าเงินของคุณ 👛\n\n${walletText}\n\n` +
    `เพิ่มกระเป๋า: เพิ่มกระเป๋า KBank 5000\n` +
    `ตั้งค่าเริ่มต้น: ตั้งกระเป๋าหลัก เงินสด`
  );
}

async function createWallet(userId, wallet) {
  const existing = await findWalletByNameOrAlias(userId, wallet.name);

  if (existing) {
    return `มีกระเป๋า “${existing.name}” อยู่แล้วครับ`;
  }

  const { data, error } = await supabase
    .from("wallets")
    .insert({
      user_id: userId,
      name: wallet.name,
      type: inferWalletType(wallet.name),
      balance: wallet.balance,
      is_default: false,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return (
    `เพิ่มกระเป๋าแล้ว ✅\n\n` +
    `${data.name}\n` +
    `ยอดเริ่มต้น: ${formatMoney(data.balance)} บาท`
  );
}

async function setDefaultWallet(userId, walletName) {
  const wallet = await findWalletByNameOrAlias(userId, walletName);

  if (!wallet) {
    return `ไม่เจอกระเป๋าชื่อ “${walletName}” ครับ\n\nพิมพ์ “กระเป๋า” เพื่อดูรายการ`;
  }

  const { error: clearError } = await supabase
    .from("wallets")
    .update({
      is_default: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (clearError) {
    throw clearError;
  }

  const { error: setError } = await supabase
    .from("wallets")
    .update({
      is_default: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wallet.id);

  if (setError) {
    throw setError;
  }

  return `ตั้ง “${wallet.name}” เป็นกระเป๋าหลักแล้ว ✅`;
}

async function getDefaultWallet(userId) {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallbackError) {
    throw fallbackError;
  }

  return fallback;
}

async function detectWalletFromText(userId, text) {
  const wallet = await findWalletByNameOrAlias(userId, text);

  if (!wallet) {
    return {
      wallet: null,
      cleanedText: text,
    };
  }

  const cleanedText = removeWalletWords(text, wallet.name);

  return {
    wallet,
    cleanedText,
  };
}

async function findWalletByNameOrAlias(userId, input) {
  const { data: wallets, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const normalizedInput = normalizeText(input);

  for (const wallet of wallets || []) {
    if (normalizedInput.includes(normalizeText(wallet.name))) {
      return wallet;
    }
  }

  const aliases = [
    { keys: ["เงินสด", "cash"], type: "cash" },
    { keys: ["ธนาคาร", "bank", "บัญชี"], type: "bank" },
    { keys: ["e-wallet", "ewallet", "วอลเล็ต", "wallet", "truemoney"], type: "ewallet" },
    { keys: ["บัตรเครดิต", "credit", "credit card", "card"], type: "credit_card" },
  ];

  for (const alias of aliases) {
    if (alias.keys.some((key) => normalizedInput.includes(normalizeText(key)))) {
      const found = (wallets || []).find((wallet) => wallet.type === alias.type);
      if (found) return found;
    }
  }

  return null;
}

async function getWalletMap(userId) {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const map = {};

  for (const wallet of data || []) {
    map[wallet.id] = wallet.name;
  }

  return map;
}

async function updateWalletBalance(walletId, delta) {
  const { data: wallet, error: findError } = await supabase
    .from("wallets")
    .select("*")
    .eq("id", walletId)
    .single();

  if (findError) {
    throw findError;
  }

  const newBalance = Number(wallet.balance) + Number(delta);

  const { error: updateError } = await supabase
    .from("wallets")
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", walletId);

  if (updateError) {
    throw updateError;
  }
}

module.exports = {
  getWalletsText,
  createWallet,
  setDefaultWallet,
  getDefaultWallet,
  detectWalletFromText,
  findWalletByNameOrAlias,
  getWalletMap,
  updateWalletBalance,
};

