import puppeteer from "puppeteer";
import fs from "fs";
import * as pdfjs from "pdfjs-dist";
import { fileURLToPath } from 'url';
import { dirname, resolve  } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const scrapePDF = async (filePath) => {
  try {
    // // Configure worker path
    // const workerPath = resolve(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.js');
    // console.log("Worker exists:", fs.existsSync(workerPath));
    // pdfjs.GlobalWorkerOptions.workerSrc = workerPath;

    // Read and parse PDF
    const data = new Uint8Array(fs.readFileSync(filePath));
    const pdfDocument = await pdfjs.getDocument({
      data,
      disableWorker: false, // Ensure worker is enabled
    }).promise;

    let textContent = "";
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const text = await page.getTextContent();
      textContent += text.items.map((item) => item.str).join(" ") + "\n\n";
    }

    // Clean and format results
    return {
      title: extractTitle(textContent, filePath),
      textContent: cleanText(textContent)
    };
  } catch (error) {
    throw new Error(`PDF processing failed: ${error.message}`);
  }
};

// Helper functions
const extractTitle = (text, filePath) => {
  const firstLine = text.split('\n')[0]?.trim().substring(0, 200);
  return firstLine || filePath.split('/').pop().replace(/\.[^/.]+$/, "") || "Untitled Document";
};

const cleanText = (text) => {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
};



const MAX_RETRIES = 3;

/**
 * Scrapes the title and visible text content from a given website URL,
 * excluding common irrelevant sections and preventing duplicate content.
 *
 * @param {string} url - The URL of the website to scrape.
 * @param {number} [retryCount=0] - The current retry count (default is 0).
 * @returns {Promise<{ title: string, textContent: string }>} - The scraped title and visible text content.
 */
const scrapeWebsite = async (url, retryCount = 0) => {
  let browser;

  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: "load", timeout: 30000 });
      const title = await page.title();

      const textContent = await page.evaluate(() => {
        // Elements to exclude
        const excludeSelectors = [
          "nav",
          "footer",
          "aside",
          ".ads",
          ".hidden",
          "script",
          "style",
          "noscript",
          ".cookie-banner",
          ".newsletter-signup",
          "header",
        ];

        // Remove excluded elements
        excludeSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((el) => el.remove());
        });

        // Helper function to check if element is visible
        const isVisible = (element) => {
          const style = window.getComputedStyle(element);
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            element.offsetParent !== null
          );
        };

        // Helper function to get direct text content of an element
        const getDirectTextContent = (element) => {
          let text = '';
          for (let node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
              text += node.textContent.trim();
            }
          }
          return text;
        };

        // Process elements and avoid duplicates
        const processedTexts = new Set();
        const contentArray = [];

        // Get all leaf elements (elements with no children or only text nodes)
        const elements = document.querySelectorAll('body *');
        
        for (const element of elements) {
          // Skip if element is not visible
          if (!isVisible(element)) continue;

          // Get direct text content
          const directText = getDirectTextContent(element);
          
          // If element has direct text content and hasn't been processed
          if (directText && !processedTexts.has(directText)) {
            processedTexts.add(directText);
            contentArray.push(directText);
          }

          // Special handling for list items and headings
          if (
            (element.tagName === 'LI' || 
             element.tagName.match(/^H[1-6]$/)) && 
            element.textContent.trim() && 
            !processedTexts.has(element.textContent)
          ) {
            processedTexts.add(element.textContent);
            contentArray.push(element.textContent);
          }
        }

        // Join the content with appropriate spacing
        return contentArray
          .filter(text => text.length > 0)
          .join('\n')
          .replace(/\n\s*\n/g, '\n') // Remove extra newlines
          .trim();
      });

      if (!textContent) {
        throw new Error("No visible content found on the page.");
      }

      return { title, textContent };
    } catch (pageError) {
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        return await scrapeWebsite(url, retryCount + 1);
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
      await browser.close();
    }
  }
};

export { scrapeWebsite, scrapePDF };