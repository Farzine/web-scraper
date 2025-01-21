import fs from "fs";
import pdfjsLib from "pdfjs-dist";
import puppeteer from "puppeteer";

const scrapePDF = async (filePath) => {
  try {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const pdfDocument = await pdfjsLib.getDocument({
      data,
      disableWorker: false,
    }).promise;

    const pages = [];
    
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      
      // Get page dimensions for position calculations
      const viewport = page.getViewport({ scale: 1.0 });
      const pageHeight = viewport.height;
      
      // Group text items by their vertical position (with some tolerance)
      const lineGroups = {};
      const tolerance = 3; // Adjust this value based on your needs
      
      textContent.items.forEach(item => {
        // Transform coordinates
        const y = pageHeight - item.transform[5]; // Flip Y coordinate
        const x = item.transform[4];
        
        // Round the Y position to the nearest group within tolerance
        const yGroup = Math.round(y / tolerance) * tolerance;
        
        if (!lineGroups[yGroup]) {
          lineGroups[yGroup] = [];
        }
        
        lineGroups[yGroup].push({
          text: item.str,
          x: x,
          fontSize: Math.sqrt(item.transform[0] * item.transform[0] + 
                            item.transform[1] * item.transform[1]),
          fontFamily: item.fontName,
        });
      });
      
      // Sort line groups by vertical position (top to bottom)
      const sortedLines = Object.entries(lineGroups)
        .sort(([y1], [y2]) => Number(y1) - Number(y2))
        .map(([_, items]) => {
          // Sort items within each line by X position (left to right)
          const sortedItems = items.sort((a, b) => a.x - b.x);
          
          // Detect if this line might be a heading based on font size
          const avgFontSize = sortedItems.reduce((sum, item) => sum + item.fontSize, 0) / sortedItems.length;
          const isHeading = avgFontSize > 12; // Adjust threshold as needed
          
          return {
            text: sortedItems.map(item => item.text).join(' '),
            fontSize: avgFontSize,
            isHeading: isHeading,
            fontFamily: sortedItems[0].fontFamily // Use first item's font family
          };
        });
      
      // Build structured content for the page
      const pageContent = {
        pageNumber: i,
        content: sortedLines.map(line => ({
          text: line.text,
          isHeading: line.isHeading,
          fontSize: line.fontSize,
          fontFamily: line.fontFamily
        }))
      };
      
      pages.push(pageContent);
    }
    
    // Extract document title from the first page's first heading
    const title = extractTitle(pages[0], filePath);
    
    return {
      title,
      pages,
      totalPages: pdfDocument.numPages
    };
    
  } catch (error) {
    throw new Error(`PDF processing failed: ${error.message}`);
  }
};

// Helper function to extract title
const extractTitle = (firstPage, filePath) => {
  // Try to find first heading
  const firstHeading = firstPage.content.find(line => line.isHeading)?.text;
  if (firstHeading) return firstHeading.trim();
  
  // Fallback to first line
  const firstLine = firstPage.content[0]?.text;
  if (firstLine) return firstLine.trim();
  
  // Final fallback to filename
  return filePath.split('/').pop().replace(/\.[^/.]+$/, "") || "Untitled Document";
};

// Example usage
const printStructuredContent = (result) => {
  console.log(`Document Title: ${result.title}`);
  console.log(`Total Pages: ${result.totalPages}\n`);
  
  result.pages.forEach(page => {
    console.log(`\n=== Page ${page.pageNumber} ===\n`);
    page.content.forEach(line => {
      if (line.isHeading) {
        console.log(`\n## ${line.text} ##`);
      } else {
        console.log(line.text);
      }
    });
  });
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

export { scrapePDF, scrapeWebsite };
