import puppeteer from "puppeteer";

const MAX_RETRIES = 3;

const scrapeWebsite = async (url, retryCount = 0) => {
  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
      // Navigate to the URL
      await page.goto(url, { waitUntil: "load", timeout: 30000 });

      // Get the page title
      const title = await page.title();

      // Extract visible text content from the page
      const textContent = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("body *"))
          .filter((el) => el.offsetParent !== null) // Only include visible elements
          .map((el) => el.textContent.trim())
          .filter((text) => text.length > 0) // Exclude empty text
          .join("\n"); // Join text content with line breaks for better readability
      });

      // If no content is found, throw an error
      if (!textContent) {
        throw new Error("No visible content found on the page.");
      }

      return { title, textContent };
    } catch (pageError) {
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        return await scrapeWebsite(url, retryCount + 1); // Retry with an incremented count
      } else {
        throw new Error(
          `Failed to scrape content after ${MAX_RETRIES} attempts: ${pageError.message}`
        );
      }
    }
  } catch (error) {
    throw new Error(`Scraping failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close(); // Ensure browser is closed in all cases
    }
  }
};

export default scrapeWebsite;
