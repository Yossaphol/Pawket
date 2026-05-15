require("dotenv").config();

const express = require("express");
const line = require("@line/bot-sdk");
const supabase = require("./supabase");

const app = express();

const requiredEnv = [
  "LINE_CHANNEL_SECRET",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
}

const client = line.LineBotClient.fromChannelAccessToken({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

app.get("/", (req, res) => {
  res.send("LINE Finance Bot is running");
});

app.post(
  "/webhook",
  line.middleware({
    channelSecret: process.env.LINE_CHANNEL_SECRET,
  }),
  async (req, res) => {
    try {
      const events = req.body.events || [];

      await Promise.all(events.map(handleEvent));

      res.status(200).end();
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).end();
    }
  }
);

async function handleEvent(event) {
  if (event.type !== "message") return;
  if (event.message.type !== "text") return;

  const userText = event.message.text.trim();
  const lowerText = userText.toLowerCase();

  const user = await getOrCreateUser(event.source.userId);
  await ensureDefaultWallets(user.id);

  if (
    userText === "สรุปวันนี้" ||
    userText === "สรุปวันนี่" ||
    lowerText === "today"
  ) {
    const summaryText = await getDailySummary(user.id);
    return replyText(event.replyToken, summaryText);
  }

  if (
    userText === "สรุปเดือนนี้" ||
    userText === "สรุปเดือน" ||
    lowerText === "month"
  ) {
    const summaryText = await getMonthlySummary(user.id);
    return replyText(event.replyToken, summaryText);
  }

  if (
    userText === "ล่าสุด" ||
    userText === "รายการล่าสุด" ||
    userText === "ประวัติล่าสุด" ||
    lowerText === "latest"
  ) {
    const latestText = await getLatestTransactions(user.id);
    return replyText(event.replyToken, latestText);
  }

  if (
    userText === "ลบล่าสุด" ||
    userText === "ลบรายการล่าสุด" ||
    lowerText === "delete latest"
  ) {
    const deletedText = await deleteLatestTransaction(user.id);
    return replyText(event.replyToken, deletedText);
  }

  const editLatest = parseEditLatestCommand(userText);
  if (editLatest) {
    const editText = await editLatestTransaction(user.id, editLatest);
    return replyText(event.replyToken, editText);
  }

  if (
    userText === "กระเป๋า" ||
    userText === "ดูกระเป๋า" ||
    userText === "wallets" ||
    lowerText === "wallet"
  ) {
    const walletsText = await getWalletsText(user.id);
    return replyText(event.replyToken, walletsText);
  }

  const walletCreation = parseWalletCreationCommand(userText);
  if (walletCreation) {
    const walletText = await createWallet(user.id, walletCreation);
    return replyText(event.replyToken, walletText);
  }

  const defaultWallet = parseDefaultWalletCommand(userText);
  if (defaultWallet) {
    const walletText = await setDefaultWallet(user.id, defaultWallet.name);
    return replyText(event.replyToken, walletText);
  }

  const budgetAmount = parseMonthlyBudgetCommand(userText);
  if (budgetAmount !== null) {
    const budgetText = await setMonthlyBudget(user.id, budgetAmount);
    return replyText(event.replyToken, budgetText);
  }

  if (
    userText === "งบวันนี้" ||
    userText === "ใช้ได้วันนี้" ||
    lowerText === "daily budget"
  ) {
    const dailyBudgetText = await getDailyBudget(user.id);
    return replyText(event.replyToken, dailyBudgetText);
  }

  const categoryBudget = parseCategoryBudgetCommand(userText);
  if (categoryBudget) {
    const categoryBudgetText = await setCategoryBudget(user.id, categoryBudget);
    return replyText(event.replyToken, categoryBudgetText);
  }

  if (
    userText === "งบหมวด" ||
    userText === "งบแต่ละหมวด" ||
    lowerText === "category budgets"
  ) {
    const categoryBudgetsText = await getCategoryBudgetsText(user.id);
    return replyText(event.replyToken, categoryBudgetsText);
  }

  const categoryBudgetView = parseCategoryBudgetViewCommand(userText);
  if (categoryBudgetView) {
    const categoryBudgetText = await getCategoryBudgetText(
      user.id,
      categoryBudgetView.category
    );
    return replyText(event.replyToken, categoryBudgetText);
  }

  const goalCreation = parseGoalCreationCommand(userText);
  if (goalCreation) {
    const goalText = await createGoal(user.id, goalCreation);
    return replyText(event.replyToken, goalText);
  }

  const goalSaving = parseGoalSavingCommand(userText);
  if (goalSaving) {
    const savingText = await addGoalSaving(user.id, goalSaving);
    return replyText(event.replyToken, savingText);
  }

  if (
    userText === "เป้าหมาย" ||
    userText === "ดูเป้าหมาย" ||
    lowerText === "goals"
  ) {
    const goalsText = await getGoals(user.id);
    return replyText(event.replyToken, goalsText);
  }

  const transaction = await parseTransaction(user.id, userText);

  if (!transaction) {
    return replyText(
      event.replyToken,
      "ลองพิมพ์แบบนี้ได้เลย:\n\n" +
        "กินข้าว 80\n" +
        "กาแฟ 65 เมื่อวาน\n" +
        "เงินสด กินข้าว 80\n" +
        "ธนาคาร เงินเดือน 18000\n\n" +
        "คำสั่งที่ใช้ได้:\n" +
        "สรุปวันนี้\n" +
        "สรุปเดือนนี้\n" +
        "ล่าสุด\n" +
        "ลบล่าสุด\n" +
        "แก้ล่าสุด 120\n" +
        "แก้หมวดล่าสุด อาหาร\n" +
        "แก้วันที่ล่าสุด เมื่อวาน\n" +
        "กระเป๋า\n" +
        "เพิ่มกระเป๋า KBank 5000\n" +
        "ตั้งกระเป๋าหลัก เงินสด\n" +
        "ตั้งงบเดือนนี้ 12000\n" +
        "งบวันนี้\n" +
        "ตั้งงบอาหาร 5000\n" +
        "งบหมวด\n" +
        "ตั้งเป้า iPhone 45000\n" +
        "ออม iPhone 1000\n" +
        "เป้าหมาย"
    );
  }

  const saved = await saveTransaction(user.id, transaction);

  return replyText(
    event.replyToken,
    `บันทึกแล้ว ✅\n\n` +
      `ประเภท: ${transaction.type}\n` +
      `หมวด: ${getCategoryLabel(transaction.category)}\n` +
      `จำนวน: ${formatMoney(transaction.amount)} บาท\n` +
      `วันที่: ${transaction.transactionDate}\n` +
      `กระเป๋า: ${saved.walletName || "-"}`
  );
}

function replyText(replyToken, text) {
  return client.replyMessage({
    replyToken,
    messages: [
      {
        type: "text",
        text,
      },
    ],
  });
}

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

function parseMonthlyBudgetCommand(text) {
  const match = text.match(
    /^(?:ตั้งงบเดือนนี้|ตั้งงบรวมเดือนนี้|budget)\s*(\d+(?:\.\d+)?)/i
  );
  if (!match) return null;
  return Number(match[1]);
}

function parseCategoryBudgetCommand(text) {
  let match = text.match(
    /^(?:ตั้งงบหมวด)\s+(.+?)\s+(\d+(?:\.\d+)?)$/i
  );

  if (!match) {
    match = text.match(/^ตั้งงบ(.+?)\s+(\d+(?:\.\d+)?)$/i);
  }

  if (!match) return null;

  const category = normalizeCategoryName(match[1].trim());
  if (!category || category === "income") return null;

  return {
    category,
    amount: Number(match[2]),
  };
}

function parseCategoryBudgetViewCommand(text) {
  const match = text.match(/^งบ(.+)$/i);
  if (!match) return null;

  const rawCategory = match[1].trim();

  if (rawCategory === "วันนี้" || rawCategory === "เดือนนี้") {
    return null;
  }

  const category = normalizeCategoryName(rawCategory);
  if (!category || category === "income") return null;

  return { category };
}

function parseGoalCreationCommand(text) {
  const match = text.match(
    /^(?:ตั้งเป้า|ตั้งเป้าหมาย|goal)\s+(.+?)\s+(\d+(?:\.\d+)?)$/i
  );
  if (!match) return null;

  return {
    name: match[1].trim(),
    targetAmount: Number(match[2]),
  };
}

function parseGoalSavingCommand(text) {
  const match = text.match(
    /^(?:ออม|เก็บเงิน|save)\s+(.+?)\s+(\d+(?:\.\d+)?)$/i
  );
  if (!match) return null;

  return {
    name: match[1].trim(),
    amount: Number(match[2]),
  };
}

function parseEditLatestCommand(text) {
  let match = text.match(
    /^(?:แก้ล่าสุด|แก้จำนวนล่าสุด|edit latest)\s+(\d+(?:\.\d+)?)$/i
  );

  if (match) {
    return {
      type: "edit_latest",
      amount: Number(match[1]),
    };
  }

  match = text.match(/^(?:แก้หมวดล่าสุด|เปลี่ยนหมวดล่าสุด)\s+(.+)$/i);
  if (match) {
    const category = normalizeCategoryName(match[1].trim());
    if (!category) return null;

    return {
      type: "edit_latest",
      category,
    };
  }

  match = text.match(/^(?:แก้วันที่ล่าสุด|เปลี่ยนวันที่ล่าสุด)\s+(.+)$/i);
  if (match) {
    const dateInfo = parseDateInfo(match[1].trim());

    return {
      type: "edit_latest",
      transactionDate: dateInfo.date,
    };
  }

  match = text.match(/^(?:แก้โน้ตล่าสุด|เปลี่ยนโน้ตล่าสุด)\s+(.+)$/i);
  if (match) {
    return {
      type: "edit_latest",
      note: match[1].trim(),
    };
  }

  match = text.match(/^(?:แก้กระเป๋าล่าสุด|เปลี่ยนกระเป๋าล่าสุด)\s+(.+)$/i);
  if (match) {
    return {
      type: "edit_latest",
      walletName: match[1].trim(),
    };
  }

  match = text.match(
    /^(?:แก้ล่าสุด|edit latest)\s+(.+?)\s+(\d+(?:\.\d+)?)$/i
  );
  if (match) {
    const category = normalizeCategoryName(match[1].trim());

    return {
      type: "edit_latest",
      category: category || undefined,
      amount: Number(match[2]),
    };
  }

  return null;
}

function parseWalletCreationCommand(text) {
  const match = text.match(
    /^(?:เพิ่มกระเป๋า|สร้างกระเป๋า|add wallet)\s+(.+?)(?:\s+(-?\d+(?:\.\d+)?))?$/i
  );

  if (!match) return null;

  return {
    name: match[1].trim(),
    balance: match[2] ? Number(match[2]) : 0,
  };
}

function parseDefaultWalletCommand(text) {
  const match = text.match(
    /^(?:ตั้งกระเป๋าหลัก|ตั้งค่าเริ่มต้น|default wallet)\s+(.+)$/i
  );

  if (!match) return null;

  return {
    name: match[1].trim(),
  };
}

async function getOrCreateUser(lineUserId) {
  const { data: existingUser, error: findError } = await supabase
    .from("users")
    .select("*")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existingUser) {
    return existingUser;
  }

  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      line_user_id: lineUserId,
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return newUser;
}

