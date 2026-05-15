# LINE Finance Bot — แยกไฟล์ตามหน้าที่

โครงสร้างนี้แยกจากไฟล์ `Pasted code(10).js` เดิม โดยแบ่งตามความรับผิดชอบของแต่ละส่วน เพื่อให้อ่านง่ายและแก้ไขต่อได้เร็วขึ้น

## โครงสร้างไฟล์

```txt
src/
  index.js
  supabase.js
  config/
    env.js
  lib/
    lineClient.js
  routes/
    webhook.js
  handlers/
    messageHandler.js
  line/
    reply.js
    flex/
      components.js
      helpFlex.js
  parsers/
    commandParsers.js
    dateParser.js
    transactionParser.js
  services/
    budgetService.js
    goalService.js
    summaryService.js
    transactionService.js
    userService.js
    walletService.js
  utils/
    category.js
    date.js
    format.js
    text.js
```

## วิธีใช้งาน

1. วางโฟลเดอร์ `src` ลงในโปรเจกต์เดิม
2. ตรวจสอบว่าไฟล์ `supabase.js` เดิมยังอยู่ที่ root ของโปรเจกต์
3. เปลี่ยน command start ให้รันไฟล์ใหม่ เช่น

```json
{
  "scripts": {
    "start": "node src/index.js"
  }
}
```

## การแบ่งหน้าที่

- `routes/webhook.js` รับ request จาก LINE webhook
- `handlers/messageHandler.js` รวม flow หลักของข้อความและเรียก service/parser ที่เกี่ยวข้อง
- `parsers/` แยกการอ่านคำสั่ง วันที่ และ transaction จากข้อความผู้ใช้
- `services/` แยก logic ที่คุยกับ Supabase เช่น wallet, transaction, budget, goal, summary
- `line/flex/` รวม UI Flex Message และ component ย่อย
- `utils/` รวม helper กลาง เช่น format เงิน, วันที่ Bangkok, category, text normalize

