// frontend/src/components/Sales.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';

const BANKS = [
  "CBZ Bank Limited",
  "Standard Chartered Bank Zimbabwe",
  "FBC Bank Limited",
  "Stanbic Bank Zimbabwe",
  "Ecobank Zimbabwe",
  "ZB Bank Limited",
  "BancABC Zimbabwe",
  "NMB Bank Limited",
  "Agribank (Agricultural Bank of Zimbabwe)",
  "Steward Bank",
  "POSB (People's Own Savings Bank)",
  "Metbank Limited",
  "First Capital Bank",
];

// Helper to build a stable storage key per POS
const makeStorageKey = posId => `sales_in_progress_${posId}`;

export default function Sales() {
  const { posId } = useParams();
  const { state: { name } = {} } = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const STORAGE_KEY = makeStorageKey(posId);

  // State
  const [step, setStep] = useState('choose'); // 'choose' or 'form'
  const [method, setMethod] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [bank, setBank] = useState('');
  const [rows, setRows] = useState([]);
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Load persisted state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj.method) {
          setMethod(obj.method);
          setStep(obj.step || 'choose');
          setCurrency(obj.currency || 'USD');
          setBank(obj.bank || '');
          if (Array.isArray(obj.rows)) {
            setRows(obj.rows);
          }
          setSaved(!!obj.saved);
        }
      }
    } catch (err) {
      console.error('Failed to load saved state:', err);
    }
  }, [STORAGE_KEY]);

  // Persist whenever relevant state changes
  useEffect(() => {
    const toStore = {
      step,
      method,
      currency,
      bank,
      rows,
      saved,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (err) {
      console.error('Failed to save state:', err);
    }
  }, [STORAGE_KEY, step, method, currency, bank, rows, saved]);

  // Warn if user refresh/close with unsaved rows
  useEffect(() => {
    const handler = e => {
      if (rows.length && !saved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [rows, saved]);

  // In-app notification helper
  const showNotification = msg => {
    const id = Date.now() + Math.random();
    setNotifications(n => [...n, { id, msg }]);
    setTimeout(() => {
      setNotifications(n => n.filter(x => x.id !== id));
    }, 3000);
  };

  // Map uploaded Excel row keys into our fields
  const mapRow = raw => {
    const out = { date: '', posId: '', description: '', amount: '', currency: '' };
    for (let key in raw) {
      const norm = key.trim().toLowerCase().replace(/\s+/g, '');
      const val = raw[key];
      if (norm === 'date') out.date = val;
      else if (norm === 'posid' || norm === 'pos') out.posId = val;
      else if (norm === 'description') out.description = val;
      else if (norm === 'amount') out.amount = val;
      else if (norm === 'currency') out.currency = val;
    }
    if (method === 'bank' && !out.posId) {
      out.posId = posId;
    }
    if (!out.currency) {
      out.currency = currency;
    }
    return out;
  };

  // Handle Excel upload (bank method)
  const handleFileUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const parsed = json.map(mapRow);
        if (parsed.length + rows.length > 100) {
          showNotification("Upload would exceed 100 rows. Trim file or clear first.");
          return;
        }
        setRows(parsed);
        setSaved(false);
      } catch (err) {
        console.error('Failed to parse Excel:', err);
        showNotification("Failed to parse Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Add blank rows for non-bank methods
  const handleAddRows = count => {
    if (rows.length + count > 100) {
      showNotification("Cannot exceed 100 rows total.");
      return;
    }
    const newRows = Array.from({ length: count }, () => ({
      date: '',
      description: '',
      amount: '',
      currency: currency,
    }));
    setRows(r => [...r, ...newRows]);
    setSaved(false);
  };

  // Remove a row
  const handleRemoveRow = idx => {
    setRows(rs => rs.filter((_, i) => i !== idx));
    setSaved(false);
  };

  // Save to backend
  const onSave = async () => {
    if (!name) {
      showNotification("Missing agent name. Cannot save.");
      return;
    }
    if (!rows.length) {
      showNotification("No data to save. Add or upload rows first.");
      return;
    }
    if (method === 'bank' && !bank) {
      showNotification("Select a bank before saving.");
      return;
    }
    const reportDate = new Date().toISOString().split('T')[0];
    const tableData = rows.map(r => {
      const base = {
        date: r.date,
        description: r.description,
        amount: r.amount,
        currency: r.currency,
      };
      if (method === 'bank') {
        return {
          ...base,
          posId: r.posId || posId,
          Bank: bank,
        };
      }
      return base;
    });
    const body = {
      name,
      posId,
      date: reportDate,
      source: "payments",
      tableData,
    };
    if (method === 'bank') {
      body.bank = bank;
    }
    try {
      // relative endpoint; no hardcoded localhost
      const res = await fetch("/api/reports/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        showNotification("Save failed: " + (text || res.status));
        return;
      }
      const { reportId } = await res.json();
      showNotification(`Saved ID: ${reportId}`);
      setSaved(true);
    } catch (err) {
      console.error('Save error:', err);
      showNotification("Save failed.");
    }
  };

  // Clear in-progress data
  const onClear = () => {
    setRows([]);
    setSaved(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Continue from choose screen: if switching method, clear old data
  const onChooseContinue = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const prev = JSON.parse(raw);
        if (prev.method && prev.method !== method) {
          onClear();
          setBank('');
          setSaved(false);
        }
      }
    } catch (err) {
      console.error('Error checking previous method:', err);
    }
    setStep('form');
  };

  // Watermark only on choose screen
  const WatermarkGrid = () => (
    <div
      className="absolute inset-0 bg-repeat opacity-20"
      style={{
        backgroundImage: "url('/images/logo1.png')",
        backgroundSize: '150px 150px',
      }}
    />
  );

  // RENDER
  if (step === 'choose') {
    return (
      <div className="relative flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
        <WatermarkGrid />
        <div className="relative z-10 w-full max-w-sm text-center">
          <button
            onClick={() => navigate(-1)}
            className="self-start mb-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded"
          >
            Back
          </button>
          <h2 className="text-xl font-bold mb-2">Select Payment Method</h2>
          <select
            value={method}
            onChange={e => setMethod(e.target.value)}
            className="mt-2 p-2 border rounded w-full"
          >
            <option value="">-- Choose --</option>
            <option value="bank">Bank Payment</option>
            <option value="ecocash">Ecocash</option>
            <option value="cash">Cash</option>
            <option value="pds">PDS</option>
          </select>
          <div className="mt-4">
            <button
              disabled={!method}
              onClick={onChooseContinue}
              className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // form screen
  return (
    <div className="min-h-screen bg-gray-50 pt-40 px-4">
      {/* in-app notifications on left */}
      <div className="fixed left-4 top-4 space-y-2 z-50">
        {notifications.map(n => (
          <div
            key={n.id}
            className="bg-blue-100 text-blue-800 px-3 py-1 rounded shadow"
          >
            {n.msg}
          </div>
        ))}
      </div>

      <div className="flex flex-col h-full">
        <div className="p-4 bg-white shadow flex flex-wrap items-end space-x-4">
          <h1 className="text-xl font-bold">Payments</h1>
          <div className="text-sm text-gray-600">
            POS ID: <span className="font-medium">{posId}</span>
          </div>
          <label className="flex flex-col">
            <span className="text-sm">Currency</span>
            <select
              value={currency}
              onChange={e => {
                setCurrency(e.target.value);
                setRows(rs =>
                  rs.map(r => ({
                    ...r,
                    currency: r.currency || e.target.value,
                  }))
                );
                setSaved(false);
              }}
              className="p-2 border w-24 rounded"
            >
              <option value="USD">USD</option>
              <option value="ZWG">ZWG</option>
            </select>
          </label>
          {method === 'bank' && (
            <label className="flex flex-col">
              <span className="text-sm">Bank</span>
              <select
                value={bank}
                onChange={e => {
                  setBank(e.target.value);
                  setSaved(false);
                }}
                className="p-2 border rounded"
              >
                <option value="">--Select a Bank--</option>
                {BANKS.map(b => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          )}
          {method === 'bank' ? (
            <label className="flex flex-col flex-grow min-w-[200px]">
              <span className="text-sm">Upload Excel</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="p-2 border rounded"
              />
            </label>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-sm">Add rows:</span>
              <select
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) handleAddRows(val);
                }}
                className="p-2 border rounded"
                defaultValue=""
              >
                <option value="" disabled>Choose</option>
                <option value="1">1</option>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="100">100</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {rows.length === 0 ? (
            <p className="text-gray-500 text-center">
              {method === 'bank'
                ? 'No data. Upload an Excel.'
                : 'No data. Use "Add rows" to add entries.'}
            </p>
          ) : (
            <table className="min-w-full border">
              <thead>
                <tr>
                  <th className="border px-2">Date</th>
                  {method === 'bank' && <th className="border px-2">POS ID</th>}
                  <th className="border px-2">Description</th>
                  <th className="border px-2">Amount</th>
                  <th className="border px-2">Currency</th>
                  {method === 'bank' && <th className="border px-2">Bank</th>}
                  <th className="border px-2">Remove</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="border px-2">
                      <input
                        type="date"
                        value={row.date}
                        onChange={e => {
                          const newRows = [...rows];
                          newRows[idx].date = e.target.value;
                          setRows(newRows);
                          setSaved(false);
                        }}
                        className="w-full"
                      />
                    </td>
                    {method === 'bank' && (
                      <td className="border px-2">
                        <input
                          type="text"
                          value={row.posId}
                          onChange={e => {
                            const newRows = [...rows];
                            newRows[idx].posId = e.target.value;
                            setRows(newRows);
                            setSaved(false);
                          }}
                          className="w-full"
                        />
                      </td>
                    )}
                    <td className="border px-2">
                      <input
                        type="text"
                        value={row.description}
                        onChange={e => {
                          const newRows = [...rows];
                          newRows[idx].description = e.target.value;
                          setRows(newRows);
                          setSaved(false);
                        }}
                        className="w-full"
                      />
                    </td>
                    <td className="border px-2">
                      <input
                        type="number"
                        value={row.amount}
                        onChange={e => {
                          const newRows = [...rows];
                          newRows[idx].amount = e.target.value;
                          setRows(newRows);
                          setSaved(false);
                        }}
                        className="w-full"
                      />
                    </td>
                    <td className="border px-2">
                      <select
                        value={row.currency}
                        onChange={e => {
                          const newRows = [...rows];
                          newRows[idx].currency = e.target.value;
                          setRows(newRows);
                          setSaved(false);
                        }}
                        className="w-full"
                      >
                        <option value="USD">USD</option>
                        <option value="ZWG">ZWG</option>
                      </select>
                    </td>
                    {method === 'bank' && (
                      <td className="border px-2 text-center">{bank}</td>
                    )}
                    <td className="border px-2 text-center">
                      <button
                        onClick={() => handleRemoveRow(idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 bg-white shadow flex justify-end space-x-3">
          <button
            onClick={onClear}
            className="px-4 py-2 bg-yellow-500 text-white rounded"
          >
            Clear
          </button>
          <button
            onClick={() => {
              // clear and go back to choose
              onClear();
              setMethod('');
              setBank('');
              setSaved(false);
              setStep('choose');
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Change Method
          </button>
          {!saved ? (
            <button
              onClick={onSave}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Save
            </button>
          ) : (
            <button
              onClick={() => {
                // after save, allow start over
                onClear();
                setMethod('');
                setBank('');
                setSaved(false);
                setStep('choose');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="px-4 py-2 bg-green-500 text-white rounded"
            >
              Start Over
            </button>
          )}
          <button
            onClick={() => {
              // in-app “back” to choose without clearing current data
              setStep('choose');
            }}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded"
          >
            Back
          </button>
          <button
          onClick={()=>navigate('/reports', { state: { name, posId } })}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
        >Next</button>
         
        </div>
      </div>
    </div>
  );
}