async function ensureDefaultWallets(userId) {
  const { data: existingWallets, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  if (existingWallets && existingWallets.length > 0) {
    return;
  }

  const { error: insertError } = await supabase.from("wallets").insert([
    {
      user_id: userId,
      name: "เงินสด",
      type: "cash",
      balance: 0,
      is_default: true,
    },
    {
      user_id: userId,
      name: "ธนาคาร",
      type: "bank",
      balance: 0,
      is_default: false,
    },
    {
      user_id: userId,
      name: "E-Wallet",
      type: "ewallet",
      balance: 0,
      is_default: false,
    },
    {
      user_id: userId,
      name: "บัตรเครดิต",
      type: "credit_card",
      balance: 0,
      is_default: false,
    },
  ]);

  if (insertError) {
    throw insertError;
  }
}

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
    `แก้ล่าสุด 120\n` +
    `แก้หมวดล่าสุด อาหาร\n` +
    `แก้วันที่ล่าสุด เมื่อวาน`
  );
}

async function getDailySummary(userId) {
  const today = getTodayBangkokDate();

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("transaction_date", today);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return "วันนี้ยังไม่มีรายการบันทึกครับ";
  }

  const summary = calculateSummary(data);

  return (
    `สรุปวันนี้ 📊\n\n` +
    `รายรับ: ${formatMoney(summary.totalIncome)} บาท\n` +
    `รายจ่าย: ${formatMoney(summary.totalExpense)} บาท\n` +
    `คงเหลือสุทธิ: ${formatMoney(summary.totalIncome - summary.totalExpense)} บาท\n\n` +
    `แยกตามหมวด:\n${summary.categoryText}`
  );
}

