// frontend/src/components/SalesOne.jsx
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

const PDS_CHANNELS = [
  "Ecocash",
  "OneMoney",
  "MukuruWallet",
];

export default function SalesOne() {
  const { posId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const nameFromState = location.state?.name;
  const name = nameFromState || localStorage.getItem('agentName') || '';

  useEffect(() => {
    if (nameFromState) {
      try {
        localStorage.setItem('agentName', nameFromState);
      } catch (err) {
        console.error('Failed to store agentName:', err);
      }
    }
  }, [nameFromState]);

  const [step, setStep] = useState('choose');
  const [method, setMethod] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [bank, setBank] = useState('');
  const [pdsChannel, setPdsChannel] = useState('');
  const [rows, setRows] = useState([]);
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const STORAGE_KEY = `sales_in_progress_${posId}`;
  const PAYMENTS_KEY = `payments_${posId}`;

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
          setPdsChannel(obj.pdsChannel || '');
          if (Array.isArray(obj.rows)) setRows(obj.rows);
          setSaved(!!obj.saved);
        }
      }
    } catch (err) {
      console.error("Load state error:", err);
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    const toStore = { step, method, currency, bank, pdsChannel, rows, saved };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (err) {
      console.error("Save state error:", err);
    }
  }, [STORAGE_KEY, step, method, currency, bank, pdsChannel, rows, saved]);

  const showNotification = msg => {
    const id = Date.now() + Math.random();
    setNotifications(n => [...n, { id, msg }]);
    setTimeout(() => {
      setNotifications(n => n.filter(x => x.id !== id));
    }, 3000);
  };

  const mapRow = raw => {
    if (method === 'ecocash' || method === 'cash') {
      const out = {};
      Object.keys(raw).forEach(key => {
        const norm = key.trim().toLowerCase().replace(/\s+/g, '');
        const val = raw[key];
        if (norm === 'txndate' || norm === 'transactiondate' || norm === 'date') {
          out.txnDate = val instanceof Date
            ? val.toISOString().split('T')[0]
            : String(val);
        }
        if (norm === 'amount' || norm === 'value' || norm === 'credit' || norm === 'debit') {
          out.amount = String(val);
        }
      });
      if (!out.txnDate) out.txnDate = '';
      if (out.amount == null) out.amount = '';
      return out;
    } else {
      const out = {
        txnDate: '',
        valueDate: '',
        posId: '',
        description: '',
        credit: '',
        debit: '',
        balance: '',
        currency: '',
      };
      Object.keys(raw).forEach(key => {
        const norm = key.trim().toLowerCase().replace(/\s+/g, '');
        const val = raw[key];
        if (norm === 'txndate' || norm === 'transactiondate') {
          out.txnDate = val instanceof Date ? val.toISOString().split('T')[0] : String(val);
        } else if (norm === 'valuedate') {
          out.valueDate = val instanceof Date ? val.toISOString().split('T')[0] : String(val);
        } else if (norm === 'posid' || norm === 'pos') {
          out.posId = String(val);
        } else if (norm === 'description') {
          out.description = String(val);
        } else if (norm === 'debit') {
          out.debit = String(val);
        } else if (norm === 'credit') {
          out.credit = String(val);
        } else if (norm === 'balance') {
          out.balance = String(val);
        } else if (norm === 'currency') {
          out.currency = String(val);
        }
      });
      if (!out.posId) out.posId = posId;
      if (!out.currency) out.currency = currency;
      const c = parseFloat(out.credit) || 0;
      const d = parseFloat(out.debit) || 0;
      out.balance = String(c - d);
      return out;
    }
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
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
        let parsed = json.map(mapRow);
        if (method !== 'ecocash' && method !== 'cash') {
          parsed = parsed.filter(r => {
            const desc = (r.description || '').toLowerCase();
            return desc.includes(String(posId).toLowerCase());
          });
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
    const newRows = Array.from({ length: count }, () => {
      if (method === 'ecocash' || method === 'cash') {
        return { txnDate: '', amount: '' };
      } else {
        return {
          txnDate: '',
          valueDate: '',
          posId: posId,
          description: '',
          credit: '',
          debit: '',
          balance: '',
          currency: currency,
        };
      }
    });
    setRows(r => [...r, ...newRows]);
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
    if (method === 'pds' && !pdsChannel) {
      showNotification("Select a PDS channel.");
      return;
    }
    try {
      const raw = localStorage.getItem(PAYMENTS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ method, rows });
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
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const prev = JSON.parse(raw);
        if (prev.method && prev.method !== method) {
          onClear();
          setBank('');
          setPdsChannel('');
          setSaved(false);
        }
      }
    } catch (err) {
      console.error("Continue load error:", err);
    }
    setStep('form');
  };

  const WatermarkGrid = () => (
    <div
      className="absolute inset-0 bg-repeat opacity-20"
      style={{
        backgroundImage: "url('/images/logo1.png')",
        backgroundSize: '150px 150px',
      }}
    />
  );

  const filteredRows = (method === 'ecocash' || method === 'cash')
    ? rows
    : rows.filter(r =>
        searchTerm.trim() === '' ||
        (r.description || '').toLowerCase().includes(searchTerm.trim().toLowerCase())
      );

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

  return (
    <div className="min-h-screen bg-gray-50 pt-50 px-4">
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
        {/* Top action buttons */}
        <div className="p-4 bg-white shadow flex flex-wrap items-center justify-end space-x-3 mb-4">
          <button
            onClick={onClear}
            className="px-4 py-2 bg-yellow-500 text-white rounded"
          >
            Clear
          </button>
          <button
            onClick={() => {
              onClear();
              setMethod('');
              setBank('');
              setPdsChannel('');
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
                onClear();
                setMethod('');
                setBank('');
                setPdsChannel('');
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
            onClick={() => setStep('choose')}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded"
          >
            Back
          </button>
          <button
            onClick={() => navigate(`/payments/${posId}/summary`, { state: { name } })}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
          >
            Next
          </button>
        </div>

        <div className="p-4 bg-white shadow flex flex-wrap items-end space-x-4 mb-4">
          <h1 className="text-xl font-bold w-full">Payments</h1>
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
                  rs.map(r => {
                    if (method !== 'ecocash' && method !== 'cash') {
                      return { ...r, currency: r.currency || e.target.value };
                    }
                    return r;
                  })
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
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>
          )}
          {method === 'pds' && (
            <label className="flex flex-col">
              <span className="text-sm">PDS Channel</span>
              <select
                value={pdsChannel}
                onChange={e => {
                  setPdsChannel(e.target.value);
                  setSaved(false);
                }}
                className="p-2 border rounded"
              >
                <option value="">--Select Channel--</option>
                {PDS_CHANNELS.map(ch => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </label>
          )}
          {(method === 'bank' || method === 'pds') ? (
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
            <p className="text-gray-500 text-center">
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
                      {method === 'bank' && <th className="border px-2">Bank</th>}
                      {method === 'pds' && <th className="border px-2">Channel</th>}
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
                              const newRows = [...rows];
                              newRows[idx].txnDate = e.target.value;
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
                              const newRows = [...rows];
                              newRows[idx].txnDate = e.target.value;
                              setRows(newRows);
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
                              const newRows = [...rows];
                              newRows[idx].valueDate = e.target.value;
                              setRows(newRows);
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
                            value={row.credit}
                            onChange={e => {
                              const newRows = [...rows];
                              newRows[idx].credit = e.target.value;
                              const c = parseFloat(e.target.value) || 0;
                              const d = parseFloat(newRows[idx].debit) || 0;
                              newRows[idx].balance = String(c - d);
                              setRows(newRows);
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
                              const newRows = [...rows];
                              newRows[idx].debit = e.target.value;
                              const c = parseFloat(newRows[idx].credit) || 0;
                              const d = parseFloat(e.target.value) || 0;
                              newRows[idx].balance = String(c - d);
                              setRows(newRows);
                              setSaved(false);
                            }}
                            className="w-full"
                          />
                        </td>
                        <td className="border px-2">
                          <input
                            type="text"
                            value={row.balance}
                            readOnly
                            className="w-full bg-gray-100"
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
                        {method === 'pds' && (
                          <td className="border px-2 text-center">{pdsChannel}</td>
                        )}
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
    </div>
  );
}
