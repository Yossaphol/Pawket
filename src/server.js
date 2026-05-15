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

  const user = await getOrCreateUser(event.source.userId);

  // Command: สรุปวันนี้
  if (
    userText === "สรุปวันนี้" ||
    userText === "สรุปวันนี่" ||
    userText.toLowerCase() === "today"
  ) {
    const summaryText = await getDailySummary(user.id);

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: summaryText,
        },
      ],
    });
  }

  const transaction = parseTransaction(userText);

  if (!transaction) {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text:
            "ลองพิมพ์แบบนี้ได้เลย:\n\n" +
            "กินข้าว 80\n" +
            "กาแฟ 65\n" +
            "เติมน้ำมัน 500\n" +
            "เงินเดือน 18000\n\n" +
            "หรือพิมพ์: สรุปวันนี้",
        },
      ],
    });
  }

  await saveTransaction(user.id, transaction);

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [
      {
        type: "text",
        text:
          `บันทึกแล้ว ✅\n\n` +
          `ประเภท: ${transaction.type}\n` +
          `หมวด: ${getCategoryLabel(transaction.category)}\n` +
          `จำนวน: ${transaction.amount} บาท`,
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

  const incomeKeywords = ["เงินเดือน", "ได้เงิน", "รายได้", "โบนัส", "ฟรีแลนซ์"];
  const foodKeywords = ["กิน", "ข้าว", "กาแฟ", "ชา", "อาหาร", "ขนม"];
  const transportKeywords = ["น้ำมัน", "รถ", "แท็กซี่", "bts", "mrt", "grab"];
  const shoppingKeywords = ["ซื้อ", "shopee", "lazada", "เสื้อ", "ของ"];

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
  }

  return {
    type,
    amount,
    category,
    note: text.replace(amountMatch[0], "").trim(),
    rawText: text,
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

  const totalExpense = data
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalIncome = data
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const categoryTotals = {};

  for (const item of data) {
    if (item.type !== "expense") continue;

    categoryTotals[item.category] =
      (categoryTotals[item.category] || 0) + Number(item.amount);
  }

  const categoryText =
    Object.entries(categoryTotals)
      .map(
        ([category, amount]) =>
          `- ${getCategoryLabel(category)}: ${amount} บาท`
      )
      .join("\n") || "- ไม่มีรายจ่าย";

  return (
    `สรุปวันนี้ 📊\n\n` +
    `รายรับ: ${totalIncome} บาท\n` +
    `รายจ่าย: ${totalExpense} บาท\n` +
    `คงเหลือสุทธิ: ${totalIncome - totalExpense} บาท\n\n` +
    `แยกตามหมวด:\n${categoryText}`
  );
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

function getCategoryLabel(category) {
  const labels = {
    food: "อาหาร",
    transport: "เดินทาง",
    shopping: "ช้อปปิ้ง",
    income: "รายรับ",
    other: "อื่น ๆ",
  };

  return labels[category] || category;
}

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});