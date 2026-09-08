const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const sharp = require("sharp");

async function generateCampPostcardPrintImage() {
  const rootDir = path.resolve(__dirname, "..");
  const campDir = path.join(rootDir, "camp");
  const sourceHtmlPath = path.join(campDir, "og-share.html");
  const outputImagePath = path.join(campDir, "images", "camp-postcard-4x6-300dpi.jpg");
  const tempImagePath = path.join(campDir, "images", "camp-postcard-source.png");

  // Standard postcard print size: 6x4 inches at 300 DPI.
  const targetWidth = 1800;
  const targetHeight = 1200;
  const letterboxColor = "#2f236f";

  if (!fs.existsSync(sourceHtmlPath)) {
    throw new Error(`Missing source HTML file: ${sourceHtmlPath}`);
  }

  fs.mkdirSync(path.dirname(outputImagePath), { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });

    const fileUrl = `file://${sourceHtmlPath}`;
    await page.goto(fileUrl, { waitUntil: "networkidle" });

    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const images = Array.from(document.images || []);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
        })
      );
    });

    const stage = page.locator(".stage").first();

    if ((await stage.count()) === 0) {
      throw new Error("Could not find .stage element in camp/og-share.html");
    }

    await stage.screenshot({
      path: tempImagePath,
      type: "png",
      animations: "disabled",
    });

    await sharp(tempImagePath)
      .resize(targetWidth, targetHeight, {
        fit: "contain",
        position: "center",
        background: letterboxColor,
      })
      .withMetadata({ density: 300 })
      .jpeg({ quality: 92, progressive: true, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toFile(outputImagePath);

    if (fs.existsSync(tempImagePath)) {
      fs.unlinkSync(tempImagePath);
    }

    console.log(`Generated print postcard image: ${outputImagePath}`);
    console.log("Output size: 1800x1200 (6x4 inches at 300 DPI, no crop with letterboxing)");
  } finally {
    await browser.close();
  }
}

generateCampPostcardPrintImage().catch((error) => {
  console.error("Failed to generate camp postcard print image:", error.message);
  process.exitCode = 1;
});
