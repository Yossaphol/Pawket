const supabase = require("../supabase");
const { getTodayBangkokDate } = require("../utils/date");
const { formatMoney } = require("../utils/format");
const { getCategoryLabel } = require("../utils/category");
const {
  createStatRow,
  createDivider,
  createPrimaryButton,
  createSecondaryButton,
  createEmptyFlex,
} = require("../line/flex/components");
const { getCategoryBudgetWarnings } = require("./budgetService");

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

async function getDailySummaryFlex(userId) {
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
    return createEmptyFlex(
      "สรุปวันนี้ 📊",
      "วันนี้ยังไม่มีรายการบันทึกครับ",
      "+ เพิ่มรายการ",
      "กินข้าว 80"
    );
  }

  const summary = calculateSummary(data);

  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "สรุปวันนี้ 📊",
          weight: "bold",
          size: "xl",
        },
        {
          type: "text",
          text: today,
          size: "xs",
          color: "#888888",
          margin: "sm",
        },
        createDivider(),
        createStatRow("รายรับ", `${formatMoney(summary.totalIncome)} บาท`),
        createStatRow("รายจ่าย", `${formatMoney(summary.totalExpense)} บาท`),
        createStatRow(
          "คงเหลือสุทธิ",
          `${formatMoney(summary.totalIncome - summary.totalExpense)} บาท`
        ),
        createDivider(),
        {
          type: "text",
          text: "รายจ่ายแยกตามหมวด",
          margin: "lg",
          size: "sm",
          weight: "bold",
        },
        {
          type: "text",
          text: summary.categoryText.replace(/^- /gm, "• "),
          wrap: true,
          margin: "sm",
          size: "sm",
          color: "#555555",
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        createPrimaryButton("ดูเดือนนี้", "สรุปเดือนนี้"),
        createSecondaryButton("รายการล่าสุด", "ล่าสุด"),
      ],
    },
  };
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

async function getMonthlySummaryFlex(userId) {
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
    return createEmptyFlex(
      "สรุปเดือนนี้ 📆",
      "เดือนนี้ยังไม่มีรายการบันทึกครับ",
      "+ เพิ่มรายการ",
      "กินข้าว 80"
    );
  }

  const summary = calculateSummary(data);
  const daysPassed = Number(day);
  const dailyAverage = summary.totalExpense / daysPassed;
  const categoryBudgetWarnings = await getCategoryBudgetWarnings(userId, data);

  const contents = [
    {
      type: "text",
      text: "สรุปเดือนนี้ 📆",
      weight: "bold",
      size: "xl",
    },
    {
      type: "text",
      text: `${startDate} ถึง ${endDate}`,
      size: "xs",
      color: "#888888",
      margin: "sm",
    },
    createDivider(),
    createStatRow("จำนวนรายการ", `${data.length} รายการ`),
    createStatRow("รายรับรวม", `${formatMoney(summary.totalIncome)} บาท`),
    createStatRow("รายจ่ายรวม", `${formatMoney(summary.totalExpense)} บาท`),
    createStatRow(
      "คงเหลือสุทธิ",
      `${formatMoney(summary.totalIncome - summary.totalExpense)} บาท`
    ),
    createStatRow("เฉลี่ยใช้วันละ", `${formatMoney(dailyAverage)} บาท`),
    createStatRow("หมวดสูงสุด", summary.topCategoryText),
    createDivider(),
    {
      type: "text",
      text: "รายจ่ายแยกตามหมวด",
      margin: "lg",
      size: "sm",
      weight: "bold",
    },
    {
      type: "text",
      text: summary.categoryText.replace(/^- /gm, "• "),
      wrap: true,
      margin: "sm",
      size: "sm",
      color: "#555555",
    },
  ];

  if (categoryBudgetWarnings) {
    contents.push(createDivider());
    contents.push({
      type: "text",
      text: "สถานะงบหมวด",
      margin: "lg",
      size: "sm",
      weight: "bold",
    });
    contents.push({
      type: "text",
      text: categoryBudgetWarnings.replace(/^- /gm, "• "),
      wrap: true,
      margin: "sm",
      size: "sm",
      color: "#555555",
    });
  }

  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents,
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        createPrimaryButton("ดูงบวันนี้", "งบวันนี้"),
        createSecondaryButton("สรุปวันนี้", "สรุปวันนี้"),
      ],
    },
  };
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

module.exports = {
  getDailySummary,
  getDailySummaryFlex,
  getMonthlySummary,
  getMonthlySummaryFlex,
  calculateSummary,
};

