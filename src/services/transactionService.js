const supabase = require("../supabase");
const { getTodayBangkokDate } = require("../utils/date");
const { formatMoney } = require("../utils/format");
const { getCategoryLabel } = require("../utils/category");
const {
  getDefaultWallet,
  updateWalletBalance,
  findWalletByNameOrAlias,
  getWalletMap,
} = require("./walletService");
const { calculateSummary } = require("./summaryService");

async function saveTransaction(userId, transaction) {
  const wallet = transaction.walletId
    ? { id: transaction.walletId, name: transaction.walletName }
    : await getDefaultWallet(userId);

  const walletId = wallet ? wallet.id : null;

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      wallet_id: walletId,
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      note: transaction.note,
      raw_text: transaction.rawText,
      transaction_date: transaction.transactionDate || getTodayBangkokDate(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (walletId) {
    const impact =
      transaction.type === "income"
        ? Number(transaction.amount)
        : -Number(transaction.amount);

    await updateWalletBalance(walletId, impact);
  }

  return {
    ...data,
    walletName: wallet ? wallet.name : null,
  };
}

async function deleteLatestTransaction(userId) {
  const { data: latest, error: findError } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (!latest) {
    return "ยังไม่มีรายการให้ลบครับ";
  }

  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .eq("id", latest.id);

  if (deleteError) {
    throw deleteError;
  }

  if (latest.wallet_id) {
    const reverseImpact =
      latest.type === "income" ? -Number(latest.amount) : Number(latest.amount);

    await updateWalletBalance(latest.wallet_id, reverseImpact);
  }

  return (
    `ลบรายการล่าสุดแล้ว ✅\n\n` +
    `${getCategoryLabel(latest.category)} ${formatMoney(latest.amount)} บาท\n` +
    `วันที่: ${latest.transaction_date}\n` +
    `โน้ต: ${latest.note || "-"}`
  );
}

async function deleteTransactionsByScope(userId, scope) {
  let query = supabase.from("transactions").select("*").eq("user_id", userId);

  let scopeLabel = "";
  let startDate = null;
  let endDate = null;

  if (scope === "today") {
    const today = getTodayBangkokDate();
    scopeLabel = "วันนี้";
    query = query.eq("transaction_date", today);
  } else if (scope === "month") {
    const today = getTodayBangkokDate();
    const [year, month] = today.split("-");

    startDate = `${year}-${month}-01`;
    endDate = today;
    scopeLabel = "เดือนนี้";

    query = query
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);
  } else if (scope === "all") {
    scopeLabel = "ทั้งหมด";
  } else {
    return "ไม่รู้จักช่วงข้อมูลที่ต้องการลบครับ";
  }

  const { data: transactions, error: findError } = await query;

  if (findError) {
    throw findError;
  }

  if (!transactions || transactions.length === 0) {
    return `ไม่มีข้อมูล${scopeLabel}ให้ลบครับ`;
  }

  const summary = calculateSummary(transactions);
  const ids = transactions.map((item) => item.id);

  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .eq("user_id", userId)
    .in("id", ids);

  if (deleteError) {
    throw deleteError;
  }

  await reverseWalletImpactForTransactions(transactions);

  return (
    `ลบข้อมูล${scopeLabel}แล้ว ✅\n\n` +
    `จำนวนรายการที่ลบ: ${transactions.length} รายการ\n` +
    `รายรับที่ลบ: ${formatMoney(summary.totalIncome)} บาท\n` +
    `รายจ่ายที่ลบ: ${formatMoney(summary.totalExpense)} บาท\n\n` +
    `ยอดกระเป๋าถูกปรับกลับแล้ว`
  );
}

async function reverseWalletImpactForTransactions(transactions) {
  const walletDeltas = {};

  for (const item of transactions) {
    if (!item.wallet_id) continue;

    const reverseImpact =
      item.type === "income" ? -Number(item.amount) : Number(item.amount);

    walletDeltas[item.wallet_id] =
      (walletDeltas[item.wallet_id] || 0) + reverseImpact;
  }

  for (const [walletId, delta] of Object.entries(walletDeltas)) {
    await updateWalletBalance(walletId, delta);
  }
}

