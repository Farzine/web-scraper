import { useState } from "react";
import axios from "axios";
import Header from "./components/Header";
import Footer from "./components/Footer";

function App() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Header />
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
      </main>
      <Footer />
    </div>
  );
}

export default App;
