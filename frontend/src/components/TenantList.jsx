import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import AdminNav from '../components/AdminNav';

const TenantList = ({ tenants, addTenant, deleteTenant, isAccountManager }) => {
  const [newTenantName, setNewTenantName] = useState('');

  const handleAddTenant = (e) => {
    e.preventDefault();
    if (newTenantName.trim() === '') return;
    addTenant(newTenantName.trim());
    setNewTenantName('');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {isAccountManager ? <Navbar /> : <AdminNav />}
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-3xl font-bold text-center my-6">Tenant List</h1>
        <form onSubmit={handleAddTenant} className="flex mb-6">
          <input
            type="text"
            value={newTenantName}
            onChange={(e) => setNewTenantName(e.target.value)}
            placeholder="Enter tenant name"
            className="flex-grow px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-900"
          />
          <button
            type="submit"
            className="ml-2 bg-[#808000] hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            Add Tenant
          </button>
        </form>
        <ul className="list-none space-y-4">
          {tenants.map((tenant) => (
            <li
              key={tenant.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md"
            >
              <a
                href={`/tenants/${tenant.id}`}
                className="text-gray-800 hover:underline"
              >
                {tenant.name}
              </a>
              <button
                onClick={() => deleteTenant(tenant.id)}
                className="bg-red-500 hover:bg-[#808000] text-white font-bold py-1 px-3 rounded-lg"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TenantList;
