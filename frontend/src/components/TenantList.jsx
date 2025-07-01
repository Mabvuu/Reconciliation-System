// src/components/TenantList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TenantList = ({ tenants, addTenant, removeTenant, addPosId }) => {
  const [tenantName, setTenantName] = useState('');
  const [posIdInput, setPosIdInput] = useState('');
  const [posSelection, setPosSelection] = useState({});
  const [newPosIdInputs, setNewPosIdInputs] = useState({});
  const [notifications, setNotifications] = useState([]);

  // init dropdowns
  useEffect(() => {
    const init = {};
    tenants.forEach((t, i) => {
      if (t.posIds?.length) init[i] = t.posIds[0];
    });
    setPosSelection(prev => ({ ...init, ...prev }));
  }, [tenants]);

  // toast helper
  const showNotification = msg => {
    const id = Date.now();
    setNotifications(n => [...n, { id, msg }]);
    setTimeout(() => setNotifications(n => n.filter(x => x.id !== id)), 3000);
  };

  const handleAddTenant = () => {
    const name = tenantName.trim();
    const posId = posIdInput.trim();
    if (!name || !posId) return showNotification('Name & POS ID required');
    addTenant({ name, posIds: [posId], dateAdded: new Date().toLocaleDateString() });
    setTenantName('');
    setPosIdInput('');
    showNotification('Agent added');
  };

  // <— no window.confirm here anymore
  const handleRemoveTenant = idx => {
    removeTenant(idx);
    setPosSelection(prev => { const nxt = { ...prev }; delete nxt[idx]; return nxt; });
    setNewPosIdInputs(prev => { const nxt = { ...prev }; delete nxt[idx]; return nxt; });
    showNotification('Agent removed');
  };

  const handleAddPosId = idx => {
    const newId = (newPosIdInputs[idx] || '').trim();
    if (!newId) return showNotification('Enter new POS ID');
    addPosId(idx, newId);
    setNewPosIdInputs(prev => ({ ...prev, [idx]: '' }));
    setPosSelection(prev => ({ ...prev, [idx]: newId }));
    showNotification('POS ID added');
  };

  return (
    <div className="relative pt-30 min-h-screen">
      {/* WATERMARK */}
      <div
        className="absolute inset-0 bg-repeat opacity-20"
        style={{
          backgroundImage: "url('/images/logo.png')",
          backgroundSize: '150px 150px',
        }}
      />

      {/* NOTIFICATIONS */}
      <div className="fixed top-4 left-4 space-y-2 z-50">
        {notifications.map(n => (
          <div
            key={n.id}
            className="bg-gray-800 text-white px-4 py-2 rounded shadow"
          >
            {n.msg}
          </div>
        ))}
      </div>

      {/* PAGE CONTENT */}
      <div className="relative z-10 pt-10 px-4 mx-auto ">
        {/* ADD AGENT FORM */}
        <div className="bg-white shadow-sm rounded p-4 mb-8">
          <h3 className="text-xl text-gray-700 mb-3">Add New Agent</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="POS ID"
              value={posIdInput}
              onChange={e => setPosIdInput(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <input
              type="text"
              placeholder="Agent Name"
              value={tenantName}
              onChange={e => setTenantName(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <div /> {/* spacer */}
            <button
              onClick={handleAddTenant}
              className="w-full bg-[#8A9A57] text-white rounded px-2 py-1 hover:bg-gray-700 transition"
            >
              Add Agent
            </button>
          </div>
        </div>

        {/* TENANT TABLE */}
        <div className="overflow-x-auto bg-white shadow-sm rounded">
          <table className="w-full border-collapse text-gray-700">
            <thead>
              <tr>
                {['Agent Name','POS ID','Date Added','Actions'].map(h => (
                  <th
                    key={h}
                    className="border-b border-gray-300 py-1 px-2 text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t, idx) => (
                <tr key={`${t.name}-${t.dateAdded}-${idx}`}>
                  <td className="border-b border-gray-200 py-1 px-2">
                    <Link
                      to={`/payments/${posSelection[idx] || ''}`}
                      state={{ name: t.name }}
                      className="hover:underline"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="border-b border-gray-200 py-1 px-2">
                    <div className="flex items-center space-x-2">
                      <select
                        value={posSelection[idx] || ''}
                        onChange={e => setPosSelection(prev => ({ ...prev, [idx]: e.target.value }))}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400"
                      >
                        {(t.posIds && t.posIds.length > 0) ? (
                          t.posIds.map((pid, i) => <option key={i}>{pid}</option>)
                        ) : (
                          <option disabled>No POS IDs</option>
                        )}
                      </select>
                      <input
                        type="text"
                        placeholder="New POS ID"
                        value={newPosIdInputs[idx] || ''}
                        onChange={e => setNewPosIdInputs(prev => ({ ...prev, [idx]: e.target.value }))}
                        className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                      <button
                        onClick={() => handleAddPosId(idx)}
                        className="bg-[#8A9A57] text-white rounded px-2 py-1 hover:bg-gray-700 transition text-sm"
                      >
                        Add
                      </button>
                    </div>
                  </td>
                  <td className="border-b border-gray-200 py-1 px-2">
                    {t.dateAdded}
                  </td>
                  <td className="border-b border-gray-200 py-1 px-2">
                    <button
                      onClick={() => handleRemoveTenant(idx)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {tenants.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-4 text-center text-gray-500">
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
