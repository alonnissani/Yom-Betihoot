/** צעדי כניסה משותפים למסך הכניסה בעל שני המסלולים. */
export async function joinAsParticipant(page, code, wait = 900) {
  await page.click('.cta-participant');
  await page.waitForSelector('#code', { timeout: 10000 });
  await page.fill('#code', code);
  await page.click('.entry-form button[type=submit]');
  await page.waitForTimeout(wait);
}

export async function enterAsAdmin(page, code, wait = 900) {
  await page.click('.cta-admin');
  await page.waitForSelector('#admincode', { timeout: 10000 });
  await page.fill('#admincode', code);
  await page.click('.entry-form button[type=submit]');
  await page.waitForTimeout(wait);
}
