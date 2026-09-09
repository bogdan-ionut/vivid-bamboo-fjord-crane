import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

async function shot(page, file, w, h, out) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(pathToFileURL(join(dir, file)).href, { waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  await page.screenshot({ path: out, type: "png" });
  console.log("wrote", out);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await shot(page, "og.html", 1200, 630, join(dir, "og-shot.png"));
await shot(page, "banner.html", 1200, 264, join(dir, "banner-shot.png"));
await shot(page, "favicon-preview.html", 96, 48, join(dir, "favicon-preview.png"));
await browser.close();
