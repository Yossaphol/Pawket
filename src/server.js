require("dotenv").config();

const express = require("express");
const line = require("@line/bot-sdk");

const app = express();

const requiredEnv = ["LINE_CHANNEL_SECRET", "LINE_CHANNEL_ACCESS_TOKEN"];

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

  const userText = event.message.text;
  const transaction = parseTransaction(userText);

  if (!transaction) {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: "ลองพิมพ์แบบนี้ได้เลย: กินข้าว 80 หรือ เงินเดือน 18000",
        },
      ],
    });
  }

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [
      {
        type: "text",
        text:
          `บันทึกแล้ว ✅\n\n` +
          `ประเภท: ${transaction.type}\n` +
          `หมวด: ${transaction.category}\n` +
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

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});