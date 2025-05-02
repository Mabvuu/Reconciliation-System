// src/components/Cashbook.jsx
import React, { useState, useEffect } from 'react'
import NavBar from '../components/Navbar'
import * as XLSX from 'xlsx'

export default function Cashbook({ tenantId }) {
  const [formData, setFormData] = useState([])
  const [showModal, setShowModal] = useState(false)

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem(`transactions_${tenantId}`)
    return saved ? JSON.parse(saved) : []
  })
  const [reconciliations, setReconciliations] = useState(() => {
    const saved = localStorage.getItem(`reconciliations_${tenantId}`)
    return saved ? JSON.parse(saved) : []
  })
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('payment')
  const [isReconcileMode, setIsReconcileMode] = useState(false)
  const [selectedTransactions, setSelectedTransactions] = useState([])

  useEffect(() => {
    localStorage.setItem(
      `transactions_${tenantId}`,
      JSON.stringify(transactions)
    )
    localStorage.setItem(
      `reconciliations_${tenantId}`,
      JSON.stringify(reconciliations)
    )
  }, [transactions, reconciliations, tenantId])

  const addTransaction = () => {
    if (!amount || !description) return
    const tx = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      description,
      type,
      date: new Date().toLocaleString(),
    }
    setTransactions([...transactions, tx])
    setAmount(''); setDescription('')
  }

  const toggleReconcileMode = () => {
    setIsReconcileMode(!isReconcileMode)
    setSelectedTransactions([])
  }
  const toggleTransactionSelection = id => {
    setSelectedTransactions(sel =>
      sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]
    )
  }
  const handleReconcile = () => {
    if (!selectedTransactions.length) {
      alert('Select at least one transaction.')
      return
    }
    const now = new Date().toLocaleString()
    const items = transactions.filter(tx =>
      selectedTransactions.includes(tx.id)
    )
    setReconciliations([...reconciliations, { id: now, items }])
    setTransactions(
      transactions.filter(tx => !selectedTransactions.includes(tx.id))
    )
    setSelectedTransactions([])
  }

  const matchedTotal = selectedTransactions.reduce((sum, id) => {
    const tx = transactions.find(t => t.id === id)
    return tx ? sum + (tx.type === 'receipt' ? tx.amount : -tx.amount) : sum
  }, 0)
  const remainingTransactions = transactions.filter(
    tx => !selectedTransactions.includes(tx.id)
  )

  // **** Excel upload code from your Trial component ****
  const handleFileUpload = event => {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const binaryStr = e.target.result
      const workbook = XLSX.read(binaryStr, { type: 'binary' })
      const sheetName = workbook.SheetNames[0]
      const sheetData = XLSX.utils.sheet_to_json(
        workbook.Sheets[sheetName]
      )
      const mappedData = sheetData.map(row => ({
        date: row.Date || '',
        details: row.Details || '',
        payment: row.Payment || '',
        saleAmount: row['Sale Amount'] || '',
      }))
      setFormData(mappedData)
    }
    reader.readAsBinaryString(file)
  }

  const [isDesktop, setIsDesktop] = useState(true)
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  if (!isDesktop) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold text-red-500">
          Desktop only. Use a larger screen.
        </h2>
      </div>
    )
  }

  return (
    <div className="ml-64 w-4/5 p-4">
  
      <h2 className="text-xl font-bold mb-4 text-center">
        Cashbook for Tenant {tenantId}
      </h2>

      {/* Excel Upload */}
      <div className="mb-4">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          className="border p-2 rounded"
        />
      </div>

      {/* Manual Entry */}
      <div className="mb-4 text-center">
        <input
          type="text"
          placeholder="Amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="border rounded px-2 py-1 mr-2"
        />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="border rounded px-2 py-1 mr-2"
        />
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="border rounded px-10 py-1 mr-2"
        >
          <option value="payment">SALES</option>
          <option value="receipt">PAYMENTS</option>
        </select>
        <button
          onClick={addTransaction}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add Transaction
        </button>
      </div>

      {/* Reconcile Toggle */}
      <div className="text-center mb-4">
        <button
          onClick={toggleReconcileMode}
          className={`px-4 py-2 rounded ${
            isReconcileMode ? 'bg-red-500' : 'bg-green-500'
          } text-white`}
        >
          {isReconcileMode ? 'Exit Reconcile Mode' : 'Reconcile'}
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 grid-rows-2 gap-4">
        {/* Auto-Filled Form */}
        {formData.length > 0 && (
          <div className="bg-gray-100 p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-2 text-center">
              Auto-Filled Form
            </h3>
            <table className="table-auto border-collapse border border-gray-300 w-full">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border px-4 py-2">Date</th>
                  <th className="border px-4 py-2">Details</th>
                  <th className="border px-4 py-2">Payment</th>
                  <th className="border px-4 py-2">Sale Amount</th>
                </tr>
              </thead>
              <tbody>
                {formData.map((row, i) => (
                  <tr key={i}>
                    <td className="border px-4 py-2">{row.date}</td>
                    <td className="border px-4 py-2">{row.details}</td>
                    <td className="border px-4 py-2">{row.payment}</td>
                    <td className="border px-4 py-2">{row.saleAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Transactions */}
        <div className="bg-gray-100 p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4 text-center">
            Transactions
          </h3>
          <table className="table-auto border-collapse border border-gray-300 w-full">
            <thead>
              <tr className="bg-gray-200">
                {isReconcileMode && <th className="border px-4 py-2"></th>}
                <th className="border px-4 py-2">Description</th>
                <th className="border px-4 py-2">Receipt</th>
                <th className="border px-4 py-2">Payment</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} className="bg-white">
                  {isReconcileMode && (
                    <td className="border px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(tx.id)}
                        onChange={() => toggleTransactionSelection(tx.id)}
                      />
                    </td>
                  )}
                  <td className="border px-4 py-2">{tx.description}</td>
                  <td className="border px-4 py-2">
                    {tx.type === 'receipt' && `$${tx.amount.toFixed(2)}`}
                  </td>
                  <td className="border px-4 py-2">
                    {tx.type === 'payment' && `$${tx.amount.toFixed(2)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Matched */}
        <div className="bg-gray-100 p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4 text-center">Matched</h3>
          <ul className="space-y-2">
            {selectedTransactions.map(id => {
              const tx = transactions.find(t => t.id === id)
              return (
                <li
                  key={id}
                  className="bg-white p-2 rounded shadow flex justify-between"
                >
                  <span>{tx.description}</span>
                  <span>
                    {tx.type === 'receipt'
                      ? `+$${tx.amount.toFixed(2)}`
                      : `-$${tx.amount.toFixed(2)}`}
                  </span>
                </li>
              )
            })}
          </ul>
          <div className="text-center mt-4">
            <button
              onClick={handleReconcile}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Reconcile (Total: ${matchedTotal.toFixed(2)})
            </button>
          </div>
        </div>

        {/* Remaining & Sessions */}
        <div className="bg-gray-100 p-4 rounded shadow">
          <h3
            className="text-lg font-semibold mb-4 text-center cursor-pointer"
            onClick={() => setShowModal(true)}
          >
            Reconciled Sessions ({reconciliations.length})
          </h3>
          <h3 className="text-lg font-semibold mb-4 text-center">
            Remaining
          </h3>
          <ul className="space-y-2">
            {remainingTransactions.map(tx => (
              <li
                key={tx.id}
                className="bg-white p-2 rounded shadow flex justify-between"
              >
                <span>{tx.description}</span>
                <span>${tx.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg max-h-full overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">All Reconciliations</h3>
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1 bg-red-500 text-white rounded"
              >
                Close
              </button>
            </div>
            {reconciliations.map(rec => (
              <div key={rec.id} className="mb-4 p-2 border rounded">
                <p className="font-semibold">Session: {rec.id}</p>
                <ul className="pl-4 list-disc">
                  {rec.items.map(item => (
                    <li key={item.id}>
                      {item.description} —{' '}
                      {item.type === 'receipt'
                        ? `+$${item.amount.toFixed(2)}`
                        : `-$${item.amount.toFixed(2)}`}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
