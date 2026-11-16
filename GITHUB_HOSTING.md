# โฮสต์บน GitHub

Repository: https://github.com/WatsaponS/baan-kid-tutor-beta

## GitHub Pages (โหมดสาธิต)

เปิด Settings → Pages → Deploy from a branch → main → /docs

URL หลังเปิดบริการสำเร็จ: https://watsapons.github.io/baan-kid-tutor-beta/

Pages เป็น static hosting จึงรองรับโจทย์ กระดาน ตรวจคำตอบที่พิมพ์ คำใบ้ เสียงอ่านของอุปกรณ์ และประวัติในเครื่อง รุ่น Pages ไม่เรียก API และไม่เปิดเสียง AI โต้ตอบ/อ่านลายมือ

คำสั่งอัปเดต:

```sh
npm ci
npm run build
npm run build:pages
npm test
git add src scripts docs package.json package-lock.json tests
git commit -m "Update tutor beta"
git push github main
```

`docs/` เป็น output สำหรับเผยแพร่ที่ commit ไว้ใน repository ต้อง build ใหม่เมื่อแก้ src ไม่มี server code, API key, .env, ประวัตินักเรียน หรือภาพตัวอย่างรวมอยู่ใน output

GitHub Pages โดยทั่วไปเป็นเว็บสาธารณะ แม้ repository เป็น private บางแผนรองรับ Pages จาก private repository แต่ GitHub Free ต้องใช้ public repository จึงต้องยืนยันเรื่องการเปิด source ก่อนเปลี่ยน visibility

## เปิด AI จริง

### สร้าง Worker จาก GitHub

เลือก repository นี้ใน Cloudflare Workers แล้วกรอก:

- Worker name: `baan-kid-tutor-beta`
- Production branch: `main`
- Root directory: `/` (ราก repository)
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

ไฟล์ `wrangler.jsonc` กำหนด entrypoint เป็น `dist/server/index.js` และ `keep_vars: true` เพื่อรักษาค่าที่ตั้งใน dashboard เมื่อ deploy ใหม่ หากไม่มี `AI_ADULT_TEST_ENABLED=true` โค้ดจะปิด AI โดยค่าเริ่มต้น

backend ตรวจการยืนยันตัวตนจาก `ctx.access.getIdentity()` ซึ่ง Cloudflare runtime ส่งให้เมื่อเปิด Access สำหรับ Worker ไม่เชื่อ `oai-authenticated-user-id` หรือ header อีเมลจาก request โดยตรง เปิด Worker → Access → All traffic → Cloudflare account ก่อนใช้ AI

ตั้ง `OPENAI_API_KEY` เป็น Secret ที่ Runtime variables and secrets แล้ว deploy โค้ดนี้ เมื่อเข้าสู่ระบบแล้วเปิด `/api/config` ตรวจ `hasKey: true` และ `accessReady: true` ก่อนเปลี่ยน runtime variable `AI_ADULT_TEST_ENABLED` เป็นข้อความ `true` สำหรับผู้ใหญ่ทดลอง `store:false` ไม่เท่ากับ Zero Data Retention

การอ่าน `ctx.access` ใช้กับการเรียก Worker โดยตรง ไม่รองรับการส่งตัวตนผ่าน Service Binding ไป Worker อีกตัว ดู [Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/#read-authenticated-user-identity-with-ctxaccess)

เก็บโค้ดบน GitHub ได้ แต่ backend ต้องอยู่บนบริการที่รัน server ได้ เช่น Cloudflare Workers หรือโฮสต์ที่มี Node.js คง API key ไว้ฝั่ง server และมีการยืนยันตัวตน/โควตาก่อนเปิดรับผู้ใช้

เบื้องต้นยังใช้ Sites ส่วนตัวที่เปิดไว้เดิมได้: https://baan-kid-math-tutor-beta.stoutburl64.chatgpt.site

อย่าใส่ OPENAI_API_KEY ใน GitHub Pages source, JavaScript, GitHub build variables ที่นำมาฝัง frontend หรือในแชต

## สถานะ

ไฟล์ source และ docs พร้อมทดสอบ แต่การมี repository ไม่ได้แปลว่า Pages deploy สำเร็จ ให้ยืนยันจาก Settings → Pages และสถานะการ build ก่อนแจ้ง URL ว่าใช้งานได้
