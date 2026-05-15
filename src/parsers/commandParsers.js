const { normalizeCategoryName } = require("../utils/category");
const { parseDateInfo } = require("./dateParser");

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

module.exports = {
  parseMonthlyBudgetCommand,
  parseCategoryBudgetCommand,
  parseCategoryBudgetViewCommand,
  parseGoalCreationCommand,
  parseGoalSavingCommand,
  parseEditLatestCommand,
  parseWalletCreationCommand,
  parseDefaultWalletCommand,
};

