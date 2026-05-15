const client = require("../lib/lineClient");

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

function replyFlex(replyToken, altText, contents) {
  return client.replyMessage({
    replyToken,
    messages: [
      {
        type: "flex",
        altText,
        contents,
      },
    ],
  });
}

module.exports = {
  replyText,
  replyFlex,
};