async function editLatestTransaction(userId, edit) {
  const { data: latest, error: findError } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (!latest) {
    return "ยังไม่มีรายการให้แก้ครับ";
  }

  const updateFields = {
    updated_at: new Date().toISOString(),
  };

  if (edit.amount !== undefined) {
    updateFields.amount = edit.amount;
  }

  if (edit.category !== undefined) {
    updateFields.category = edit.category;
  }

  if (edit.transactionDate !== undefined) {
    updateFields.transaction_date = edit.transactionDate;
  }

  if (edit.note !== undefined) {
    updateFields.note = edit.note;
  }

  let newWallet = null;

  if (edit.walletName !== undefined) {
    newWallet = await findWalletByNameOrAlias(userId, edit.walletName);

    if (!newWallet) {
      return `ไม่เจอกระเป๋าชื่อ “${edit.walletName}” ครับ\n\nพิมพ์ “กระเป๋า” เพื่อดูรายการกระเป๋า`;
    }

    updateFields.wallet_id = newWallet.id;
  }

  const { data: updated, error: updateError } = await supabase
    .from("transactions")
    .update(updateFields)
    .eq("id", latest.id)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  const oldWalletId = latest.wallet_id;
  const newWalletId =
    updateFields.wallet_id !== undefined ? updateFields.wallet_id : latest.wallet_id;

  const oldAmount = Number(latest.amount);
  const newAmount =
    updateFields.amount !== undefined ? Number(updateFields.amount) : oldAmount;

  const balanceAffected =
    oldAmount !== newAmount || oldWalletId !== newWalletId;

  if (balanceAffected) {
    if (oldWalletId) {
      const oldImpact = latest.type === "income" ? oldAmount : -oldAmount;
      await updateWalletBalance(oldWalletId, -oldImpact);
    }

    if (newWalletId) {
      const newImpact = updated.type === "income" ? newAmount : -newAmount;
      await updateWalletBalance(newWalletId, newImpact);
    }
  }

  return (
    `แก้รายการล่าสุดแล้ว ✅\n\n` +
    `ประเภท: ${updated.type}\n` +
    `หมวด: ${getCategoryLabel(updated.category)}\n` +
    `จำนวน: ${formatMoney(updated.amount)} บาท\n` +
    `วันที่: ${updated.transaction_date}\n` +
    `โน้ต: ${updated.note || "-"}`
  );
}

async function getLatestTransactions(userId) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return "ยังไม่มีรายการบันทึกครับ";
  }

  const walletMap = await getWalletMap(userId);

  const listText = data
    .map((item, index) => {
      const sign = item.type === "income" ? "+" : "-";
      const walletName = item.wallet_id ? walletMap[item.wallet_id] || "-" : "-";

      return (
        `${index + 1}. ${sign}${formatMoney(item.amount)} บาท ` +
        `${getCategoryLabel(item.category)}\n` +
        `   ${item.note || "-"} | ${item.transaction_date} | ${walletName}`
      );
    })
    .join("\n");

  return (
    `รายการล่าสุด 🧾\n\n${listText}\n\n` +
    `คำสั่งที่ใช้ได้:\n` +
    `ลบล่าสุด\n` +
    `ลบข้อมูลวันนี้\n` +
    `ลบข้อมูลเดือนนี้\n` +
    `ลบข้อมูลทั้งหมด\n` +
    `ยืนยันลบข้อมูลทั้งหมด\n` +
    `แก้ล่าสุด 120\n` +
    `แก้หมวดล่าสุด อาหาร\n` +
    `แก้วันที่ล่าสุด เมื่อวาน`
  );
}

module.exports = {
  saveTransaction,
  deleteLatestTransaction,
  deleteTransactionsByScope,
  reverseWalletImpactForTransactions,
  editLatestTransaction,
  getLatestTransactions,
};

