const puppeteer = require("puppeteer");
const { Client } = require("@notionhq/client");

const TARGET_URL =
  "https://www.tiktok.com/music/Unhappy-birthday構文-7558119317473675265?is_from_webapp=1&sender_device=pc";

(async () => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: "new",
  });

  const page = await browser.newPage();

  // TikTok対策：UA設定
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
  );

  await page.goto(TARGET_URL, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  // 視聴数の要素を待つ
  await page.waitForSelector(
    'h2[data-e2e="music-video-count"]',
    { timeout: 60000 }
  );

  // 視聴数取得
  const viewText = await page.$eval(
    'h2[data-e2e="music-video-count"]',
    el => el.innerText.trim()
  );

  await browser.close();

  // 数値化（例: 1.2M → 1200000）
  const parseViewCount = text => {
    if (text.includes("M")) return Math.round(parseFloat(text) * 1_000_000);
    if (text.includes("K")) return Math.round(parseFloat(text) * 1_000);
    return Number(text.replace(/,/g, ""));
  };

  const viewCount = parseViewCount(viewText);

  // ===== Notion =====
  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
  });

  await notion.pages.create({
    parent: {
      database_id: process.env.NOTION_DATABASE_ID,
    },
    properties: {
      日付: {
        date: { start: new Date().toISOString() },
      },
      視聴数: {
        number: viewCount,
      },
      URL: {
        url: TARGET_URL,
      },
    },
  });

  console.log("記録完了:", viewCount);
})();
