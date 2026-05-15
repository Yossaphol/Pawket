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

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [
      {
        type: "text",
        text: `รับข้อความแล้ว: ${userText}`,
      },
    ],
  });
}

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});