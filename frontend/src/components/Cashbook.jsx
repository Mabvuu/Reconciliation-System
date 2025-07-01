// frontend/src/components/Cashbook.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

const HEADERS = [
  "Date", "Gross Premium", "Cancellation", "Actual Gross",
  "Commission %", "Commission", "Net Premium", "ZINARA", "PPA GROSS",
  "PPA %", "PPA Commission", "Net PPA", "Approved expenses",
  "Expected remittances", "Remittances collected", "Balance",
  "Accumulative Balance", "Comment"
];

const CURRENCY_SYMBOLS = { USD: "$", ZWG: "ZWG " };

// never show “-0.00”
const formatAmt = (num, currency) => {
  let val = parseFloat(num) || 0;
  if (Math.abs(val) < 0.005) val = 0;
  return `${CURRENCY_SYMBOLS[currency] || ""}${val.toFixed(2)}`;
};

const normalize = str =>
  str.toString().trim().toLowerCase().replace(/[\s_/]+/g, "");

const getValue = (row, header) => {
  const key = Object.keys(row).find(k => normalize(k) === normalize(header));
  return key ? row[key] : "";
};

export default function Cashbook() {
  const { posId } = useParams();
  const { state: { name, data, currency: passedCurrency } = {} } = useLocation();
  const navigate = useNavigate();

  const [currency, setCurrency] = useState(
    passedCurrency || localStorage.getItem("currency") || "USD"
  );
  const [excelData, setExcelData] = useState([]);
  const [overallComment, setOverallComment] = useState("");
  const [notification, setNotification] = useState(null);
  const [combinedMap, setCombinedMap] = useState({});

  useEffect(() => {
    localStorage.setItem("currency", currency);
  }, [currency]);

  const showNote = (msg, type = "success") =>
    setNotification({ msg, type });

  // build combinedMap
  useEffect(() => {
    const key = `payments_${posId}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) { setCombinedMap({}); return; }
      const arr = JSON.parse(raw);
      const map = {};
      arr.forEach(({ method, rows }) =>
        rows.forEach(r => {
          const d = r.txnDate || "";
          if (!d) return;
          let amt = 0;
          if (method === "ecocash" || method === "cash") {
            amt = parseFloat(r.amount) || 0;
          } else {
            const credit = parseFloat(r.credit) || 0;
            if (credit <= 0) return;
            amt = credit;
          }
          map[d] = (map[d] || 0) + amt;
        })
      );
      setCombinedMap(map);
    } catch {
      setCombinedMap({});
    }
  }, [posId]);

  // recalc one row
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
    const remCollected = parseFloat(row.remittancesCollected) || 0;
    const balance = remits - remCollected;
    return {
      actualGross: +actual.toFixed(2),
      commission: +comm.toFixed(2),
      netPremium: +netPrem.toFixed(2),
      ppaCommission: +ppaComm.toFixed(2),
      netPpa: +netP.toFixed(2),
      expectedRemittances: +remits.toFixed(2),
      balance: +balance.toFixed(2)
    };
  };

  // load/build rows + add accumulative + comments
  useEffect(() => {
    let rows = [];

    if (Array.isArray(data) && data.length > 0) {
      const grouped = {};
      data.forEach(r => {
        const d = r["Date"];
        if (!d) return;
        grouped[d] = grouped[d] || { gross: 0, canc: 0 };
        grouped[d].gross += parseFloat(r["Gross Premium"]) || 0;
        grouped[d].canc += parseFloat(r["Cancellation"]) || 0;
      });
      rows = Object.entries(grouped).map(([date, sums]) => {
        const base = {
          Date: date,
          "Gross Premium": sums.gross.toFixed(2),
          "Cancellation": sums.canc.toFixed(2),
          // manual inputs start blank
          commissionPct: "",
          ppaGross: "",
          ppaPct: "",
          ZINARA: "",
          approvedExpenses: "",
          remittancesCollected: (combinedMap[date] || 0).toFixed(2)
        };
        const d = recalcRow(base);
        return {
          ...base,
          actualGross: d.actualGross.toFixed(2),
          commission: d.commission.toFixed(2),
          netPremium: d.netPremium.toFixed(2),
          ppaCommission: d.ppaCommission.toFixed(2),
          netPpa: d.netPpa.toFixed(2),
          expectedRemittances: d.expectedRemittances.toFixed(2),
          balance: d.balance.toFixed(2)
        };
      });
    } else {
      // reload saved rows—but blank out manual fields
      const saved = JSON.parse(localStorage.getItem("cashbookData") || "[]");
      rows = saved.map(r => {
        r.remittancesCollected = (combinedMap[r.Date] || 0).toFixed(2);
        r.balance = recalcRow(r).balance.toFixed(2);
        // force blank if zero or missing
        r.commissionPct = r.commissionPct ? r.commissionPct : "";
        r.ppaGross      = r.ppaGross      ? r.ppaGross      : "";
        r.ppaPct        = r.ppaPct        ? r.ppaPct        : "";
        r.ZINARA        = r.ZINARA        ? r.ZINARA        : "";
        r.approvedExpenses = r.approvedExpenses ? r.approvedExpenses : "";
        return r;
      });
    }

    // compute accumulative, per-row comments, overall comment
    let cum = 0;
    const withAccum = rows.map(r => {
      const bal = parseFloat(r.balance);
      cum += bal;
      const comment = bal < 0
        ? "overpayment"
        : bal > 0
          ? "shortfall"
          : "Balanced";
      return {
        ...r,
        accumBalance: cum.toFixed(2),
        comment
      };
    });

    setOverallComment(
      cum < 0 ? "overpayment"
      : cum > 0 ? "shortfall"
      : "Balanced"
    );

    setExcelData(withAccum);
    localStorage.setItem("cashbookData", JSON.stringify(withAccum));
  }, [data, combinedMap]);

  const handleFieldChange = (i, field, val) => {
    const list = [...excelData];
    if (["commissionPct","ppaGross","ppaPct","ZINARA","approvedExpenses"].includes(field)) {
      list[i][field] = val;
      const d = recalcRow(list[i]);
      list[i].actualGross       = d.actualGross.toFixed(2);
      list[i].commission        = d.commission.toFixed(2);
      list[i].netPremium        = d.netPremium.toFixed(2);
      list[i].ppaCommission     = d.ppaCommission.toFixed(2);
      list[i].netPpa            = d.netPpa.toFixed(2);
      list[i].expectedRemittances = d.expectedRemittances.toFixed(2);
      list[i].balance           = d.balance.toFixed(2);

      // recompute accumulative + comments
      let cum2 = 0;
      const updated = list.map(r => {
        const bal2 = parseFloat(r.balance);
        cum2 += bal2;
        const comment2 = bal2 < 0
          ? "overpayment"
          : bal2 > 0
            ? "shortfall"
            : "Balanced";
        return {
          ...r,
          accumBalance: cum2.toFixed(2),
          comment: comment2
        };
      });

      setOverallComment(
        cum2 < 0 ? "overpayment"
        : cum2 > 0 ? "shortfall"
        : "Balanced"
      );

      setExcelData(updated);
      localStorage.setItem("cashbookData", JSON.stringify(updated));
    }
  };

  const saveReportToServer = async () => {
    if (!name) { showNote("Name required","error"); return; }
    try {
      const date = new Date().toISOString().slice(0,10);
      const tableData = excelData.map(row => {
        const m = {};
        HEADERS.forEach(h => {
          switch(h) {
            case "Date": m[h]=row.Date; break;
            case "Gross Premium": m[h]=formatAmt(row["Gross Premium"],currency); break;
            case "Cancellation": m[h]=formatAmt(row["Cancellation"],currency); break;
            case "Actual Gross": m[h]=formatAmt(row.actualGross,currency); break;
            case "Commission %": m[h]=(row.commissionPct||"").toString(); break;
            case "Commission": m[h]=formatAmt(row.commission,currency); break;
            case "Net Premium": m[h]=formatAmt(row.netPremium,currency); break;
            case "ZINARA": m[h]=(row.ZINARA||"").toString(); break;
            case "PPA GROSS": m[h]=(row.ppaGross||"").toString(); break;
            case "PPA %": m[h]=(row.ppaPct||"").toString(); break;
            case "PPA Commission": m[h]=formatAmt(row.ppaCommission,currency); break;
            case "Net PPA": m[h]=formatAmt(row.netPpa,currency); break;
            case "Approved expenses": m[h]=(row.approvedExpenses||"").toString(); break;
            case "Expected remittances": m[h]=formatAmt(row.expectedRemittances,currency); break;
            case "Remittances collected": m[h]=formatAmt(row.remittancesCollected,currency); break;
            case "Balance": m[h]=formatAmt(row.balance,currency); break;
            case "Accumulative Balance": m[h]=formatAmt(row.accumBalance,currency); break;
            case "Comment": m[h]=row.comment; break;
            default: m[h]="";
          }
        });
        return m;
      });
      const res = await fetch("/api/reports/upload", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ name,posId,date,currency,source:"cashbook",tableData })
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
        {overallComment && (
          <div className="text-lg font-semibold ml-4">
            Overall status: {overallComment}
          </div>
        )}
        <label className="flex flex-col ml-auto">
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
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {HEADERS.map(h=>(
                <th key={h} className="p-2 border bg-gray-100 text-left text-sm">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {excelData.length===0?(
              <tr>
                <td colSpan={HEADERS.length} className="p-4 text-center text-gray-500">
                  No data.
                </td>
              </tr>
            ):excelData.map((row,i)=>(
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-2 border text-sm">{row.Date}</td>
                <td className="p-2 border text-sm">{formatAmt(row["Gross Premium"],currency)}</td>
                <td className="p-2 border text-sm">{formatAmt(row["Cancellation"],currency)}</td>
                <td className="p-2 border text-sm">{formatAmt(row.actualGross,currency)}</td>
                <td className="p-2 border">
                  <input
                    type="number"
                    value={row.commissionPct}
                    onChange={e=>handleFieldChange(i,"commissionPct",+e.target.value)}
                    className="w-16 p-1 border rounded text-sm"
                  />
                </td>
                <td className="p-2 border text-sm">{formatAmt(row.commission,currency)}</td>
                <td className="p-2 border text-sm">{formatAmt(row.netPremium,currency)}</td>
                <td className="p-2 border">
                  <input
                    type="number"
                    value={row.ZINARA}
                    onChange={e=>handleFieldChange(i,"ZINARA",+e.target.value)}
                    className="w-16 p-1 border rounded text-sm"
                  />
                </td>
                <td className="p-2 border">
                  <input
                    type="number"
                    value={row.ppaGross}
                    onChange={e=>handleFieldChange(i,"ppaGross",+e.target.value)}
                    className="w-16 p-1 border rounded text-sm"
                  />
                </td>
                <td className="p-2 border">
                  <input
                    type="number"
                    value={row.ppaPct}
                    onChange={e=>handleFieldChange(i,"ppaPct",+e.target.value)}
                    className="w-16 p-1 border rounded text-sm"
                  />
                </td>
                <td className="p-2 border text-sm">{formatAmt(row.ppaCommission,currency)}</td>
                <td className="p-2 border text-sm">{formatAmt(row.netPpa,currency)}</td>
                <td className="p-2 border">
                  <input
                    type="number"
                    value={row.approvedExpenses}
                    onChange={e=>handleFieldChange(i,"approvedExpenses",+e.target.value)}
                    className="w-16 p-1 border rounded text-sm"
                  />
                </td>
                <td className="p-2 border text-sm">{formatAmt(row.expectedRemittances,currency)}</td>
                <td className="p-2 border text-sm">{formatAmt(row.remittancesCollected,currency)}</td>
                <td className="p-2 border text-sm">{formatAmt(row.balance,currency)}</td>
                <td className="p-2 border text-sm">{formatAmt(row.accumBalance,currency)}</td>
                <td className="p-2 border text-sm">{row.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-white shadow flex justify-end space-x-3">
        <button onClick={()=>navigate(-1)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded">Back</button>
        <button onClick={saveReportToServer} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">Done</button>
        <button onClick={clearAll} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded">Clear</button>
        <button
          onClick={()=>navigate(`/payments/${posId}/sales`,{ state:{ name } })}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
}
