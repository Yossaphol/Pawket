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

  const transaction = parseTransaction(userText);

  if (!transaction) {
    return replyText(
      event.replyToken,
      "ลองพิมพ์แบบนี้ได้เลย:\n\n" +
        "กินข้าว 80\n" +
        "กาแฟ 65\n" +
        "เติมน้ำมัน 500\n" +
        "เงินเดือน 18000\n\n" +
        "คำสั่งที่ใช้ได้:\n" +
        "สรุปวันนี้\n" +
        "สรุปเดือนนี้\n" +
        "ล่าสุด\n" +
        "ลบล่าสุด\n" +
        "ตั้งงบเดือนนี้ 12000\n" +
        "งบวันนี้\n" +
        "ตั้งเป้า iPhone 45000\n" +
        "ออม iPhone 1000\n" +
        "เป้าหมาย"
    );
  }

  await saveTransaction(user.id, transaction);

  return replyText(
    event.replyToken,
    `บันทึกแล้ว ✅\n\n` +
      `ประเภท: ${transaction.type}\n` +
      `หมวด: ${getCategoryLabel(transaction.category)}\n` +
      `จำนวน: ${formatMoney(transaction.amount)} บาท`
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

function parseTransaction(text) {
  const amountMatch = text.match(/\d+(\.\d+)?/);

  if (!amountMatch) {
    return null;
  }

  const amount = Number(amountMatch[0]);
  const lowerText = text.toLowerCase();

  const incomeKeywords = ["เงินเดือน", "ได้เงิน", "รายได้", "โบนัส", "ฟรีแลนซ์", "salary"];
  const foodKeywords = ["กิน", "ข้าว", "กาแฟ", "ชา", "อาหาร", "ขนม", "มื้อ", "ร้านอาหาร"];
  const transportKeywords = ["น้ำมัน", "รถ", "แท็กซี่", "bts", "mrt", "grab", "วิน", "เดินทาง"];
  const shoppingKeywords = ["ซื้อ", "shopee", "lazada", "เสื้อ", "ของ", "ช้อป", "shopping"];
  const billKeywords = ["ค่าไฟ", "ค่าน้ำ", "เน็ต", "โทรศัพท์", "บิล", "บัตรเครดิต"];
  const healthKeywords = ["ยา", "หมอ", "โรงพยาบาล", "คลินิก", "สุขภาพ"];
  const entertainmentKeywords = ["หนัง", "netflix", "spotify", "เกม", "คอนเสิร์ต"];

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
    note: text.replace(amountMatch[0], "").trim(),
    rawText: text,
  };
}

function parseMonthlyBudgetCommand(text) {
  const match = text.match(/^(?:ตั้งงบเดือนนี้|ตั้งงบ|budget)\s*(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  return Number(match[1]);
}

function parseGoalCreationCommand(text) {
  const match = text.match(/^(?:ตั้งเป้า|ตั้งเป้าหมาย|goal)\s+(.+?)\s+(\d+(?:\.\d+)?)$/i);
  if (!match) return null;

  return {
    name: match[1].trim(),
    targetAmount: Number(match[2]),
  };
}

function parseGoalSavingCommand(text) {
  const match = text.match(/^(?:ออม|เก็บเงิน|save)\s+(.+?)\s+(\d+(?:\.\d+)?)$/i);
  if (!match) return null;

  return {
    name: match[1].trim(),
    amount: Number(match[2]),
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

async function saveTransaction(userId, transaction) {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      note: transaction.note,
      raw_text: transaction.rawText,
      transaction_date: getTodayBangkokDate(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
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

  return (
    `ลบรายการล่าสุดแล้ว ✅\n\n` +
    `${getCategoryLabel(latest.category)} ${formatMoney(latest.amount)} บาท\n` +
    `โน้ต: ${latest.note || "-"}`
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

  const listText = data
    .map((item, index) => {
      const sign = item.type === "income" ? "+" : "-";
      return (
        `${index + 1}. ${sign}${formatMoney(item.amount)} บาท ` +
        `${getCategoryLabel(item.category)}\n` +
        `   ${item.note || "-"} | ${item.transaction_date}`
      );
    })
    .join("\n");

  return `รายการล่าสุด 🧾\n\n${listText}\n\nพิมพ์ “ลบล่าสุด” เพื่อลบรายการล่าสุด`;
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

  return (
    `สรุปเดือนนี้ 📆\n\n` +
    `จำนวนรายการ: ${data.length} รายการ\n` +
    `รายรับรวม: ${formatMoney(summary.totalIncome)} บาท\n` +
    `รายจ่ายรวม: ${formatMoney(summary.totalExpense)} บาท\n` +
    `คงเหลือสุทธิ: ${formatMoney(summary.totalIncome - summary.totalExpense)} บาท\n` +
    `เฉลี่ยใช้วันละ: ${formatMoney(dailyAverage)} บาท\n` +
    `หมวดที่ใช้เยอะสุด: ${summary.topCategoryText}\n\n` +
    `รายจ่ายแยกตามหมวด:\n${summary.categoryText}`
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

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const categoryText =
    sortedCategories
      .map(
        ([category, amount]) =>
          `- ${getCategoryLabel(category)}: ${formatMoney(amount)} บาท`
      )
      .join("\n") || "- ไม่มีรายจ่าย";

  const topCategoryText = sortedCategories[0]
    ? `${getCategoryLabel(sortedCategories[0][0])} ${formatMoney(sortedCategories[0][1])} บาท`
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
    `ออมแล้ว: ${formatMoney(updatedGoal.current_amount)} / ${formatMoney(updatedGoal.target_amount)} บาท\n` +
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
        `   ${formatMoney(current)} / ${formatMoney(target)} บาท (${percent.toFixed(1)}%)\n` +
        `   เหลืออีก ${formatMoney(remaining)} บาท`
      );
    })
    .join("\n\n");

  return `เป้าหมายของคุณ 🎯\n\n${goalsText}`;
}

function getTodayBangkokDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year").value;
  const month = parts.find((part) => part.type === "month").value;
  const day = parts.find((part) => part.type === "day").value;

  return `${year}-${month}-${day}`;
}

function getCurrentBangkokYearMonth() {
  const today = getTodayBangkokDate();
  const [year, month] = today.split("-");

  return {
    year: Number(year),
    month: Number(month),
  };
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