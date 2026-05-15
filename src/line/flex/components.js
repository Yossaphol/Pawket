function createStatRow(label, value) {
  return {
    type: "box",
    layout: "horizontal",
    margin: "md",
    contents: [
      {
        type: "text",
        text: label,
        size: "sm",
        color: "#666666",
        flex: 2,
      },
      {
        type: "text",
        text: String(value),
        size: "sm",
        color: "#111111",
        align: "end",
        flex: 3,
        weight: "bold",
        wrap: true,
      },
    ],
  };
}

function createDivider() {
  return {
    type: "separator",
    margin: "lg",
  };
}

function createPrimaryButton(label, text) {
  return {
    type: "button",
    style: "primary",
    height: "sm",
    action: {
      type: "message",
      label,
      text,
    },
  };
}

function createSecondaryButton(label, text) {
  return {
    type: "button",
    style: "secondary",
    height: "sm",
    action: {
      type: "message",
      label,
      text,
    },
  };
}

function createEmptyFlex(title, message, buttonLabel, buttonText) {
  const footerContents = [];

  if (buttonLabel && buttonText) {
    footerContents.push(createPrimaryButton(buttonLabel, buttonText));
  }

  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: title,
          weight: "bold",
          size: "xl",
        },
        {
          type: "text",
          text: message,
          margin: "md",
          size: "sm",
          color: "#666666",
          wrap: true,
        },
      ],
    },
    footer:
      footerContents.length > 0
        ? {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: footerContents,
          }
        : undefined,
  };
}

function createCommandHelpRow(command, description, example) {
  const contents = [
    {
      type: "text",
      text: command,
      size: "sm",
      weight: "bold",
      color: "#111111",
      wrap: true,
    },
    {
      type: "text",
      text: description,
      size: "xs",
      color: "#666666",
      margin: "xs",
      wrap: true,
    },
  ];

  if (example) {
    contents.push({
      type: "text",
      text: `ตัวอย่าง: ${example}`,
      size: "xs",
      color: "#999999",
      margin: "xs",
      wrap: true,
    });
  }

  return {
    type: "box",
    layout: "vertical",
    margin: "md",
    contents,
  };
}

function createHelpBubble(title, subtitle, rows, footerButtons = []) {
  return {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: title,
          weight: "bold",
          size: "xl",
          wrap: true,
        },
        {
          type: "text",
          text: subtitle,
          size: "xs",
          color: "#888888",
          margin: "sm",
          wrap: true,
        },
        createDivider(),
        ...rows,
      ],
    },
    footer:
      footerButtons.length > 0
        ? {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: footerButtons,
          }
        : undefined,
  };
}

module.exports = {
  createStatRow,
  createDivider,
  createPrimaryButton,
  createSecondaryButton,
  createEmptyFlex,
  createCommandHelpRow,
  createHelpBubble,
};

