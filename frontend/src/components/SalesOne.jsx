// frontend/src/components/SalesOne.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
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

export default function SalesOne() {
  const { posId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const name = location.state?.name || localStorage.getItem('agentName') || '';

  // persist agent name
  useEffect(() => {
    if (location.state?.name) {
      localStorage.setItem('agentName', location.state.name);
    }
  }, [location.state]);

  const STORAGE_KEY = useMemo(() => `sales_in_progress_${posId}`, [posId]);
  const PAYMENTS_KEY = useMemo(() => `payments_${posId}`, [posId]);

  const [step, setStep] = useState('choose');
  const [method, setMethod] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [bank, setBank] = useState('');
  const [rows, setRows] = useState([]);
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // load in‑progress
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      setMethod(obj.method || '');
      setStep(obj.step || 'choose');
      setCurrency(obj.currency || 'USD');
      setBank(obj.bank || '');
      setRows(Array.isArray(obj.rows) ? obj.rows : []);
      setSaved(!!obj.saved);
    }
  }, [STORAGE_KEY]);

  // save in‑progress
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ step, method, currency, bank, rows, saved })
    );
  }, [STORAGE_KEY, step, method, currency, bank, rows, saved]);

  const showNotification = msg => {
    const id = Date.now();
    setNotifications(n => [...n, { id, msg }]);
    setTimeout(() => {
      setNotifications(n => n.filter(x => x.id !== id));
    }, 3000);
  };

  const formatDate = v =>
    v instanceof Date ? v.toISOString().split('T')[0] : String(v);

  const mapRow = raw => {
    if (method === 'bank') {
      const out = {
        txnDate: '', valueDate: '', posId,
        description: '', credit: '', debit: '', balance: '',
        currency, rate: '', converted: ''
      };
      Object.entries(raw).forEach(([k, v]) => {
        const key = k.trim().toLowerCase();
        if (key.startsWith('txn')) out.txnDate = formatDate(v);
        else if (key.startsWith('value')) out.valueDate = formatDate(v);
        else if (key.includes('description')) out.description = String(v);
        else if (key.includes('credit')) out.credit = String(v);
        else if (key.includes('debit')) out.debit = String(v);
        else if (key.includes('currency')) out.currency = String(v);
      });
      const c = parseFloat(out.credit) || 0;
      const d = parseFloat(out.debit) || 0;
      out.balance = String(c - d);
      if (out.currency === 'USD') {
        out.rate = '';
        out.converted = '';
      }
      return out;
    }

    if (method === 'pds') {
      const out = { txnDate: '', amount: '', rate: '', converted: '' };
      out.txnDate = formatDate(raw["DATE"]);
      out.amount = String(raw["SumOfPremium_Collected"] || '');
      if (currency === 'USD') {
        out.rate = '';
        out.converted = '';
      }
      return out;
    }

    // ecocash / cash fallback
    const out = { txnDate: '', amount: '', rate: '', converted: '' };
    Object.entries(raw).forEach(([k, v]) => {
      const key = k.trim().toLowerCase();
      if (/^(txn(date)?|date)$/.test(key)) out.txnDate = formatDate(v);
      if (/(amount|value|credit|debit)/.test(key)) out.amount = String(v);
    });
    return out;
  };

  const handleFileUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (method === 'pds' && !name) {
      showNotification("Missing agent name.");
      return;
    }

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        let rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (method === 'bank') {
          rawRows = rawRows.filter(r =>
            (r["Description"] || '').toLowerCase().includes(posId.toLowerCase())
          );
        } else if (method === 'pds') {
          rawRows = rawRows.filter(r =>
            String(r["Payment Method"] || '').toLowerCase() === 'pds'
            && Object.values(r).some(v =>
              v != null && v.toString().trim() === name
            )
          );
        }

        let mapped = rawRows.map(mapRow);

        if (method === 'pds') {
          const grouped = {};
          mapped.forEach(r => {
            const date = r.txnDate;
            const amt = parseFloat(r.amount) || 0;
            if (!grouped[date]) grouped[date] = { ...r };
            else grouped[date].amount = String(parseFloat(grouped[date].amount) + amt);
          });
          mapped = Object.values(grouped);
        }

        setRows(mapped);
        setSaved(false);
      } catch {
        showNotification("Failed to parse Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddRows = count => {
    const template = { txnDate:'', amount:'', rate:'', converted:'' };
    setRows(r => [...r, ...Array(count).fill().map(() => ({ ...template }))]);
    setSaved(false);
  };

  const handleRateChange = (idx, val) => {
    const rate = parseFloat(val) || 0;
    setRows(rs => {
      const nr = [...rs];
      nr[idx].rate = val;
      const amt = parseFloat(nr[idx].amount) || 0;
      nr[idx].converted = currency === 'USD' ? (amt * rate).toFixed(2) : '';
      return nr;
    });
    setSaved(false);
  };

  const handleRemoveRow = idx => {
    setRows(rs => rs.filter((_, i) => i !== idx));
    setSaved(false);
  };

  const onSave = () => {
    if (!name) return showNotification("Missing agent name.");
    if (!rows.length) return showNotification("No data to save.");
    if (method === 'bank' && !bank) return showNotification("Select a bank.");
    try {
      const raw = localStorage.getItem(PAYMENTS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ method, rows, bank: method === 'bank' ? bank : undefined });
      localStorage.setItem(PAYMENTS_KEY, JSON.stringify(arr));
      showNotification("Saved locally");
      setSaved(true);
    } catch {
      showNotification("Save failed locally.");
    }
  };

  const onClear = () => {
    setRows([]); setSaved(false); setSearchTerm('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onChooseContinue = () => setStep('form');

  const WatermarkGrid = () => (
    <div
      className="absolute inset-0 bg-repeat opacity-20"
      style={{
        backgroundImage: "url('/images/logo.png')",
        backgroundSize: '150px 150px',
      }}
    />
  );

  const filteredRows =
    ['ecocash','cash','pds'].includes(method)
      ? rows
      : rows.filter(r =>
          !searchTerm.trim() ||
          (r.description || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

  if (step === 'choose') {
    return (
      <div className="relative flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
        <WatermarkGrid />
        <div className="relative z-10 w-full max-w-sm text-center">
          <button onClick={() => navigate(-1)} className="self-start mb-4 px-4 py-2 bg-gray-300 rounded">
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

  return (
    <div className="min-h-screen pt-40 bg-gray-50 p-4">
      {/* notifications */}
      <div className="fixed top-4 left-4 z-50 space-y-2">
        {notifications.map(n => (
          <div key={n.id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded">
            {n.msg}
          </div>
        ))}
      </div>

      {/* actions */}
      <div className="mb-4 flex flex-wrap justify-end bg-white p-4 shadow space-x-2">
        <button onClick={onClear} className="px-4 py-2 bg-yellow-500 text-white rounded">
          Clear
        </button>
        <button
          onClick={() => {
            onClear(); setMethod(''); setBank(''); setSaved(false); setStep('choose');
          }}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Change Method
        </button>
        {!saved ? (
          <button onClick={onSave} className="px-4 py-2 bg-blue-500 text-white rounded">
            Save
          </button>
        ) : (
          <button
            onClick={() => {
              onClear(); setMethod(''); setBank(''); setSaved(false); setStep('choose');
            }}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Start Over
          </button>
        )}
        <button
          onClick={() => navigate(`/payments/${posId}/summary`, { state: { name } })}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Next
        </button>
      </div>

      {/* upload / add rows */}
      <div className="mb-4 flex flex-wrap items-end bg-white p-4 shadow space-x-4">
        <div>POS ID: <strong>{posId}</strong></div>
        <label className="flex flex-col">
          Currency
          <select
            value={currency}
            onChange={e => {
              setCurrency(e.target.value);
              setRows(rs => rs.map(r => ({ ...r, rate:'', converted:'' })));
              setSaved(false);
            }}
            className="border p-9 py-1 pt-2 rounded"
          >
            <option value="USD">USD</option>
            <option value="ZWG">ZWG</option>
          </select>
        </label>
        {method === 'bank' && (
          <label className="flex flex-col">
            Bank
            <select
              value={bank}
              onChange={e => { setBank(e.target.value); setSaved(false); }}
              className="border p-2 rounded"
            >
              <option value="">--Select a Bank--</option>
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
        )}
        <label className="flex flex-col flex-grow">
          {['ecocash','cash','pds'].includes(method) ? 'Add rows / Upload Excel' : 'Upload Excel'}
          {['ecocash','cash'].includes(method) ? (
            <select defaultValue="" onChange={e => handleAddRows(Number(e.target.value))} className="border p-2 rounded">
              <option value="" disabled>Choose</option>
              {[1,5,10,20,100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          ) : (
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="border p-2 rounded"
            />
          )}
        </label>
      </div>

      {/* table or no-data */}
      <div className="bg-white p-4 shadow overflow-auto">
        {(method !== 'ecocash' && method !== 'cash' && method !== 'pds') && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        )}

        {filteredRows.length === 0 ? (
          <p className="text-center text-gray-500">
            {rows.length === 0
              ? (method === 'bank' ? 'No data. Upload an Excel.' : 'No data. Use "Add rows".')
              : 'No matching transactions.'}
          </p>
        ) : (
          <table className="w-full table-auto border">
            <thead>
              <tr>
                {['ecocash','cash','pds'].includes(method) ? (
                  <>
                    <th className="border px-1 py-1">Date</th>
                    <th className="border px-1 py-1">Amount</th>
                    {currency === 'USD' && <th className="border px-1 py-1">Rate</th>}
                    {currency === 'USD' && <th className="border px-1 py-1">Converted</th>}
                    <th className="border px-1 py-1">Remove</th>
                  </>
                ) : (
                  <>
                    <th className="border px-1 py-1">Txn Date</th>
                    <th className="border px-1 py-1">Value Date</th>
                    <th className="border px-1 py-1">Description</th>
                    <th className="border px-1 py-1">Credit</th>
                    <th className="border px-1 py-1">Debit</th>
                    <th className="border px-1 py-1">Balance</th>
                    <th className="border px-1 py-1">Currency</th>
                    {currency === 'USD' && <th className="border px-1 py-1">Rate</th>}
                    {currency === 'USD' && <th className="border px-1 py-1">Converted</th>}
                    <th className="border px-1 py-1">Bank</th>
                    <th className="border px-1 py-1">Remove</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {['ecocash','cash','pds'].includes(method) ? (
                    <>
                      <td className="border px-1 py-1">
                        <input
                          type="date"
                          value={row.txnDate}
                          onChange={e => {
                            const nr = [...rows];
                            nr[i].txnDate = e.target.value;
                            setRows(nr); setSaved(false);
                          }}
                          className="w-full h-6"
                        />
                      </td>
                      <td className="border px-1 py-1">
                        <input
                          type="number"
                          value={row.amount}
                          onChange={e => {
                            const nr = [...rows];
                            nr[i].amount = e.target.value;
                            if (currency === 'USD') {
                              nr[i].converted = ((parseFloat(e.target.value)||0)*(parseFloat(nr[i].rate)||0)).toFixed(2);
                            }
                            setRows(nr); setSaved(false);
                          }}
                          className="w-full h-6"
                        />
                      </td>
                      {currency === 'USD' && (
                        <td className="border px-1 py-1">
                          <input
                            type="number"
                            value={row.rate}
                            onChange={e => handleRateChange(i, e.target.value)}
                            className="w-full h-6"
                          />
                        </td>
                      )}
                      {currency === 'USD' && (
                        <td className="border px-1 py-1">
                          <input readOnly value={row.converted} className="w-full h-6 bg-gray-100" />
                        </td>
                      )}
                      <td className="border px-1 py-1 text-center">
                        <button onClick={() => handleRemoveRow(i)} className="px-2 py-1 bg-red-500 text-white rounded text-sm">X</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border px-1 py-1">
                        <input
                          type="date"
                          value={row.txnDate}
                          onChange={e => {
                            const nr = [...rows];
                            nr[i].txnDate = e.target.value;
                            setRows(nr); setSaved(false);
                          }}
                          className="w-full h-6"
                        />
                      </td>
                      <td className="border px-1 py-1">
                        <input
                          type="date"
                          value={row.valueDate}
                          onChange={e => {
                            const nr = [...rows];
                            nr[i].valueDate = e.target.value;
                            setRows(nr); setSaved(false);
                          }}
                          className="w-full h-6"
                        />
                      </td>
                      <td className="border px-1 py-1">
                        <input
                          type="text"
                          value={row.description}
                          onChange={e => {
                            const nr = [...rows];
                            nr[i].description = e.target.value;
                            setRows(nr); setSaved(false);
                          }}
                          className="w-full h-6"
                        />
                      </td>
                      <td className="border px-1 py-1">
                        <input
                          type="number"
                          value={row.credit}
                          onChange={e => {
                            const nr = [...rows];
                            nr[i].credit = e.target.value;
                            const c = parseFloat(e.target.value)||0;
                            const d = parseFloat(nr[i].debit)||0;
                            nr[i].balance = String(c-d);
                            if (currency === 'USD') {
                              nr[i].converted = (c*(parseFloat(nr[i].rate)||0)).toFixed(2);
                            }
                            setRows(nr); setSaved(false);
                          }}
                          className="w-full h-6"
                        />
                      </td>
                      <td className="border px-1 py-1">
                        <input
                          type="number"
                          value={row.debit}
                          onChange={e => {
                            const nr = [...rows];
                            nr[i].debit = e.target.value;
                            const c = parseFloat(nr[i].credit)||0;
                            const d = parseFloat(e.target.value)||0;
                            nr[i].balance = String(c-d);
                            if (currency === 'USD') {
                              nr[i].converted = (c*(parseFloat(nr[i].rate)||0)).toFixed(2);
                            }
                            setRows(nr); setSaved(false);
                          }}
                          className="w-full h-6"
                        />
                      </td>
                      <td className="border px-1 py-1">
                        <input readOnly value={row.balance} className="w-full h-6 bg-gray-100" />
                      </td>
                      <td className="border px-1 py-1">
                        <select
                          value={row.currency}
                          onChange={e => {
                            const nr = [...rows];
                            nr[i].currency = e.target.value;
                            if (e.target.value !== 'USD') {
                              nr[i].rate = '';
                              nr[i].converted = '';
                            }
                            setRows(nr); setSaved(false);
                          }}
                          className="w-full h-6"
                        >
                          <option value="USD">USD</option>
                          <option value="ZWG">ZWG</option>
                        </select>
                      </td>
                      {currency === 'USD' && (
                        <td className="border px-1 py-1">
                          <input
                            type="number"
                            value={row.rate}
                            onChange={e => handleRateChange(i, e.target.value)}
                            className="w-full h-6"
                          />
                        </td>
                      )}
                      {currency === 'USD' && (
                        <td className="border px-1 py-1">
                          <input readOnly value={row.converted} className="w-full h-6 bg-gray-100" />
                        </td>
                      )}
                      <td className="border px-1 py-1 text-center">{bank}</td>
                      <td className="border px-1 py-1 text-center">
                        <button onClick={() => handleRemoveRow(i)} className="px-2 py-1 bg-red-500 text-white rounded text-sm">X</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
