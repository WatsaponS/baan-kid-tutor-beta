# บ้านคิด · Math Tutor Beta

เว็บแอปภาษาไทยสำหรับทดลองแนวคิดติวคณิตศาสตร์ ป.4–5 บนแท็บเล็ต รุ่น 0.1

สำหรับ GitHub Pages ดู [GITHUB_HOSTING.md](GITHUB_HOSTING.md) ใช้ `npm run build:pages` สร้าง `docs/` รุ่นสาธิตที่ไม่มี backend

## เริ่มในเครื่อง

ต้องมี Node.js 22 ขึ้นไป ไม่ต้องติดตั้ง dependencies สำหรับตัวแอป

```powershell
cd C:\Users\Admin\Desktop\Project\Tutor\tutor-github
npm start
```

เปิด http://127.0.0.1:3000 การเปิดบนแท็บเล็ตจากเครื่องอื่นต้องมีที่อยู่ที่เข้าถึงได้ และ HTTPS สำหรับไมโครโฟน แนะนำใช้ URL ที่เผยแพร่แบบส่วนตัวผ่าน Sites

## ใช้งานได้ในโหมดสาธิต

- โจทย์จากแม่แบบที่ตรวจเฉลยได้: คูณ หารลงตัว เศษส่วน ทศนิยม และโจทย์ปัญหา แยก ป.4/ป.5 และความยาก 3 ระดับ
- กระดานปากกา/นิ้ว สี ขนาด ยางลบ ย้อนกลับ ล้างกระดาน เก็บลำดับเส้นในหน่วยความจำ
- ตรวจคำตอบที่พิมพ์ด้วยตัวคำนวณ รองรับเลขไทย เศษส่วนสมมูล และจำนวนคละ
- คำใบ้และภาพแถบเศษส่วน เสียงอ่านของอุปกรณ์หากมีเสียงไทย
- ประวัติผลการฝึกใน localStorage ไม่บันทึกภาพหรือเสียง เพิ่มความยากเมื่อทำถูกโดยไม่ใช้คำใบ้ 3 ข้อติด

โหมดสาธิตไม่อ่านลายมือและไม่สนทนา AI จริง คำตอบในช่องแชตสาธิตคือคำใบ้สำเร็จรูป ไม่ใช่การวิเคราะห์คำถาม

## เปิด API สำหรับผู้ใหญ่ทดลอง

ห้ามส่ง API key ในแชตหรือใส่ใน client code สำหรับ Sites ให้ใช้ OpenAI Developers plugin / skill `openai-platform-api-key` เพื่อสร้างและตั้ง secret ตามขั้นตอนที่รองรับ หาก plugin ยังไม่มีให้เชื่อมก่อน

สำหรับรันในเครื่อง: สำเนา `.env.example` เป็น `.env` แล้วตั้งค่าเฉพาะในเครื่องของคุณ:

```dotenv
OPENAI_API_KEY=your-key
AI_ADULT_TEST_ENABLED=true
OPENAI_VISION_MODEL=gpt-4.1-mini
OPENAI_REALTIME_MODEL=gpt-realtime-2.1-mini
```

สำหรับ Cloudflare Workers ตั้งชื่อตัวแปรเดียวกันที่ Runtime variables and secrets โดย OPENAI_API_KEY ต้องเป็น Secret เปิด Cloudflare Access แบบ All traffic ก่อน backend รุ่นนี้ตรวจสิทธิ์จาก `ctx.access.getIdentity()` ไม่ใช้ Sites identity headers หลัง deploy เปิด `/api/config` ตรวจ hasKey และ accessReady ก่อนเปิด AI_ADULT_TEST_ENABLED=true จากนั้นเปิดตั้งค่าผู้ปกครองในหน้าเว็บและยืนยันว่าใช้ข้อมูลผู้ใหญ่/ข้อมูลจำลอง (การยืนยันนี้อยู่เฉพาะแท็บ ไม่เก็บข้ามการเปิดหน้า)

- `/api/review`: ส่งภาพกระดานไป Responses API แบบ structured output, `store:false` ให้ AI อ่านและให้คำใบ้ แล้วเซิร์ฟเวอร์ตรวจคำตอบกับโจทย์ที่สร้างใหม่จาก seed ไม่เชื่อ answer ที่ client ส่ง ผลอ่านคำตอบต้องให้ผู้ใช้ยืนยันก่อนบันทึกคะแนน
- ตรวจอัตโนมัติ: รอหยุดเขียน 1.8 วินาที เว้นอย่างน้อย 7 วินาทีระหว่างการส่ง จำกัด 50 ครั้งต่อการเปิดหน้า ยกเลิก/ทิ้งผลที่กระดานเปลี่ยน
- `/api/voice`: แลก SDP ฝั่งเซิร์ฟเวอร์กับ Realtime API ผ่าน WebRTC ไม่ส่ง API key ให้ browser เปิดเสียงจากการกดปุ่มเท่านั้น ส่งภาพล่าสุดเมื่อผู้ใช้พูดจบ แล้วจึงขอเสียงตอบกลับ ปิดสายเมื่อซ่อนหน้า/ครบ 10 นาที
- เสียงสนทนาเป็นคำแนะนำ ไม่ให้คะแนน คะแนนใช้ตัวตรวจและการยืนยันของผู้ใช้
- จัดการ API ล้มเหลว ไม่มีเครดิต ไม่อนุญาตไมค์ ไม่มีเสียงเครื่อง ภาพอ่านไม่ชัด และผลตอบช้า

## ขอบเขต beta

- เผยแพร่แบบ owner-private สำหรับเจ้าของทดลองเท่านั้น ยังไม่ใช่ระบบบัญชีเด็กหรือโรงเรียน
- ยังไม่เปิดใช้งานกับข้อมูลส่วนบุคคลเด็ก: ต้องจัดการความยินยอม เงื่อนไขการใช้บริการ การเก็บ/ลบข้อมูล และ Zero Data Retention ก่อน `store:false` ไม่เท่ากับ ZDR
- เนื้อหาเป็นตัวอย่างระดับชั้น ยังไม่ได้ตรวจเทียบหลักสูตรไทยครบทุกตัวชี้วัด
- การอ่านลายมือและเสียงไทยต้องประเมินกับอุปกรณ์จริง ไม่รับประกันความแม่นยำหรือ latency
- การสร้างโจทย์ใช้แม่แบบที่กำหนดขอบเขตและสุ่มตัวเลข ยังไม่สร้างโจทย์อิสระด้วย AI
- localStorage เป็นข้อมูลแยกตาม browser/origin ไม่ใช่ฐานข้อมูลข้ามเครื่อง
- Rate limit ใน Worker memory ช่วยลดการกดซ้ำ แต่ไม่ใช่ distributed quota หรือ spending cap ต้องตั้งงบ/ติดตามที่ API project ด้วย
- ห้ามเปลี่ยน Sites เป็น public ก่อนเพิ่มสิทธิ์ใช้งานและโควตาฝั่งเซิร์ฟเวอร์ที่เหมาะสม

## ตรวจสอบ

```powershell
npm run build
npm test
```

Tests ตรวจเฉลยแม่แบบหลายพันกรณี การแปลงเศษส่วน/เลขไทย การยืนยันโดเมนและตัวตน การไม่เผย key และ mock API paths การทดสอบ mock ไม่ยืนยันการเชื่อมต่อ OpenAI จริง

อ้างอิง: [Vision](https://developers.openai.com/api/docs/guides/images-vision), [Realtime WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc?api=realtime), [Realtime conversation](https://developers.openai.com/api/docs/guides/realtime-conversations), [Under-18 guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance)
