const supabase = require("../supabase");
const { formatMoney } = require("../utils/format");
const {
  createPrimaryButton,
  createSecondaryButton,
  createEmptyFlex,
} = require("../line/flex/components");

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
    `ออมแล้ว: ${formatMoney(updatedGoal.current_amount)} / ${formatMoney(
      updatedGoal.target_amount
    )} บาท\n` +
    `สำเร็จ: ${percent.toFixed(1)}%\n` +
    `เหลืออีก: ${formatMoney(remaining)} บาท` +
    (newStatus === "completed" ? "\n\nสำเร็จแล้ว 🎉" : "")
  );
}

async function deleteGoal(userId, goalName) {
  const { data: goal, error: findError } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .ilike("name", `%${goalName}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (!goal) {
    return `ไม่เจอเป้าหมายชื่อ “${goalName}” ครับ\n\nพิมพ์ “เป้าหมาย” เพื่อดูรายการเป้าหมาย`;
  }

  const { error: updateError } = await supabase
    .from("goals")
    .update({
      status: "deleted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", goal.id);

  if (updateError) {
    throw updateError;
  }

  return (
    `ลบเป้าหมายแล้ว ✅\n\n` +
    `${goal.name}\n` +
    `เป้าหมาย: ${formatMoney(goal.target_amount)} บาท\n` +
    `ออมแล้ว: ${formatMoney(goal.current_amount)} บาท`
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
        `   ${formatMoney(current)} / ${formatMoney(target)} บาท (${percent.toFixed(
          1
        )}%)\n` +
        `   เหลืออีก ${formatMoney(remaining)} บาท`
      );
    })
    .join("\n\n");

  return `เป้าหมายของคุณ 🎯\n\n${goalsText}`;
}

async function getGoalsFlex(userId) {
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
    return createEmptyFlex(
      "เป้าหมาย 🎯",
      "ยังไม่มีเป้าหมายครับ",
      "ตั้งเป้า iPhone",
      "ตั้งเป้า iPhone 45000"
    );
  }

  const goalRows = data.slice(0, 5).map((goal) => {
    const current = Number(goal.current_amount);
    const target = Number(goal.target_amount);
    const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const remaining = Math.max(target - current, 0);

    return {
      type: "box",
      layout: "vertical",
      margin: "lg",
      contents: [
        {
          type: "text",
          text: goal.name,
          weight: "bold",
          size: "sm",
          wrap: true,
        },
        {
          type: "text",
          text: `${formatMoney(current)} / ${formatMoney(target)} บาท (${percent.toFixed(
            1
          )}%)`,
          size: "xs",
          color: "#666666",
          margin: "xs",
          wrap: true,
        },
        {
          type: "text",
          text: `เหลืออีก ${formatMoney(remaining)} บาท`,
          size: "xs",
          color: "#888888",
          margin: "xs",
          wrap: true,
        },
      ],
    };
  });

  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "เป้าหมายของคุณ 🎯",
          weight: "bold",
          size: "xl",
        },
        ...goalRows,
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        createPrimaryButton("เพิ่มเงินออม", "ออม iPhone 1000"),
        createSecondaryButton("ตั้งเป้าใหม่", "ตั้งเป้า iPhone 45000"),
      ],
    },
  };
}

module.exports = {
  createGoal,
  addGoalSaving,
  deleteGoal,
  getGoals,
  getGoalsFlex,
};