async function getMonthlySummary(userId) {
  const today = getTodayBangkokDate();
  const [year, month, day] = today.split("-");

  const startDate = `${year}-${month}-01`;
  const endDate = today;

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .gte("transaction_date", startDate)
    .lte("transaction_date", endDate);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return "เดือนนี้ยังไม่มีรายการบันทึกครับ";
  }

  const summary = calculateSummary(data);
  const daysPassed = Number(day);
  const dailyAverage = summary.totalExpense / daysPassed;
  const categoryBudgetWarnings = await getCategoryBudgetWarnings(userId, data);

  return (
    `สรุปเดือนนี้ 📆\n\n` +
    `จำนวนรายการ: ${data.length} รายการ\n` +
    `รายรับรวม: ${formatMoney(summary.totalIncome)} บาท\n` +
    `รายจ่ายรวม: ${formatMoney(summary.totalExpense)} บาท\n` +
    `คงเหลือสุทธิ: ${formatMoney(summary.totalIncome - summary.totalExpense)} บาท\n` +
    `เฉลี่ยใช้วันละ: ${formatMoney(dailyAverage)} บาท\n` +
    `หมวดที่ใช้เยอะสุด: ${summary.topCategoryText}\n\n` +
    `รายจ่ายแยกตามหมวด:\n${summary.categoryText}` +
    (categoryBudgetWarnings ? `\n\nงบหมวด:\n${categoryBudgetWarnings}` : "")
  );
}

