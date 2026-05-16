const {
  createDivider,
  createPrimaryButton,
  createSecondaryButton,
  createCommandHelpRow,
  createHelpBubble,
} = require("./components");

function getHelpFlex() {
  return {
    type: "carousel",
    contents: [
      createHelpBubble(
        "ช่วยเหลือ 📌",
        "คำสั่งพื้นฐานสำหรับบันทึกรายรับรายจ่าย",
        [
          createCommandHelpRow(
            "กินข้าว 80",
            "บันทึกรายจ่าย โดยระบบเดาหมวดให้อัตโนมัติ",
            "กาแฟ 65"
          ),
          createCommandHelpRow(
            "กาแฟ 65 เมื่อวาน",
            "บันทึกรายการย้อนหลัง",
            "ข้าว 120 เมื่อวาน"
          ),
          createCommandHelpRow(
            "เงินสด กินข้าว 80",
            "เลือกกระเป๋าที่ใช้จ่าย",
            "ธนาคาร เงินเดือน 18000"
          ),
          createCommandHelpRow(
            "YYYY-MM-DD",
            "ระบุวันที่เองได้",
            "กาแฟ 80 2026-05-15"
          ),
        ],
        [
          createPrimaryButton("สรุปวันนี้", "สรุปวันนี้"),
          createSecondaryButton("รายการล่าสุด", "ล่าสุด"),
        ]
      ),

      createHelpBubble(
        "สรุปและประวัติ 📊",
        "ดูภาพรวมรายวัน รายเดือน และรายการล่าสุด",
        [
          createCommandHelpRow(
            "สรุปวันนี้",
            "ดูรายรับ รายจ่าย และยอดสุทธิของวันนี้",
            "สรุปวันนี้"
          ),
          createCommandHelpRow(
            "สรุปเดือนนี้",
            "ดูสรุปรายเดือน ค่าเฉลี่ยต่อวัน และหมวดที่ใช้เยอะสุด",
            "สรุปเดือนนี้"
          ),
          createCommandHelpRow(
            "ล่าสุด",
            "ดูรายการล่าสุด 5 รายการ",
            "ล่าสุด"
          ),
        ],
        [
          createPrimaryButton("ดูเดือนนี้", "สรุปเดือนนี้"),
          createSecondaryButton("ดูวันนี้", "สรุปวันนี้"),
        ]
      ),

      createHelpBubble(
        "แก้ไขและลบรายการ 🧾",
        "จัดการรายการที่บันทึกล่าสุด หรือเคลียร์ข้อมูลตามช่วงเวลา",
        [
          createCommandHelpRow(
            "ลบล่าสุด",
            "ลบรายการล่าสุด 1 รายการ",
            "ลบล่าสุด"
          ),
          createCommandHelpRow(
            "แก้ล่าสุด 120",
            "แก้จำนวนเงินของรายการล่าสุด",
            "แก้ล่าสุด 120"
          ),
          createCommandHelpRow(
            "แก้หมวดล่าสุด อาหาร",
            "เปลี่ยนหมวดของรายการล่าสุด",
            "แก้หมวดล่าสุด อาหาร"
          ),
          createCommandHelpRow(
            "แก้วันที่ล่าสุด เมื่อวาน",
            "เปลี่ยนวันที่ของรายการล่าสุด",
            "แก้วันที่ล่าสุด เมื่อวาน"
          ),
          createCommandHelpRow(
            "แก้โน้ตล่าสุด ...",
            "เปลี่ยนโน้ตของรายการล่าสุด",
            "แก้โน้ตล่าสุด มื้อกลางวัน"
          ),
          createCommandHelpRow(
            "แก้กระเป๋าล่าสุด ...",
            "ย้ายรายการล่าสุดไปยังกระเป๋าอื่น",
            "แก้กระเป๋าล่าสุด เงินสด"
          ),
          createCommandHelpRow(
            "ลบข้อมูลวันนี้ / ลบข้อมูลเดือนนี้",
            "ลบรายการตามช่วงเวลา",
            "ลบข้อมูลวันนี้"
          ),
          createCommandHelpRow(
            "ลบข้อมูลทั้งหมด",
            "เริ่มขั้นตอนลบรายการทั้งหมด ต้องพิมพ์ยืนยันอีกครั้ง",
            "ยืนยันลบข้อมูลทั้งหมด"
          ),
        ],
        [
          createPrimaryButton("ดูรายการล่าสุด", "ล่าสุด"),
        ]
      ),

      createHelpBubble(
        "กระเป๋าเงิน 👛",
        "จัดการกระเป๋า เช่น เงินสด ธนาคาร E-Wallet หรือบัตรเครดิต",
        [
          createCommandHelpRow(
            "กระเป๋า",
            "ดูรายการกระเป๋าและยอดคงเหลือ",
            "กระเป๋า"
          ),
          createCommandHelpRow(
            "เพิ่มกระเป๋า",
            "สร้างกระเป๋าใหม่ พร้อมยอดเริ่มต้น",
            "เพิ่มกระเป๋า KBank 5000"
          ),
          createCommandHelpRow(
            "ตั้งกระเป๋าหลัก",
            "ตั้งกระเป๋าเริ่มต้นสำหรับรายการใหม่",
            "ตั้งกระเป๋าหลัก เงินสด"
          ),
        ],
        [
          createPrimaryButton("ดูกระเป๋า", "กระเป๋า"),
          createSecondaryButton("เพิ่มกระเป๋า", "เพิ่มกระเป๋า KBank 5000"),
        ]
      ),

      createHelpBubble(
        "งบประมาณ 💰",
        "ตั้งงบรวมรายเดือน และงบแยกตามหมวด",
        [
          createCommandHelpRow(
            "ตั้งงบเดือนนี้",
            "ตั้งงบรวมของเดือนนี้",
            "ตั้งงบเดือนนี้ 12000"
          ),
          createCommandHelpRow(
            "งบวันนี้",
            "ดูว่าวันนี้ควรใช้ได้ประมาณเท่าไหร่",
            "งบวันนี้"
          ),
          createCommandHelpRow(
            "ตั้งงบอาหาร",
            "ตั้งงบรายหมวด",
            "ตั้งงบอาหาร 5000"
          ),
          createCommandHelpRow(
            "งบหมวด",
            "ดูงบทุกหมวดในเดือนนี้",
            "งบหมวด"
          ),
          createCommandHelpRow(
            "งบ + ชื่อหมวด",
            "ดูสถานะงบของหมวดนั้น",
            "งบอาหาร"
          ),
          createCommandHelpRow(
            "ลบงบเดือนนี้",
            "ลบงบรวมรายเดือนของเดือนปัจจุบัน",
            "ลบงบเดือนนี้"
          ),
          createCommandHelpRow(
            "ลบงบ + ชื่อหมวด",
            "ลบงบรายหมวดของเดือนปัจจุบัน",
            "ลบงบอาหาร"
          ),
        ],
        [
          createPrimaryButton("ดูงบวันนี้", "งบวันนี้"),
          createSecondaryButton("ตั้งงบ", "ตั้งงบเดือนนี้ 12000"),
        ]
      ),

      createHelpBubble(
        "เป้าหมาย 🎯",
        "ตั้งเป้าหมายการออม และอัปเดตยอดออม",
        [
          createCommandHelpRow(
            "ตั้งเป้า",
            "สร้างเป้าหมายใหม่",
            "ตั้งเป้า iPhone 45000"
          ),
          createCommandHelpRow(
            "ออม",
            "เพิ่มเงินออมเข้าเป้าหมาย",
            "ออม iPhone 1000"
          ),
          createCommandHelpRow(
            "เป้าหมาย",
            "ดูเป้าหมายที่ยัง active อยู่",
            "เป้าหมาย"
          ),
          createCommandHelpRow(
            "ลบเป้า",
            "ลบ/ซ่อนเป้าหมายที่ยัง active อยู่",
            "ลบเป้า iPhone"
          ),
        ],
        [
          createPrimaryButton("ดูเป้าหมาย", "เป้าหมาย"),
          createSecondaryButton("ตั้งเป้าใหม่", "ตั้งเป้า iPhone 45000"),
        ]
      ),
    ],
  };
}

module.exports = {
  getHelpFlex,
};

