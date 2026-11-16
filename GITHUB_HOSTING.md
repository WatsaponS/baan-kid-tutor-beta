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

เก็บโค้ดบน GitHub ได้ แต่ backend ต้องอยู่บนบริการที่รัน server ได้ เช่น Cloudflare Workers หรือโฮสต์ที่มี Node.js คง API key ไว้ฝั่ง server และมีการยืนยันตัวตน/โควตาก่อนเปิดรับผู้ใช้

เบื้องต้นยังใช้ Sites ส่วนตัวที่เปิดไว้เดิมได้: https://baan-kid-math-tutor-beta.stoutburl64.chatgpt.site

อย่าใส่ OPENAI_API_KEY ใน GitHub Pages source, JavaScript, GitHub build variables ที่นำมาฝัง frontend หรือในแชต

## สถานะ

ไฟล์ source และ docs พร้อมทดสอบ แต่การมี repository ไม่ได้แปลว่า Pages deploy สำเร็จ ให้ยืนยันจาก Settings → Pages และสถานะการ build ก่อนแจ้ง URL ว่าใช้งานได้
