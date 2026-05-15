const { replyText, replyFlex } = require("../line/reply");
const { getHelpFlex } = require("../line/flex/helpFlex");
const { getOrCreateUser, ensureDefaultWallets } = require("../services/userService");
const {
  getDailySummaryFlex,
  getMonthlySummaryFlex,
} = require("../services/summaryService");
const {
  saveTransaction,
  deleteLatestTransaction,
  deleteTransactionsByScope,
  editLatestTransaction,
  getLatestTransactions,
} = require("../services/transactionService");
const {
  getWalletsText,
  createWallet,
  setDefaultWallet,
} = require("../services/walletService");
const {
  setMonthlyBudget,
  getDailyBudgetFlex,
  setCategoryBudget,
  getCategoryBudgetsText,
  getCategoryBudgetText,
} = require("../services/budgetService");
const {
  createGoal,
  addGoalSaving,
  getGoalsFlex,
} = require("../services/goalService");
const { parseTransaction } = require("../parsers/transactionParser");
const {
  parseEditLatestCommand,
  parseWalletCreationCommand,
  parseDefaultWalletCommand,
  parseMonthlyBudgetCommand,
  parseCategoryBudgetCommand,
  parseCategoryBudgetViewCommand,
  parseGoalCreationCommand,
  parseGoalSavingCommand,
} = require("../parsers/commandParsers");
const { getCategoryLabel } = require("../utils/category");
const { formatMoney } = require("../utils/format");

