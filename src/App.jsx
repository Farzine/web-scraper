import axios from "axios";
import jsPDF from "jspdf";
import { Loader2 } from "lucide-react";
import { useState } from "react";

function App() {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfresult, setpdfResult] = useState(null);
  const [pdfloading, setpdfLoading] = useState(false);
  const [pdferror, setpdfError] = useState("");

  const handleScrape = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await axios.post("http://localhost:5000/scrape", {
        url,
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to scrape the website.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(result.title || "Scraped Content", 10, 10);
    doc.setFontSize(12);
    doc.text(result.textContent || "", 10, 20);
    doc.save("scraped-content.pdf");
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setpdfResult(null);
    setpdfError("");
  };

  const handlePDFScrape = async () => {
    if (!file) {
      setpdfError("Please upload a file.");
      return;
    }

    setpdfLoading(true);
    setpdfError("");
    setpdfResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:5000/scrape-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setpdfResult(response.data);
    } catch (err) {
      setpdfError(err.response?.data?.error || "Failed to scrape the PDF.");
    } finally {
      setpdfLoading(false);
    }
  };

  const handleCopyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
    alert("Content copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Content Scraper</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Website Scraper Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Website Scraper</h2>
            <input
              type="text"
              placeholder="Enter website URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleScrape}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 
                       transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {loading ? "Scraping..." : "Scrape Website"}
            </button>
            {error && <p className="text-red-500 mt-4">{error}</p>}
            {result && (
              <div className="mt-6">
                <h3 className="text-lg font-bold">{result.title}</h3>
                <p className="mt-2 whitespace-pre-wrap">{result.textContent}</p>
                <button
                  onClick={handleDownload}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-200"
                >
                  Download as PDF
                </button>
              </div>
            )}
          </div>

          {/* PDF Scraper Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">PDF Scraper</h2>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="w-full px-4 py-2 border rounded mb-4 file:mr-4 file:py-2 file:px-4 
                       file:rounded-md file:border-0 file:text-sm file:bg-blue-50 
                       file:text-blue-700 hover:file:bg-blue-100"
            />
            <button
              onClick={handlePDFScrape}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 
                       transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
              disabled={pdfloading}
            >
              {pdfloading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {pdfloading ? "Processing..." : "Extract PDF Content"}
            </button>
            {pdferror && <p className="text-red-500 mt-4">{pdferror}</p>}
            {pdfresult && (
              <div className="mt-6 space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-bold">{pdfresult.title}</h3>
                  <p className="text-sm text-gray-500">
                    Total Pages: {pdfresult.totalPages}
                  </p>
                </div>
                <div className="space-y-6">
                  {pdfresult.pages.map((page) => (
                    <div
                      key={page.pageNumber}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <div className="text-sm text-gray-500 mb-2">
                        Page {page.pageNumber}
                      </div>
                      <div className="space-y-3">
                        {page.content.map((line, index) => (
                          <div
                            key={index}
                            className={`${
                              line.isHeading
                                ? "text-lg font-bold text-gray-900"
                                : "text-gray-700"
                            }`}
                            style={{
                              fontSize: line.fontSize ? `${line.fontSize}px` : 'inherit',
                              fontFamily: line.fontFamily || "inherit",
                            }}
                          >
                            {line.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleCopyToClipboard(JSON.stringify(pdfresult, null, 2))}
                  className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors duration-200"
                >
                  Copy Content
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
