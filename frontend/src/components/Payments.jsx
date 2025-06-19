import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';

export default function Payments() {
  const { posId } = useParams();
  const { state: { name } = {} } = useLocation();
  const navigate = useNavigate();

  const [currency, setCurrency] = useState(localStorage.getItem('currency') || 'USD');
  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  const [excelData, setExcelData] = useState(
    JSON.parse(localStorage.getItem('paymentsExcelData') || '[]')
  );
  const [searchTerm, setSearchTerm] = useState(
    localStorage.getItem('paymentsSearchTerm') || ''
  );
  useEffect(() => {
    localStorage.setItem('paymentsExcelData', JSON.stringify(excelData));
  }, [excelData]);
  useEffect(() => {
    localStorage.setItem('paymentsSearchTerm', searchTerm);
  }, [searchTerm]);

  const [notification, setNotification] = useState(null);
  const showNote = (msg, type = 'success') => setNotification({ msg, type });

  const formatDate = dateObj => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleFileUpload = e => {
    const file = e.target.files[0];
    if (!file) {
      showNote('No file selected', 'error');
      return;
    }
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      showNote('Only .xlsx/.xls allowed', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
        const parsedRows = rawRows.map(row => {
          const newRow = {};
          Object.entries(row).forEach(([k, v]) => {
            newRow[k] = v instanceof Date ? formatDate(v) : v;
          });
          return newRow;
        });
        setExcelData(parsedRows);
        showNote('Excel loaded');
      } catch (err) {
        console.error('Failed to parse Excel:', err);
        showNote('Failed to parse Excel file', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredData = excelData.filter(row =>
    Object.values(row).some(val =>
      val.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const updateCell = (rowIdx, key, value) =>
    setExcelData(d =>
      d.map((row, i) => (i === rowIdx ? { ...row, [key]: value } : row))
    );

  const saveReportToServer = async () => {
    if (!name) {
      showNote('Name required', 'error');
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    const tableData = filteredData.map(row => {
      const m = { ...row };
      Object.keys(m).forEach(k => {
        m[k] = m[k].toString();
      });
      return m;
    });
    try {
      const res = await fetch('/api/reports/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, posId, date, currency,
          source: "sales", tableData
        }),
      });
      if (!res.ok) throw new Error();
      const { reportId } = await res.json();
      showNote(`Saved as report ${reportId}`);
    } catch {
      showNote('Save failed', 'error');
    }
  };

  const clearAll = () => {
    setExcelData([]);
    setSearchTerm('');
    localStorage.removeItem('paymentsExcelData');
    localStorage.removeItem('paymentsSearchTerm');
    showNote('Cleared');
  };

  const normalize = str =>
    str.toString().trim().toLowerCase().replace(/[\s_/]+/g, '');
  const findDateKey = row => Object.keys(row).find(k => normalize(k) === 'date') || null;
  const findSumKey = row =>
    Object.keys(row).find(k => normalize(k) === 'sumofpremiumcollected') || null;

  return (
    <div id="payments" className="flex flex-col pt-20 px-4 h-screen bg-gray-50">
      {notification && (
        <div className="fixed left-4 top-4 z-50 pointer-events-none">
          <div className={`pointer-events-auto p-4 rounded shadow-lg ${
              notification.type==='success'? 'bg-green-100' : 'bg-red-100'
            }`}>
            <div className="flex items-center justify-between">
              <span>{notification.msg}</span>
              <button onClick={()=>setNotification(null)} className="ml-4 font-bold">×</button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-white shadow flex pt-30 flex-wrap items-end space-x-4">
        <h1 className="text-xl font-bold flex-shrink-0">Sales</h1>
        <div className="text-sm text-gray-600">
          POS ID: <span className="font-medium">{posId}</span>
        </div>
        <label className="flex flex-col">
          <span className="text-sm">Currency</span>
          <select
            value={currency}
            onChange={e=>setCurrency(e.target.value)}
            className="p-2 border w-24 rounded"
          >
            <option value="USD">USD</option>
            <option value="ZWG">ZWG</option>
          </select>
        </label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="p-2 border rounded flex-grow min-w-[200px]"
        />
        {excelData.length > 0 && (
          <div className="flex flex-col flex-grow max-w-sm">
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={e=>setSearchTerm(e.target.value)}
              className="p-2 border rounded mb-2"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {filteredData.length > 0 ? (
          <div className="min-w-max">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  {Object.keys(filteredData[0]).map(h => (
                    <th
                      key={h}
                      className="p-2 border bg-gray-100 text-left text-sm"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {Object.entries(row).map(([k, v]) => {
                      const num = parseFloat(v);
                      const isNegative = !isNaN(num) && num < 0;
                      return (
                        <td key={k} className="p-2 border text-sm">
                          <input
                            type="text"
                            value={v}
                            onChange={e=>updateCell(i, k, e.target.value)}
                            className={`w-full p-1 border rounded text-sm ${isNegative ? 'text-red-600' : ''}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center">No data.</p>
        )}
      </div>

      <div className="p-4 bg-white shadow flex justify-end space-x-3">
        <button
          onClick={clearAll}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
        >Clear</button>
        {filteredData.length > 0 && (
          <button
            onClick={saveReportToServer}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
          >Save</button>
        )}
        <button
          onClick={()=>navigate(-1)}
          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded"
        >Back</button>
        <button
          onClick={() => {
            if (filteredData.length === 0) {
              showNote('No data to proceed', 'error');
              return;
            }
            const dateKey = findDateKey(filteredData[0]);
            const sumKey = findSumKey(filteredData[0]);
            if (!dateKey || !sumKey) {
              showNote('Ensure columns "Date" and "SumOfPremium_Collected" exist', 'error');
              return;
            }
            // group filtered rows by date
            const groupMap = {};
            filteredData.forEach(row => {
              const dateVal = row[dateKey];
              if (!dateVal) return;
              const raw = parseFloat(row[sumKey]) || 0;
              groupMap[dateVal] = (groupMap[dateVal] || 0) + raw;
            });
            const transformed = Object.entries(groupMap).map(([dateVal, totalRaw]) => ({
              Date: dateVal,
              SumOfPremium_Collected: totalRaw.toString(),
              // if you had Name per row and want to aggregate names, skip or handle separately
            }));
            navigate(
              `/payments/${posId}/cashbook`,
              { state: { name, data: transformed, currency } }
            );
          }}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
        >Next</button>
      </div>
    </div>
  );
}
