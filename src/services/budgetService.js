const supabase = require("../supabase");
const { getTodayBangkokDate, getCurrentBangkokYearMonth } = require("../utils/date");
const { formatMoney } = require("../utils/format");
const { getCategoryLabel } = require("../utils/category");
const {
  createStatRow,
  createDivider,
  createPrimaryButton,
  createSecondaryButton,
  createEmptyFlex,
} = require("../line/flex/components");

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

async function getDailyBudgetFlex(userId) {
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
    return createEmptyFlex(
      "งบวันนี้ 💰",
      "ยังไม่ได้ตั้งงบเดือนนี้ครับ",
      "ตั้งงบ 12,000",
      "ตั้งงบเดือนนี้ 12000"
    );
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
  const dailyBudget = Math.max(remainingBudget / remainingDays, 0);
  const usedPercent = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;

  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "งบวันนี้ 💰",
          weight: "bold",
          size: "xl",
        },
        {
          type: "text",
          text: `${formatMoney(dailyBudget)} บาท`,
          weight: "bold",
          size: "xxl",
          margin: "lg",
          wrap: true,
        },
        {
          type: "text",
          text: "ใช้ได้ประมาณวันนี้",
          size: "sm",
          color: "#888888",
        },
        createDivider(),
        createStatRow("งบเดือนนี้", `${formatMoney(totalBudget)} บาท`),
        createStatRow(
          "ใช้ไปแล้ว",
          `${formatMoney(spent)} บาท (${usedPercent.toFixed(1)}%)`
        ),
        createStatRow("เหลือทั้งเดือน", `${formatMoney(remainingBudget)} บาท`),
        createStatRow("เหลืออีก", `${remainingDays} วัน`),
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        createPrimaryButton("สรุปเดือนนี้", "สรุปเดือนนี้"),
        createSecondaryButton("ตั้งงบใหม่", "ตั้งงบเดือนนี้ 12000"),
      ],
    },
  };
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

module.exports = {
  setMonthlyBudget,
  getDailyBudget,
  getDailyBudgetFlex,
  setCategoryBudget,
  getCategoryBudgetsText,
  getCategoryBudgetText,
  getCategoryBudgetWarnings,
  getSpentByCategory,
};

