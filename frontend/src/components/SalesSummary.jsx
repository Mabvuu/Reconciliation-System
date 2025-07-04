// frontend/src/components/SalesSummary.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

export default function SalesSummary() {
  const { posId } = useParams();
  const loc = useLocation();
  const navigate = useNavigate();

  const nameFromState = loc.state?.name;
  const [name, setName] = useState(nameFromState || '');
  useEffect(() => {
    if (!nameFromState) {
      const stored = localStorage.getItem('agentName');
      if (stored) setName(stored);
    }
  }, [nameFromState]);

  const PAYMENTS_KEY = `payments_${posId}`;
  const [perMethodSummary, setPerMethodSummary] = useState([]);
  const [combinedSummary, setCombinedSummary] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PAYMENTS_KEY);
      if (!raw) {
        setPerMethodSummary([]);
        setCombinedSummary([]);
        return;
      }
      const arr = JSON.parse(raw);
      const globalDateMap = {};
      const perMethodEntries = [];

      arr.forEach(({ method, rows }) => {
        const dateMap = {};
        if (method === 'ecocash' || method === 'cash') {
          rows.forEach(r => {
            const d = r.txnDate || '';
            const amt = parseFloat(r.amount) || 0;
            if (!d) return;
            dateMap[d] = (dateMap[d] || 0) + amt;
          });
        } else {
          rows.forEach(r => {
            const d = r.txnDate || '';
            const credit = parseFloat(r.credit) || 0;
            if (!d || credit <= 0) return;
            dateMap[d] = (dateMap[d] || 0) + credit;
          });
        }
        Object.entries(dateMap).forEach(([date, total]) => {
          perMethodEntries.push({ method, date, total });
          globalDateMap[date] = (globalDateMap[date] || 0) + total;
        });
      });

      perMethodEntries.sort((a, b) => {
        if (a.method < b.method) return -1;
        if (a.method > b.method) return 1;
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return 0;
      });
      setPerMethodSummary(perMethodEntries);

      const combinedArr = Object.entries(globalDateMap)
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      setCombinedSummary(combinedArr);
    } catch (err) {
      console.error("Summary load error:", err);
      setPerMethodSummary([]);
      setCombinedSummary([]);
    }
  }, [PAYMENTS_KEY]);

  const grandTotal = combinedSummary.reduce((sum, item) => sum + item.total, 0);

  const clearSummary = () => {
    localStorage.removeItem(PAYMENTS_KEY);
    setPerMethodSummary([]);
    setCombinedSummary([]);
  };

  const onSaveSummary = async () => {
    if (!name) {
      alert("Agent name is required to save the summary.");
      return;
    }
    if (combinedSummary.length === 0) {
      alert("No data to save.");
      return;
    }
    const reportDate = new Date().toISOString().split('T')[0];
    const tableData = combinedSummary.map(item => ({
      date: item.date,
      total: item.total,
    }));
    const body = {
      name,
      posId,
      date: reportDate,
      source: "payments",
      paymentMethod: "summary",
      tableData,
    };
    try {
      const res = await fetch("/api/reports/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        alert("Save failed: " + (text || res.status));
        return;
      }
      const data = await res.json();
      alert(`Saved successfully! Report ID: ${data.reportId || "unknown"}.`);
    } catch (err) {
      console.error("Save summary error:", err);
      alert("Save failed.");
    }
  };

  if (!name) {
    return (
      <div className="p-8 bg-gray-100 rounded-lg shadow-md text-center">
        <p className="text-lg text-gray-700 mb-4">Agent name is missing. Please go back.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-[#556B2F] text-white rounded-md hover:bg-[#6E7881]"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 pt-30 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-[#556B2F]">
        Summary for POS {posId}
      </h1>

      {perMethodSummary.length === 0 ? (
        <p className="text-lg text-gray-600">
          No payment records available yet.
        </p>
      ) : (
        <>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Breakdown by Payment Method
          </h2>
          <table className="w-full border-collapse border rounded-lg mb-6">
            <thead className="bg-gray-200">
              <tr>
                <th className="border px-4 py-2">Method</th>
                <th className="border px-4 py-2">Date</th>
                <th className="border px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {perMethodSummary.map((item, idx) => (
                <tr key={idx} className="odd:bg-gray-100 even:bg-white">
                  <td className="border px-4 py-2 text-center">{item.method}</td>
                  <td className="border px-4 py-2 text-center">{item.date}</td>
                  <td className="border px-4 py-2 text-right">{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="text-xl font-semibold mb-4 text-gray-700">Combined Totals</h2>
          <table className="w-full border-collapse border rounded-lg">
            <thead className="bg-gray-200">
              <tr>
                <th className="border px-4 py-2">Date</th>
                <th className="border px-4 py-2">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {combinedSummary.map((item, idx) => (
                <tr key={idx} className="odd:bg-gray-100 even:bg-white">
                  <td className="border px-4 py-2 text-center">{item.date}</td>
                  <td className="border px-4 py-2 text-right">{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="border px-4 py-2 text-center font-semibold">Grand Total</td>
                <td className="border px-4 py-2 text-right font-bold">{grandTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}

      <div className="space-x-3 mt-6">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
        >
          Back
        </button>
        <button
          onClick={() => navigate(`/payments/${posId}/cashbook`, { state: { name, posId } })}
          className="px-4 py-2 bg-[#556B2F] text-white rounded-md hover:bg-[#6E7881]"
        >
          Proceed to Cashbook
        </button>
        <button
          onClick={clearSummary}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
        >
          Clear
        </button>
        <button
          onClick={onSaveSummary}
          className="px-4 py-2 bg-[#6E7881] text-white rounded-md hover:bg-[#556B2F]"
        >
          Save Summary
        </button>
      </div>
    </div>
  );
}
