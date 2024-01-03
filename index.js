import pw from "playwright";
import retry from "async-retry";
import { createObjectCsvWriter } from "csv-writer";

const takeScreenshot = async (page, type) => {
  await page.screenshot({ path: type + Date.now() + ".png", fullPage: true });
};

async function main() {
  console.log("Connecting to Scraping browser");
  const browser = await pw.chromium.launch();
  console.log("Navigating");
  const page = await browser.newPage();

  await page.goto("https://webscraper.io/test-sites/e-commerce/static", {
    timeout: 2 * 60 * 1000,
  });
  console.log("Navigated, scraping...");

  try {
    const productElements = await page.$$(".card.product-wrapper.thumbnail");

    const products = [];
    for (const productElement of productElements) {
      const product = await productElement.evaluate((element) => {
        return {
          title: element.querySelector(".title").innerText,
          price: element.querySelector(".price").innerText,
          description: element.querySelector(".description").innerText,
          reviewCount: element.querySelector(".review-count").innerText,
          rating: element
            .querySelector(".ratings p[data-rating]")
            .getAttribute("data-rating"),
        };
      });
      products.push(product);
    }

    console.log("Scraped products:", products);

    const csvWriter = createObjectCsvWriter({
      path: "products.csv",
      header: [
        { id: "title", title: "Title" },
        { id: "price", title: "Price" },
        { id: "description", title: "Description" },
        { id: "reviewCount", title: "Review Count" },
        { id: "rating", title: "Rating" },
      ],
    });

    await csvWriter.writeRecords(products);
    console.log("Writing finished.");
  } catch (err) {
    console.error("Some error ocurred, taking screenshot of the page...");
    await takeScreenshot(page, "error", Date.now());
    console.error("Screenshot taken of the error");
  }

  console.log("Closing browser...");
  await browser.close();
  console.log("Finished");
}

await retry(main, {
  retries: 3,
  onRetry: (err) => {
    console.error("Retrying", err);
  },
});