function calculateSummary(transactions) {
  const totalExpense = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalIncome = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const categoryTotals = {};

  for (const item of transactions) {
    if (item.type !== "expense") continue;

    categoryTotals[item.category] =
      (categoryTotals[item.category] || 0) + Number(item.amount);
  }

  const sortedCategories = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1]
  );

  const categoryText =
    sortedCategories
      .map(
        ([category, amount]) =>
          `- ${getCategoryLabel(category)}: ${formatMoney(amount)} บาท`
      )
      .join("\n") || "- ไม่มีรายจ่าย";

  const topCategoryText = sortedCategories[0]
    ? `${getCategoryLabel(sortedCategories[0][0])} ${formatMoney(
        sortedCategories[0][1]
      )} บาท`
    : "ไม่มีรายจ่าย";

  return {
    totalExpense,
    totalIncome,
    categoryText,
    topCategoryText,
  };
}

async function setMonthlyBudget(userId, amount) {
  const { year, month } = getCurrentBangkokYearMonth();

  const { data, error } = await supabase
    .from("monthly_budgets")
    .upsert(
      {
        user_id: userId,
        year,
        month,
        total_budget: amount,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,year,month",
      }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return (
    `ตั้งงบเดือนนี้แล้ว ✅\n\n` +
    `งบรวม: ${formatMoney(data.total_budget)} บาท\n\n` +
    `พิมพ์ “งบวันนี้” เพื่อดูว่าวันนี้ใช้ได้อีกเท่าไหร่`
  );
}

async function getDailyBudget(userId) {
  const today = getTodayBangkokDate();
  const [yearText, monthText, dayText] = today.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const { data: budget, error: budgetError } = await supabase
    .from("monthly_budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (budgetError) {
    throw budgetError;
  }

  if (!budget) {
    return "ยังไม่ได้ตั้งงบเดือนนี้ครับ\n\nลองพิมพ์: ตั้งงบเดือนนี้ 12000";
  }

  const startDate = `${yearText}-${monthText}-01`;

  const { data: transactions, error: transactionError } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("transaction_date", startDate)
    .lte("transaction_date", today);

  if (transactionError) {
    throw transactionError;
  }

  const spent = (transactions || []).reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  const totalBudget = Number(budget.total_budget);
  const remainingBudget = totalBudget - spent;
  const daysInMonth = new Date(year, month, 0).getDate();
  const remainingDays = Math.max(daysInMonth - day + 1, 1);
  const dailyBudget = remainingBudget / remainingDays;
  const usedPercent = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;

  return (
    `งบวันนี้ 💰\n\n` +
    `วันนี้ใช้ได้ประมาณ: ${formatMoney(Math.max(dailyBudget, 0))} บาท\n\n` +
    `งบเดือนนี้: ${formatMoney(totalBudget)} บาท\n` +
    `ใช้ไปแล้ว: ${formatMoney(spent)} บาท (${usedPercent.toFixed(1)}%)\n` +
    `เหลือทั้งเดือน: ${formatMoney(remainingBudget)} บาท\n` +
    `เหลืออีก: ${remainingDays} วัน`
  );
}

async function setCategoryBudget(userId, categoryBudget) {
  const { year, month } = getCurrentBangkokYearMonth();

  const { data, error } = await supabase
    .from("category_budgets")
    .upsert(
      {
        user_id: userId,
        year,
        month,
        category: categoryBudget.category,
        budget_amount: categoryBudget.amount,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,year,month,category",
      }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return (
    `ตั้งงบหมวดแล้ว ✅\n\n` +
    `${getCategoryLabel(data.category)}: ${formatMoney(
      data.budget_amount
    )} บาท\n\n` +
    `พิมพ์ “งบ${getCategoryLabel(data.category)}” เพื่อดูสถานะหมวดนี้`
  );
}

async function getCategoryBudgetsText(userId) {
  const today = getTodayBangkokDate();
  const [yearText, monthText] = today.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  const { data: budgets, error } = await supabase
    .from("category_budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .order("category", { ascending: true });

  if (error) {
    throw error;
  }

  if (!budgets || budgets.length === 0) {
    return "ยังไม่ได้ตั้งงบรายหมวดครับ\n\nลองพิมพ์: ตั้งงบอาหาร 5000";
  }

  const startDate = `${yearText}-${monthText}-01`;

  const { data: transactions, error: transactionError } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("transaction_date", startDate)
    .lte("transaction_date", today);

  if (transactionError) {
    throw transactionError;
  }

  const spentByCategory = getSpentByCategory(transactions || []);

  const text = budgets
    .map((budget) => {
      const spent = spentByCategory[budget.category] || 0;
      const amount = Number(budget.budget_amount);
      const remaining = amount - spent;
      const percent = amount > 0 ? (spent / amount) * 100 : 0;

      return (
        `- ${getCategoryLabel(budget.category)}: ${formatMoney(spent)} / ${formatMoney(
          amount
        )} บาท (${percent.toFixed(1)}%) เหลือ ${formatMoney(remaining)} บาท`
      );
    })
    .join("\n");

  return `งบรายหมวดเดือนนี้ 📂\n\n${text}`;
}

async function getCategoryBudgetText(userId, category) {
  const today = getTodayBangkokDate();
  const [yearText, monthText] = today.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const startDate = `${yearText}-${monthText}-01`;

  const { data: budget, error } = await supabase
    .from("category_budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .eq("category", category)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!budget) {
    return `ยังไม่ได้ตั้งงบ${getCategoryLabel(
      category
    )}ครับ\n\nลองพิมพ์: ตั้งงบ${getCategoryLabel(category)} 5000`;
  }

  const { data: transactions, error: transactionError } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "expense")
    .eq("category", category)
    .gte("transaction_date", startDate)
    .lte("transaction_date", today);

  if (transactionError) {
    throw transactionError;
  }

  const spent = (transactions || []).reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  const amount = Number(budget.budget_amount);
  const remaining = amount - spent;
  const percent = amount > 0 ? (spent / amount) * 100 : 0;

  return (
    `งบ${getCategoryLabel(category)} 📂\n\n` +
    `งบที่ตั้งไว้: ${formatMoney(amount)} บาท\n` +
    `ใช้ไปแล้ว: ${formatMoney(spent)} บาท (${percent.toFixed(1)}%)\n` +
    `เหลือ: ${formatMoney(remaining)} บาท`
  );
}

async function getCategoryBudgetWarnings(userId, transactions) {
  const { year, month } = getCurrentBangkokYearMonth();

  const { data: budgets, error } = await supabase
    .from("category_budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month);

  if (error) {
    throw error;
  }

  if (!budgets || budgets.length === 0) {
    return "";
  }

  const spentByCategory = getSpentByCategory(transactions || []);

  return budgets
    .map((budget) => {
      const spent = spentByCategory[budget.category] || 0;
      const amount = Number(budget.budget_amount);
      const percent = amount > 0 ? (spent / amount) * 100 : 0;

      if (percent >= 100) {
        return `- ${getCategoryLabel(budget.category)} เกินงบแล้ว (${percent.toFixed(
          1
        )}%)`;
      }

      if (percent >= 80) {
        return `- ${getCategoryLabel(budget.category)} ใช้ไป ${percent.toFixed(
          1
        )}% แล้ว`;
      }

      return `- ${getCategoryLabel(budget.category)} ใช้ไป ${percent.toFixed(1)}%`;
    })
    .join("\n");
}

function getSpentByCategory(transactions) {
  const result = {};

  for (const item of transactions) {
    result[item.category] = (result[item.category] || 0) + Number(item.amount);
  }

  return result;
}

async function createGoal(userId, goal) {
  const { data, error } = await supabase
    .from("goals")
    .insert({
      user_id: userId,
      name: goal.name,
      target_amount: goal.targetAmount,
      current_amount: 0,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return (
    `สร้างเป้าหมายแล้ว 🎯\n\n` +
    `${data.name}\n` +
    `เป้าหมาย: ${formatMoney(data.target_amount)} บาท\n` +
    `ออมแล้ว: 0 บาท\n\n` +
    `ถ้าจะเพิ่มเงินออม พิมพ์:\n` +
    `ออม ${data.name} 1000`
  );
}

async function addGoalSaving(userId, saving) {
  const { data: goal, error: findError } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .ilike("name", `%${saving.name}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (!goal) {
    return `ไม่เจอเป้าหมายชื่อ “${saving.name}” ครับ\n\nพิมพ์ “เป้าหมาย” เพื่อดูรายการเป้าหมาย`;
  }

  const newAmount = Number(goal.current_amount) + saving.amount;
  const newStatus = newAmount >= Number(goal.target_amount) ? "completed" : "active";

  const { data: updatedGoal, error: updateError } = await supabase
    .from("goals")
    .update({
      current_amount: newAmount,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", goal.id)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  const percent = Math.min(
    (Number(updatedGoal.current_amount) / Number(updatedGoal.target_amount)) * 100,
    100
  );
  const remaining = Math.max(
    Number(updatedGoal.target_amount) - Number(updatedGoal.current_amount),
    0
  );

  return (
    `อัปเดตเงินออมแล้ว ✅\n\n` +
    `${updatedGoal.name}\n` +
    `ออมแล้ว: ${formatMoney(updatedGoal.current_amount)} / ${formatMoney(
      updatedGoal.target_amount
    )} บาท\n` +
    `สำเร็จ: ${percent.toFixed(1)}%\n` +
    `เหลืออีก: ${formatMoney(remaining)} บาท` +
    (newStatus === "completed" ? "\n\nสำเร็จแล้ว 🎉" : "")
  );
}

async function getGoals(userId) {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return "ยังไม่มีเป้าหมายครับ\n\nลองพิมพ์: ตั้งเป้า iPhone 45000";
  }

  const goalsText = data
    .map((goal, index) => {
      const current = Number(goal.current_amount);
      const target = Number(goal.target_amount);
      const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0;
      const remaining = Math.max(target - current, 0);

      return (
        `${index + 1}. ${goal.name}\n` +
        `   ${formatMoney(current)} / ${formatMoney(target)} บาท (${percent.toFixed(
          1
        )}%)\n` +
        `   เหลืออีก ${formatMoney(remaining)} บาท`
      );
    })
    .join("\n\n");

  return `เป้าหมายของคุณ 🎯\n\n${goalsText}`;
}

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

function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, "");
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});