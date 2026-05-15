require("dotenv").config();

const express = require("express");
const webhookRouter = require("./routes/webhook");
const { validateEnv } = require("./config/env");

validateEnv();

const app = express();

app.get("/", (req, res) => {
  res.send("LINE Finance Bot is running");
});

app.use("/", webhookRouter);

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});

