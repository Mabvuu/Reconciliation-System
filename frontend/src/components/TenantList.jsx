// src/components/TenantList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TenantList = ({ tenants, addTenant, removeTenant, addPosId }) => {
  const [tenantName, setTenantName] = useState('');
  const [posIdInput, setPosIdInput] = useState('');
  const [posSelection, setPosSelection] = useState({});
  const [newPosIdInputs, setNewPosIdInputs] = useState({});

  useEffect(() => {
    const initSel = {};
    tenants.forEach((t, idx) => {
      if (Array.isArray(t.posIds) && t.posIds.length > 0) {
        initSel[idx] = t.posIds[0];
      }
    });
    setPosSelection(prev => ({ ...initSel, ...prev }));
  }, [tenants]);

  const handleAddTenant = () => {
    const name = tenantName.trim();
    const posId = posIdInput.trim();
    if (!name || !posId) return;
    addTenant({
      name,
      posIds: [posId],
      dateAdded: new Date().toLocaleDateString(),
    });
    setTenantName('');
    setPosIdInput('');
  };

  const handleRemoveTenant = idx => {
    if (window.confirm('Delete this tenant?')) {
      removeTenant(idx);
      setPosSelection(prev => {
        const nxt = { ...prev };
        delete nxt[idx];
        return nxt;
      });
      setNewPosIdInputs(prev => {
        const nxt = { ...prev };
        delete nxt[idx];
        return nxt;
      });
    }
  };

  const handlePosSelectionChange = (idx, value) => {
    setPosSelection(prev => ({ ...prev, [idx]: value }));
  };

  const handleNewPosInputChange = (idx, value) => {
    setNewPosIdInputs(prev => ({ ...prev, [idx]: value }));
  };

  const handleAddPosId = idx => {
    const newId = (newPosIdInputs[idx] || '').trim();
    if (!newId) return;
    addPosId(idx, newId);
    setNewPosIdInputs(prev => ({ ...prev, [idx]: '' }));
    setPosSelection(prev => ({ ...prev, [idx]: newId }));
  };

  return (
    <div className="relative min-h-screen">
      {/* Tiled watermark over entire page */}
      <div
        className="absolute inset-0 bg-repeat opacity-20"
        style={{
          backgroundImage: "url('/images/logo1.png')",
          backgroundSize: '150px 150px',
        }}
      />
      {/* Page content */}
      <div className="relative z-10 pt-38 px-4 mx-auto max-w-4xl">
        <div className="bg-white shadow-sm rounded p-6 mb-8">
          <h3 className="text-xl text-gray-700 mb-4">Add New Agent</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="POS ID"
              value={posIdInput}
              onChange={e => setPosIdInput(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <input
              type="text"
              placeholder="Agent Name"
              value={tenantName}
              onChange={e => setTenantName(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <button
              onClick={handleAddTenant}
              className="w-full bg-[#808000] text-white rounded px-4 py-2 hover:bg-gray-700 transition"
            >
              Add Agent
            </button>
          </div>
        </div>

        <div className="overflow-x-auto bg-white shadow-sm rounded">
          <table className="w-full border-collapse text-gray-700">
            <thead>
              <tr>
                <th className="border-b border-gray-300 py-2 text-left text-base">
                  Agent Name
                </th>
                <th className="border-b border-gray-300 py-2 text-left text-base">
                  POS ID
                </th>
                <th className="border-b border-gray-300 py-2 text-left text-base">
                  Date Added
                </th>
                <th className="border-b border-gray-300 py-2 text-left text-base">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant, idx) => (
                <tr key={`${tenant.name}-${tenant.dateAdded}-${idx}`}>
                  <td className="border-b border-gray-200 py-2">
                    <Link
                      to={`/payments/${posSelection[idx] || ''}`}
                      state={{ name: tenant.name }}
                      className="text-black hover:underline font-normal"
                    >
                      {tenant.name}
                    </Link>
                  </td>
                  <td className="border-b border-gray-200 py-2">
                    <div className="flex items-center space-x-2">
                      <select
                        value={posSelection[idx] || ''}
                        onChange={e => handlePosSelectionChange(idx, e.target.value)}
                        className="border border-gray-300 rounded px-26 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
                      >
                        {Array.isArray(tenant.posIds) && tenant.posIds.length > 0 ? (
                          tenant.posIds.map((pid, i) => (
                            <option key={i} value={pid}>
                              {pid}
                            </option>
                          ))
                        ) : (
                          <option value="">No POS IDs</option>
                        )}
                      </select>
                      <input
                        type="text"
                        placeholder="New POS ID"
                        value={newPosIdInputs[idx] || ''}
                        onChange={e => handleNewPosInputChange(idx, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                      <button
                        onClick={() => handleAddPosId(idx)}
                        className="bg-[#808000] text-white rounded px-3 py-1 hover:bg-gray-700 transition text-sm"
                      >
                        Add
                      </button>
                    </div>
                  </td>
                  <td className="border-b border-gray-200 py-2">
                    {tenant.dateAdded}
                  </td>
                  <td className="border-b border-gray-200 py-2">
                    <button
                      onClick={() => handleRemoveTenant(idx)}
                      className="text-sm text-red-600 hover:text-red-800 focus:outline-none"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="py-4 text-center text-gray-500 font-normal"
                  >
                    No Agents added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TenantList;
