import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

const HEADERS = [
  "Date", "Gross Premium", "Cancellation", "Actual Gross",
  "Commission %", "Commission", "Net Premium", "ZINARA", "PPA GROSS",
  "PPA %", "PPA Commission", "Net PPA", "Approved expenses",
  "Expected remittances"
];

const CURRENCY_SYMBOLS = { USD: "$", ZWG: "ZWG " };

const normalize = str =>
  str.toString().trim().toLowerCase().replace(/[\s_/]+/g, "");

const getValue = (row, header) => {
  const key = Object.keys(row).find(k => normalize(k) === normalize(header));
  return key ? row[key] : "";
};

const formatAmt = (num, currency) =>
  `${CURRENCY_SYMBOLS[currency] || ""}${parseFloat(num || 0).toFixed(2)}`;

export default function Cashbook() {
  const { posId } = useParams();
  const { state: { name, data, currency: passedCurrency } = {} } = useLocation();
  const navigate = useNavigate();

  const [currency, setCurrency] = useState(
    passedCurrency || localStorage.getItem("currency") || "USD"
  );
  const [excelData, setExcelData] = useState([]);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    localStorage.setItem("currency", currency);
  }, [currency]);

  const showNote = (msg, type="success") => setNotification({msg, type});

  const findDateKey = row =>
    Object.keys(row).find(k => normalize(k) === "date") || null;
  const findSumKey = row =>
    Object.keys(row).find(k => normalize(k) === "sumofpremiumcollected") || null;

  const recalcRow = row => {
    const gp = parseFloat(getValue(row, "Gross Premium")) || 0;
    const canc = parseFloat(getValue(row, "Cancellation")) || 0;
    const actual = gp - canc;
    const commPct = parseFloat(row.commissionPct) || 0;
    const comm = actual * (commPct / 100);
    const netPrem = actual - comm;
    const ppaG = parseFloat(row.ppaGross) || 0;
    const ppaPct = parseFloat(row.ppaPct) || 0;
    const ppaComm = ppaG * (ppaPct / 100);
    const netP = ppaG - ppaComm;
    const zin = parseFloat(row.ZINARA) || 0;
    const exp = parseFloat(row.approvedExpenses) || 0;
    const remits = netPrem + zin + netP - exp;
    return {
      actualGross: parseFloat(actual.toFixed(2)),
      commission: parseFloat(comm.toFixed(2)),
      netPremium: parseFloat(netPrem.toFixed(2)),
      ppaCommission: parseFloat(ppaComm.toFixed(2)),
      netPpa: parseFloat(netP.toFixed(2)),
      expectedRemittances: parseFloat(remits.toFixed(2))
    };
  };

  useEffect(() => {
    if (Array.isArray(data) && data.length > 0) {
      const sample = data[0];
      const dateKey = findDateKey(sample);
      const sumKey = findSumKey(sample);
      if (!dateKey || !sumKey) {
        showNote("Invalid data from Payments", "error");
        setExcelData([]);
        return;
      }
      const rows = data.map(r => {
        const dateVal = r[dateKey];
        const raw = parseFloat(r[sumKey]) || 0;
        const gross = raw >= 0 ? raw : 0;
        const canc = raw < 0 ? Math.abs(raw) : 0;
        const row = {
          Date: dateVal,
          "Gross Premium": gross.toFixed(2),
          "Cancellation": canc.toFixed(2),
          commissionPct: 0,
          ppaGross: 0,
          ppaPct: 0,
          ZINARA: 0,
          approvedExpenses: 0
        };
        const derived = recalcRow(row);
        return {
          ...row,
          actualGross: derived.actualGross.toFixed(2),
          commission: derived.commission.toFixed(2),
          netPremium: derived.netPremium.toFixed(2),
          ppaCommission: derived.ppaCommission.toFixed(2),
          netPpa: derived.netPpa.toFixed(2),
          expectedRemittances: derived.expectedRemittances.toFixed(2)
        };
      });
      setExcelData(rows);
      localStorage.setItem("cashbookData", JSON.stringify(rows));
    } else {
      const saved = JSON.parse(localStorage.getItem("cashbookData") || "[]");
      setExcelData(saved);
    }
  }, [data]);

  const handleFieldChange = (i, field, val) => {
    const list = [...excelData];
    // keep two decimals for user-entered numeric fields?
    // if field is numeric, parse and toFixed(2); else store raw
    if (["commissionPct","ppaGross","ppaPct","ZINARA","approvedExpenses"].includes(field)) {
      list[i][field] = val;
    } else {
      list[i][field] = val;
    }
    const derived = recalcRow(list[i]);
    list[i].actualGross = derived.actualGross.toFixed(2);
    list[i].commission = derived.commission.toFixed(2);
    list[i].netPremium = derived.netPremium.toFixed(2);
    list[i].ppaCommission = derived.ppaCommission.toFixed(2);
    list[i].netPpa = derived.netPpa.toFixed(2);
    list[i].expectedRemittances = derived.expectedRemittances.toFixed(2);
    setExcelData(list);
    localStorage.setItem("cashbookData", JSON.stringify(list));
  };

  const saveReportToServer = async () => {
    if (!name) {
      showNote("Name required","error");
      return;
    }
    try {
      const date = new Date().toISOString().slice(0,10);
      const tableData = excelData.map(row => {
        const mapped = {};
        HEADERS.forEach(h => {
          switch(h) {
            case "Date":
              mapped[h] = getValue(row, "Date").toString();
              break;
            case "Gross Premium":
              mapped[h] = formatAmt(getValue(row, "Gross Premium"), currency);
              break;
            case "Cancellation":
              mapped[h] = formatAmt(getValue(row, "Cancellation"), currency);
              break;
            case "Actual Gross":
              mapped[h] = formatAmt(row.actualGross, currency);
              break;
            case "Commission %":
              mapped[h] = (row.commissionPct || 0).toString();
              break;
            case "Commission":
              mapped[h] = formatAmt(row.commission, currency);
              break;
            case "Net Premium":
              mapped[h] = formatAmt(row.netPremium, currency);
              break;
            case "ZINARA":
              mapped[h] = (row.ZINARA || 0).toString();
              break;
            case "PPA GROSS":
              mapped[h] = (row.ppaGross || 0).toString();
              break;
            case "PPA %":
              mapped[h] = (row.ppaPct || 0).toString();
              break;
            case "PPA Commission":
              mapped[h] = formatAmt(row.ppaCommission, currency);
              break;
            case "Net PPA":
              mapped[h] = formatAmt(row.netPpa, currency);
              break;
            case "Approved expenses":
              mapped[h] = (row.approvedExpenses || 0).toString();
              break;
            case "Expected remittances":
              mapped[h] = formatAmt(row.expectedRemittances, currency);
              break;
            default:
              mapped[h] = getValue(row, h).toString();
          }
        });
        return mapped;
      });
      const res = await fetch("/api/reports/upload", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name, posId, date, currency, source: "cashbook", tableData })
      });
      if(!res.ok) throw new Error();
      const { reportId } = await res.json();
      showNote(`Saved ID: ${reportId}`);
    } catch {
      showNote("Save failed","error");
    }
  };

  const clearAll = () => {
    setExcelData([]);
    localStorage.removeItem("cashbookData");
    showNote("Cleared");
  };

  return (
    <div id="cashbook" className="flex flex-col pt-36 px-4 h-screen bg-gray-50">
      {notification && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div className={`pointer-events-auto p-4 rounded shadow-lg ${
            notification.type==="success"?"bg-green-100":"bg-red-100"
          }`}>
            <div className="flex items-center justify-between">
              <span>{notification.msg}</span>
              <button onClick={()=>setNotification(null)} className="ml-4 font-bold">×</button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-white shadow flex flex-wrap items-end space-x-4">
        <h1 className="text-xl font-bold">Cashbook</h1>
        <label className="flex flex-col">
          <span className="text-sm">Currency</span>
          <select
            value={currency}
            onChange={e=>setCurrency(e.target.value)}
            className="p-2 w-24 border rounded"
          >
            <option value="USD">USD</option>
            <option value="ZWG">ZWG</option>
          </select>
        </label>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="min-w-max">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                {HEADERS.map(h => (
                  <th key={h} className="p-2 border bg-gray-100 text-left text-sm">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {excelData.length === 0
                ? (
                  <tr>
                    <td colSpan={HEADERS.length} className="p-4 text-center text-gray-500">
                      No data.
                    </td>
                  </tr>
                )
                : excelData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="p-2 border text-sm">{getValue(row, "Date")}</td>
                    <td className="p-2 border text-sm">{formatAmt(getValue(row, "Gross Premium"), currency)}</td>
                    <td className="p-2 border text-sm">{formatAmt(getValue(row, "Cancellation"), currency)}</td>
                    <td className="p-2 border text-sm">{formatAmt(row.actualGross, currency)}</td>
                    <td className="p-2 border">
                      <input
                        type="number"
                        value={row.commissionPct || ''}
                        onChange={e => handleFieldChange(i, "commissionPct", +e.target.value)}
                        className="w-16 p-1 border rounded text-sm"
                      />
                    </td>
                    <td className="p-2 border text-sm">{formatAmt(row.commission, currency)}</td>
                    <td className="p-2 border text-sm">{formatAmt(row.netPremium, currency)}</td>
                    <td className="p-2 border">
                      <input
                        type="number"
                        value={row.ZINARA || ''}
                        onChange={e => handleFieldChange(i, "ZINARA", +e.target.value)}
                        className="w-16 p-1 border rounded text-sm"
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        type="number"
                        value={row.ppaGross || ''}
                        onChange={e => handleFieldChange(i, "ppaGross", +e.target.value)}
                        className="w-16 p-1 border rounded text-sm"
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        type="number"
                        value={row.ppaPct || ''}
                        onChange={e => handleFieldChange(i, "ppaPct", +e.target.value)}
                        className="w-16 p-1 border rounded text-sm"
                      />
                    </td>
                    <td className="p-2 border text-sm">{formatAmt(row.ppaCommission, currency)}</td>
                    <td className="p-2 border text-sm">{formatAmt(row.netPpa, currency)}</td>
                    <td className="p-2 border">
                      <input
                        type="number"
                        value={row.approvedExpenses || ''}
                        onChange={e => handleFieldChange(i, "approvedExpenses", +e.target.value)}
                        className="w-16 p-1 border rounded text-sm"
                      />
                    </td>
                    <td className="p-2 border text-sm">{formatAmt(row.expectedRemittances, currency)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 bg-white shadow flex justify-end space-x-3">
        <button onClick={()=>navigate(-1)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded">Back</button>
        <button onClick={saveReportToServer} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">Done</button>
        <button onClick={clearAll} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded">Clear</button>
        <button
          onClick={() => navigate(`/payments/${posId}/sales`, { state: { name } })}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
}
