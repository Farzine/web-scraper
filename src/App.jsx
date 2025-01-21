import { useState } from "react";
import axios from "axios";


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


  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <main className="flex flex-col items-center justify-center flex-1 w-full px-4">
        <div className="w-full max-w-md">
          <input
            type="text"
            placeholder="Enter website URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-2 border rounded mb-4"
          />
          <button
            onClick={handleScrape}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Scraping..." : "Scrape Website"}
          </button>
          {error && <p className="text-red-500 mt-4">{error}</p>}
          {result && (
            <div className="mt-6">
              <h2 className="text-xl font-bold">{result.title}</h2>
              <p className="mt-2 whitespace-pre-wrap">{result.textContent}</p>
            </div>
          )}
        </div>
        <div className="w-full max-w-md">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="w-full px-4 py-2 border rounded mb-4"
          />
          <button
            onClick={handlePDFScrape}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            disabled={pdfloading}
          >
            {pdfloading ? "Scraping..." : "Scrape PDF"}
          </button>
          {pdferror && <p className="text-red-500 mt-4">{pdferror}</p>}
          {pdfresult && (
            <div className="mt-6">
              <h2 className="text-xl font-bold">{pdfresult.title}</h2>
              <p className="mt-2 whitespace-pre-wrap">{pdfresult.textContent}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