async function handleEvent(event) {
  if (event.type !== "message") return;
  if (event.message.type !== "text") return;

  const userText = event.message.text.trim();
  const lowerText = userText.toLowerCase();

  if (
    userText === "ช่วยเหลือ" ||
    userText === "คำสั่ง" ||
    userText === "เมนู" ||
    lowerText === "help" ||
    lowerText === "menu"
  ) {
    return replyFlex(event.replyToken, "ช่วยเหลือ", getHelpFlex());
  }

  const user = await getOrCreateUser(event.source.userId);
  await ensureDefaultWallets(user.id);

  if (
    userText === "สรุปวันนี้" ||
    userText === "สรุปวันนี่" ||
    lowerText === "today"
  ) {
    const flex = await getDailySummaryFlex(user.id);
    return replyFlex(event.replyToken, "สรุปวันนี้", flex);
  }

  if (
    userText === "สรุปเดือนนี้" ||
    userText === "สรุปเดือน" ||
    lowerText === "month"
  ) {
    const flex = await getMonthlySummaryFlex(user.id);
    return replyFlex(event.replyToken, "สรุปเดือนนี้", flex);
  }

  if (
    userText === "ล่าสุด" ||
    userText === "รายการล่าสุด" ||
    userText === "ประวัติล่าสุด" ||
    lowerText === "latest"
  ) {
    const latestText = await getLatestTransactions(user.id);
    return replyText(event.replyToken, latestText);
  }

    if (
        userText === "ลบล่าสุด" ||
        lowerText === "delete latest"
    ) {
        const deletedText = await deleteLatestTransaction(user.id);
        return replyText(event.replyToken, deletedText);
    }

    if (
    userText === "ลบข้อมูลวันนี้" ||
    userText === "ลบวันนี้" ||
    userText === "ล้างวันนี้" ||
    lowerText === "clear today"
  ) {
    const deletedText = await deleteTransactionsByScope(user.id, "today");
    return replyText(event.replyToken, deletedText);
  }

  if (
    userText === "ลบข้อมูลเดือนนี้" ||
    userText === "ลบเดือนนี้" ||
    userText === "ล้างเดือนนี้" ||
    lowerText === "clear month"
  ) {
    const deletedText = await deleteTransactionsByScope(user.id, "month");
    return replyText(event.replyToken, deletedText);
  }

  if (
    userText === "ลบข้อมูลทั้งหมด" ||
    userText === "ล้างข้อมูลทั้งหมด" ||
    lowerText === "clear all"
  ) {
    return replyText(
      event.replyToken,
      "⚠️ คำสั่งนี้จะลบ transaction ทั้งหมดของคุณ\n\n" +
        "ถ้าต้องการลบจริง ให้พิมพ์:\n" +
        "ยืนยันลบข้อมูลทั้งหมด"
    );
  }

  if (
    userText === "ยืนยันลบข้อมูลทั้งหมด" ||
    lowerText === "confirm clear all"
  ) {
    const deletedText = await deleteTransactionsByScope(user.id, "all");
    return replyText(event.replyToken, deletedText);
  }

  const editLatest = parseEditLatestCommand(userText);
  if (editLatest) {
    const editText = await editLatestTransaction(user.id, editLatest);
    return replyText(event.replyToken, editText);
  }

  if (
    userText === "กระเป๋า" ||
    userText === "ดูกระเป๋า" ||
    userText === "wallets" ||
    lowerText === "wallet"
  ) {
    const walletsText = await getWalletsText(user.id);
    return replyText(event.replyToken, walletsText);
  }

  const walletCreation = parseWalletCreationCommand(userText);
  if (walletCreation) {
    const walletText = await createWallet(user.id, walletCreation);
    return replyText(event.replyToken, walletText);
  }

  const defaultWallet = parseDefaultWalletCommand(userText);
  if (defaultWallet) {
    const walletText = await setDefaultWallet(user.id, defaultWallet.name);
    return replyText(event.replyToken, walletText);
  }

  const budgetAmount = parseMonthlyBudgetCommand(userText);
  if (budgetAmount !== null) {
    const budgetText = await setMonthlyBudget(user.id, budgetAmount);
    return replyText(event.replyToken, budgetText);
  }

  if (
    userText === "งบวันนี้" ||
    userText === "ใช้ได้วันนี้" ||
    lowerText === "daily budget"
  ) {
    const flex = await getDailyBudgetFlex(user.id);
    return replyFlex(event.replyToken, "งบวันนี้", flex);
  }

  const categoryBudget = parseCategoryBudgetCommand(userText);
  if (categoryBudget) {
    const categoryBudgetText = await setCategoryBudget(user.id, categoryBudget);
    return replyText(event.replyToken, categoryBudgetText);
  }

  if (
    userText === "งบหมวด" ||
    userText === "งบแต่ละหมวด" ||
    lowerText === "category budgets"
  ) {
    const categoryBudgetsText = await getCategoryBudgetsText(user.id);
    return replyText(event.replyToken, categoryBudgetsText);
  }

  const categoryBudgetView = parseCategoryBudgetViewCommand(userText);
  if (categoryBudgetView) {
    const categoryBudgetText = await getCategoryBudgetText(
      user.id,
      categoryBudgetView.category
    );
    return replyText(event.replyToken, categoryBudgetText);
  }

  const goalCreation = parseGoalCreationCommand(userText);
  if (goalCreation) {
    const goalText = await createGoal(user.id, goalCreation);
    return replyText(event.replyToken, goalText);
  }

  const goalSaving = parseGoalSavingCommand(userText);
  if (goalSaving) {
    const savingText = await addGoalSaving(user.id, goalSaving);
    return replyText(event.replyToken, savingText);
  }

  if (
    userText === "เป้าหมาย" ||
    userText === "ดูเป้าหมาย" ||
    lowerText === "goals"
  ) {
    const flex = await getGoalsFlex(user.id);
    return replyFlex(event.replyToken, "เป้าหมาย", flex);
  }

  const transaction = await parseTransaction(user.id, userText);

  if (!transaction) {
    return replyText(
      event.replyToken,
      "ลองพิมพ์แบบนี้ได้เลย:\n\n" +
        "กินข้าว 80\n" +
        "กาแฟ 65 เมื่อวาน\n" +
        "เงินสด กินข้าว 80\n" +
        "ธนาคาร เงินเดือน 18000\n\n" +
        "คำสั่งที่ใช้ได้:\n" +
        "สรุปวันนี้\n" +
        "สรุปเดือนนี้\n" +
        "ล่าสุด\n" +
        "ลบล่าสุด\n" +
        "แก้ล่าสุด 120\n" +
        "แก้หมวดล่าสุด อาหาร\n" +
        "แก้วันที่ล่าสุด เมื่อวาน\n" +
        "กระเป๋า\n" +
        "เพิ่มกระเป๋า KBank 5000\n" +
        "ตั้งกระเป๋าหลัก เงินสด\n" +
        "ตั้งงบเดือนนี้ 12000\n" +
        "งบวันนี้\n" +
        "ตั้งงบอาหาร 5000\n" +
        "งบหมวด\n" +
        "ตั้งเป้า iPhone 45000\n" +
        "ออม iPhone 1000\n" +
        "เป้าหมาย"
    );
  }

  const saved = await saveTransaction(user.id, transaction);

  return replyText(
    event.replyToken,
    `บันทึกแล้ว ✅\n\n` +
      `ประเภท: ${transaction.type}\n` +
      `หมวด: ${getCategoryLabel(transaction.category)}\n` +
      `จำนวน: ${formatMoney(transaction.amount)} บาท\n` +
      `วันที่: ${transaction.transactionDate}\n` +
      `กระเป๋า: ${saved.walletName || "-"}`
  );
}

module.exports = {
  handleEvent,
};

