const supabase = require("../supabase");

async function getOrCreateUser(lineUserId) {
  const { data: existingUser, error: findError } = await supabase
    .from("users")
    .select("*")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existingUser) {
    return existingUser;
  }

  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      line_user_id: lineUserId,
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return newUser;
}

async function ensureDefaultWallets(userId) {
  const { data: existingWallets, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  if (existingWallets && existingWallets.length > 0) {
    return;
  }

  const { error: insertError } = await supabase.from("wallets").insert([
    {
      user_id: userId,
      name: "เงินสด",
      type: "cash",
      balance: 0,
      is_default: true,
    },
    {
      user_id: userId,
      name: "ธนาคาร",
      type: "bank",
      balance: 0,
      is_default: false,
    },
    {
      user_id: userId,
      name: "E-Wallet",
      type: "ewallet",
      balance: 0,
      is_default: false,
    },
    {
      user_id: userId,
      name: "บัตรเครดิต",
      type: "credit_card",
      balance: 0,
      is_default: false,
    },
  ]);

  if (insertError) {
    throw insertError;
  }
}

module.exports = {
  getOrCreateUser,
  ensureDefaultWallets,
};

