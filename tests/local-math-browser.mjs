import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1366 },
    hasTouch: true,
  });
  const errors = [],
    paid = [];
  // This feature is paused in the product; exercise it only in the test fixture.
  await page.route('**/app.js',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace('const STRUCTURED_INK_ENABLED=false;','const STRUCTURED_INK_ENABLED=true;')});});
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/\/api\/(review|tutor|voice)/.test(r.url())) paid.push(r.url());
  });
  await page.goto("http://127.0.0.1:3000");
  await page.locator('[data-topic="multiply"]').click();
  await page.locator("#localMath>summary").click();
  // Independently authored synthetic pen paths, not captured human handwriting.
  const samples = {
    1: [
      [
        [15, 25],
        [45, 5],
        [45, 105],
      ],
    ],
    3: [
      [
        [8, 8],
        [68, 8],
        [37, 48],
        [66, 58],
        [67, 88],
        [46, 108],
        [9, 99],
      ],
    ],
    4: [
      [
        [55, 8],
        [6, 73],
        [75, 73],
      ],
      [
        [55, 8],
        [55, 110],
      ],
    ],
    5: [
      [
        [72, 6],
        [9, 6],
        [9, 53],
        [52, 53],
        [72, 73],
        [62, 100],
        [31, 108],
        [8, 95],
      ],
    ],
  };
  async function ink(field, index, digit) {
    const canvas = page.locator(`[data-ink="${field}-${index}"]`);
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    for (const stroke of samples[digit]) {
      await page.mouse.move(
        box.x + (stroke[0][0] * box.width) / 100,
        box.y + (stroke[0][1] * box.height) / 130,
      );
      await page.mouse.down();
      for (const [x, y] of stroke.slice(1))
        await page.mouse.move(
          box.x + (x * box.width) / 100,
          box.y + (y * box.height) / 130,
          { steps: 5 },
        );
      await page.mouse.up();
    }
  }
  for (const [key, value] of Object.entries({
    whole: "3",
    numerator: "1",
    denominator: "4",
    writtenNumerator: "15",
    writtenDenominator: "4",
  }))
    for (let i = 0; i < value.length; i++) await ink(key, i, value[i]);
  await page.waitForTimeout(1150);
  for (const [key, value] of Object.entries({
    whole: "3",
    numerator: "1",
    denominator: "4",
    writtenNumerator: "15",
    writtenDenominator: "4",
  }))
    assert.equal(
      await page.locator(`[data-field="${key}"]`).inputValue(),
      value,
      key,
    );
  assert.match(await page.locator("#localMathStatus").textContent(), /ยืนยัน/);
  assert.equal(await page.locator("#confirmLocalInk").isEnabled(), true);
  await page.locator("#confirmLocalInk").click();
  assert.match(await page.locator("#localMathStatus").textContent(), /3 คูณ 4/);
  assert.doesNotMatch(
    await page.locator("#localMathStatus").textContent(),
    /ถูกต้องแล้ว/,
  );
  // Entering the exercise's correct final value must not hide this incorrect step.
  const nums = (await page.locator("#question").textContent())
    .match(/\d+/g)
    .map(Number);
  await page.locator("#answer").fill(String(nums[0] * nums[1]));
  await page.locator("#checkBtn").click();
  assert.match(await page.locator("#result").textContent(), /3 คูณ 4/);
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("baankid-history") || "[]").length,
    ),
    0,
  );
  await page.locator('[data-field="writtenNumerator"]').fill("13");
  assert.match(await page.locator("#localMathStatus").textContent(), /ยืนยัน/);
  await page.locator("#confirmLocalInk").click();
  assert.match(
    await page.locator("#localMathStatus").textContent(),
    /ถูกต้องแล้ว/,
  );
  await page.locator('[data-field="writtenNumerator"]').fill("26");
  await page.locator('[data-field="writtenDenominator"]').fill("8");
  await page
    .locator("#localMath label")
    .filter({ hasText: "ต้องเป็นเศษส่วนอย่างต่ำ" })
    .locator("input")
    .check();
  await page.locator("#confirmLocalInk").click();
  assert.match(
    await page.locator("#localMathStatus").textContent(),
    /อย่างต่ำ/,
  );
  await page.locator('[data-field="writtenNumerator"]').fill("");
  assert.equal(await page.locator("#confirmLocalInk").isDisabled(), true);
  assert.match(
    await page.locator("#localMathStatus").textContent(),
    /เขียนให้ครบ/,
  );
  // Writing in another zone must not silently erase a user's corrected transcription.
  await page.locator('[data-field="whole"]').fill("12");
  await ink("numerator", 0, 1);
  await page.waitForTimeout(1100);
  assert.equal(await page.locator('[data-field="whole"]').inputValue(), "12");
  await page.locator("#autoCheck").check();
  const board = page.locator("#board");
  await board.scrollIntoViewIfNeeded();
  let b = await board.boundingBox();
  await page.mouse.move(b.x + 30, b.y + 30);
  await page.mouse.down();
  await page.mouse.move(b.x + 70, b.y + 70, { steps: 5 });
  await page.waitForTimeout(1200);
  assert.doesNotMatch(
    await page.locator("#boardState").textContent(),
    /กระดานอิสระ/,
  );
  await page.mouse.up();
  await page.waitForTimeout(1100);
  assert.match(
    await page.locator("#coachMessage").textContent(),
    /กระดานอิสระ/,
  );
  assert.equal(await page.locator("#confirmLocalInk").isDisabled(), true);
  await page.locator("#addPage").click();
  await page.waitForTimeout(1100);
  assert.equal(await page.locator('[data-field="whole"]').inputValue(), "");
  // A pending stroke timer must not repopulate another paper page.
  await ink("whole", 0, 3);
  await page.locator("#addPage").click();
  await page.waitForTimeout(1150);
  assert.equal(await page.locator('[data-field="whole"]').inputValue(), "");
  assert.equal(await page.locator("#confirmLocalInk").isDisabled(), true);
  await page
    .locator("#localMath details>summary")
    .filter({ hasText: "พิมพ์หรือแก้สมการหลายขั้น" })
    .click();
  await page
    .getByRole("textbox", { name: "สมการหลายขั้น", exact: true })
    .fill("3 1/4 = 15/4 = 13/4");
  await page
    .getByRole("button", { name: "ยืนยันข้อความและตรวจสมการในเครื่อง" })
    .click();
  assert.match(await page.locator("#localMathStatus").textContent(), /3 คูณ 4/);
  for (const width of [1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1366 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `${width}px overflow`,
    );
  }
  await page.screenshot({
    path: "test-results/local-math-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(paid, []);
  assert.deepEqual(errors, []);
  console.log(
    "Local math browser passed: synthetic pen digits, 15/4 regression, correction/confirmation, simplification, writing pause, pages, responsive widths, zero paid API requests. Human handwriting accuracy not measured.",
  );
} finally {
  await browser.close();
}
