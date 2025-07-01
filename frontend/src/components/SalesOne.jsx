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

  // Agent name
  const name = location.state?.name || localStorage.getItem('agentName') || '';
  useEffect(() => {
    if (location.state?.name) {
      localStorage.setItem('agentName', location.state.name);
    }
  }, [location.state]);

  // Memoized keys
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

  // Load in-progress state
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
          if (Array.isArray(obj.rows)) setRows(obj.rows);
          setSaved(!!obj.saved);
        }
      }
    } catch (err) {
      console.error("Load state error:", err);
    }
  }, [STORAGE_KEY]);

  // Persist state on change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step, method, currency, bank, rows, saved })
      );
    } catch (err) {
      console.error("Save state error:", err);
    }
  }, [STORAGE_KEY, step, method, currency, bank, rows, saved]);

  const showNotification = msg => {
    const id = Date.now();
    setNotifications(n => [...n, { id, msg }]);
    setTimeout(() => {
      setNotifications(n => n.filter(x => x.id !== id));
    }, 3000);
  };

  // Map an Excel row → our row shape, now including rate & converted
  const mapRow = raw => {
    let out;
    if (method === 'ecocash' || method === 'cash') {
      out = { txnDate: '', amount: '', rate: '', converted: '' };
      Object.entries(raw).forEach(([key, val]) => {
        const norm = key.trim().toLowerCase();
        if (/^(txn(date)?|date)$/.test(norm)) {
          out.txnDate =
            val instanceof Date
              ? val.toISOString().split('T')[0]
              : String(val);
        }
        if (/(amount|value|credit|debit)/.test(norm)) {
          out.amount = String(val);
        }
      });
    } else {
      out = {
        txnDate: '',
        valueDate: '',
        posId,
        description: '',
        credit: '',
        debit: '',
        balance: '',
        currency,
        rate: '',
        converted: ''
      };
      Object.entries(raw).forEach(([key, val]) => {
        const norm = key.trim().toLowerCase();
        if (/^txn/.test(norm)) {
          out.txnDate =
            val instanceof Date
              ? val.toISOString().split('T')[0]
              : String(val);
        } else if (/^value/.test(norm)) {
          out.valueDate =
            val instanceof Date
              ? val.toISOString().split('T')[0]
              : String(val);
        } else if (/^pos/.test(norm)) {
          out.posId = String(val);
        } else if (/description/.test(norm)) {
          out.description = String(val);
        } else if (/credit/.test(norm)) {
          out.credit = String(val);
        } else if (/debit/.test(norm)) {
          out.debit = String(val);
        } else if (/balance/.test(norm)) {
          out.balance = String(val);
        } else if (/currency/.test(norm)) {
          out.currency = String(val);
        }
      });
      const c = parseFloat(out.credit) || 0;
      const d = parseFloat(out.debit) || 0;
      out.balance = String(c - d);
    }
    return out;
  };

  const handleFileUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        let parsed = XLSX.utils
          .sheet_to_json(ws, { defval: '' })
          .map(mapRow);

        // filter by POS ID for bank or PDS
        if (method === 'bank' || method === 'pds') {
          parsed = parsed.filter(r =>
            (r.description || '')
              .toLowerCase()
              .includes(posId.toLowerCase())
          );
        }

        setRows(parsed);
        setSaved(false);
      } catch (err) {
        console.error("Parse Excel error:", err);
        showNotification("Failed to parse Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddRows = count => {
    const template =
      method === 'ecocash' || method === 'cash'
        ? { txnDate: '', amount: '', rate: '', converted: '' }
        : {
            txnDate: '',
            valueDate: '',
            posId,
            description: '',
            credit: '',
            debit: '',
            balance: '',
            currency,
            rate: '',
            converted: ''
          };
    setRows(r => [...r, ...Array(count).fill().map(() => ({ ...template }))]);
    setSaved(false);
  };

  const handleRateChange = (idx, val) => {
    const rate = parseFloat(val) || 0;
    setRows(rs => {
      const nr = [...rs];
      nr[idx].rate = val;
      // pick amount for ecocash/cash, otherwise credit
      const amt =
        method === 'ecocash' || method === 'cash'
          ? parseFloat(nr[idx].amount) || 0
          : parseFloat(nr[idx].credit) || 0;
      nr[idx].converted = (amt * rate).toFixed(2);
      return nr;
    });
    setSaved(false);
  };

  const handleRemoveRow = idx => {
    setRows(rs => rs.filter((_, i) => i !== idx));
    setSaved(false);
  };

  const onSave = () => {
    if (!name) {
      showNotification("Missing agent name.");
      return;
    }
    if (!rows.length) {
      showNotification("No data to save.");
      return;
    }
    if (method === 'bank' && !bank) {
      showNotification("Select a bank.");
      return;
    }
    try {
      const raw = localStorage.getItem(PAYMENTS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ method, rows, bank: method === 'bank' ? bank : undefined });
      localStorage.setItem(PAYMENTS_KEY, JSON.stringify(arr));
      showNotification("Saved locally");
      setSaved(true);
    } catch (err) {
      console.error("Local store error:", err);
      showNotification("Save failed locally.");
    }
  };

  const onClear = () => {
    setRows([]);
    setSaved(false);
    setSearchTerm('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onChooseContinue = () => {
    setStep('form');
  };

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
    method === 'ecocash' || method === 'cash'
      ? rows
      : rows.filter(r =>
          searchTerm.trim() === ''
            ? true
            : (r.description || '')
                .toLowerCase()
                .includes(searchTerm.trim().toLowerCase())
        );

  if (step === 'choose') {
    return (
      <div className="relative flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
        <WatermarkGrid />
        <div className="relative z-10 w-full max-w-sm text-center">
          <button
            onClick={() => navigate(-1)}
            className="self-start mb-4 px-4 py-2 bg-gray-300 rounded"
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

  return (
    <div className="min-h-screen pt-40 bg-gray-50 p-4">
      {/* notifications */}
      <div className="fixed top-4 left-4 space-y-2 z-50">
        {notifications.map(n => (
          <div
            key={n.id}
            className="bg-blue-100 text-blue-800 px-3 py-1 rounded"
          >
            {n.msg}
          </div>
        ))}
      </div>

      {/* action bar */}
      <div className="mb-4 flex flex-wrap justify-end bg-white p-4 shadow space-x-2">
        <button onClick={onClear} className="px-4 py-2 bg-yellow-500 text-white rounded">
          Clear
        </button>
        <button
          onClick={() => {
            onClear();
            setMethod('');
            setBank('');
            setSaved(false);
            setStep('choose');
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
              onClear();
              setMethod('');
              setBank('');
              setSaved(false);
              setStep('choose');
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

      {/* upload/add row controls */}
      <div className="mb-4 flex flex-wrap items-end bg-white p-4 shadow space-x-4">
        <div>POS ID: <strong>{posId}</strong></div>
        <label className="flex  flex-col">
          Currency
          <select
            value={currency}
            onChange={e => {
              setCurrency(e.target.value);
              setRows(rs =>
                rs.map(r => ({ ...r, currency: r.currency || e.target.value }))
              );
              setSaved(false);
            }}
            className="border p-2 rounded"
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
              onChange={e => {
                setBank(e.target.value);
                setSaved(false);
              }}
              className="border p-2 rounded"
            >
              <option value="">--Select a Bank--</option>
              {BANKS.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col flex-grow">
          {method === 'ecocash' || method === 'cash' ? 'Add rows:' : 'Upload Excel'}
          {method === 'ecocash' || method === 'cash' ? (
            <select
              defaultValue=""
              onChange={e => handleAddRows(Number(e.target.value))}
              className="border p-2 rounded"
            >
              <option value="" disabled>Choose</option>
              {[1,5,10,20,100].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
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

      {/* data table */}
      <div className="bg-white p-4 shadow overflow-auto">
        {(method !== 'ecocash' && method !== 'cash') && (
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
              ? (method === 'bank' || method === 'pds'
                ? 'No data. Upload an Excel.'
                : 'No data. Use "Add rows" to add entries.')
              : 'No matching transactions.'}
          </p>
        ) : (
          <table className="min-w-full border">
            <thead>
              <tr>
                {(method === 'ecocash' || method === 'cash') ? (
                  <>
                    <th className="border px-2">Date</th>
                    <th className="border px-2">Amount</th>
                    <th className="border px-2">Rate</th>
                    <th className="border px-2">Converted</th>
                    <th className="border px-2">Remove</th>
                  </>
                ) : (
                  <>
                    <th className="border px-2">Txn Date</th>
                    <th className="border px-2">Value Date</th>
                    <th className="border px-2">Description</th>
                    <th className="border px-2">Credit</th>
                    <th className="border px-2">Debit</th>
                    <th className="border px-2">Balance</th>
                    <th className="border px-2">Currency</th>
                    <th className="border px-2">Rate</th>
                    <th className="border px-2">Converted</th>
                    <th className="border px-2">Bank</th>
                    <th className="border px-2">Remove</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tr key={idx}>
                  {(method === 'ecocash' || method === 'cash') ? (
                    <>
                      <td className="border px-2">
                        <input
                          type="date"
                          value={row.txnDate}
                          onChange={e => {
                            const nr = [...rows];
                            nr[idx].txnDate = e.target.value;
                            setRows(nr);
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
                            const nr = [...rows];
                            nr[idx].amount = e.target.value;
                            // update converted if rate present
                            const rate = parseFloat(nr[idx].rate) || 0;
                            nr[idx].converted = ((parseFloat(e.target.value)||0) * rate).toFixed(2);
                            setRows(nr);
                            setSaved(false);
                          }}
                          className="w-full"
                        />
                      </td>
                      <td className="border px-2">
                        <input
                          type="number"
                          value={row.rate}
                          onChange={e => handleRateChange(idx, e.target.value)}
                          className="w-full"
                        />
                      </td>
                      <td className="border px-2">
                        <input
                          type="text"
                          value={row.converted}
                          readOnly
                          className="w-full bg-gray-100"
                        />
                      </td>
                      <td className="border px-2 text-center">
                        <button
                          onClick={() => handleRemoveRow(idx)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                        >
                          X
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border px-2">
                        <input
                          type="date"
                          value={row.txnDate}
                          onChange={e => {
                            const nr = [...rows];
                            nr[idx].txnDate = e.target.value;
                            setRows(nr);
                            setSaved(false);
                          }}
                          className="w-full"
                        />
                      </td>
                      <td className="border px-2">
                        <input
                          type="date"
                          value={row.valueDate}
                          onChange={e => {
                            const nr = [...rows];
                            nr[idx].valueDate = e.target.value;
                            setRows(nr);
                            setSaved(false);
                          }}
                          className="w-full"
                        />
                      </td>
                      <td className="border px-2">
                        <input
                          type="text"
                          value={row.description}
                          onChange={e => {
                            const nr = [...rows];
                            nr[idx].description = e.target.value;
                            setRows(nr);
                            setSaved(false);
                          }}
                          className="w-full"
                        />
                      </td>
                      <td className="border px-2">
                        <input
                          type="number"
                          value={row.credit}
                          onChange={e => {
                            const nr = [...rows];
                            nr[idx].credit = e.target.value;
                            // update balance
                            const c = parseFloat(e.target.value) || 0;
                            const d = parseFloat(nr[idx].debit) || 0;
                            nr[idx].balance = String(c - d);
                            // update converted if rate present
                            const rate = parseFloat(nr[idx].rate) || 0;
                            nr[idx].converted = (c * rate).toFixed(2);
                            setRows(nr);
                            setSaved(false);
                          }}
                          className="w-full"
                        />
                      </td>
                      <td className="border px-2">
                        <input
                          type="number"
                          value={row.debit}
                          onChange={e => {
                            const nr = [...rows];
                            nr[idx].debit = e.target.value;
                            // update balance
                            const c = parseFloat(nr[idx].credit) || 0;
                            const d = parseFloat(e.target.value) || 0;
                            nr[idx].balance = String(c - d);
                            setRows(nr);
                            setSaved(false);
                          }}
                          className="w-full"
                        />
                      </td>
                      <td className="border px-2">
                        <input
                          readOnly
                          value={row.balance}
                          className="w-full bg-gray-100"
                        />
                      </td>
                      <td className="border px-2">
                        <select
                          value={row.currency}
                          onChange={e => {
                            const nr = [...rows];
                            nr[idx].currency = e.target.value;
                            setRows(nr);
                            setSaved(false);
                          }}
                          className="w-full px-5 py-15"
                        >
                          <option value="USD">USD</option>
                          <option value="ZWG">ZWG</option>
                        </select>
                      </td>
                      <td className="border px-2">
                        <input
                          type="number"
                          value={row.rate}
                          onChange={e => handleRateChange(idx, e.target.value)}
                          className="w-full"
                        />
                      </td>
                      <td className="border px-2">
                        <input
                          type="text"
                          value={row.converted}
                          readOnly
                          className="w-full bg-gray-100"
                        />
                      </td>
                      <td className="border px-2 text-center">{bank}</td>
                      <td className="border px-2 text-center">
                        <button
                          onClick={() => handleRemoveRow(idx)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                        >
                          X
                        </button>
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
