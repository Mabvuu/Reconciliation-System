import React from 'react';

const AccountManager = ({ managers }) => {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto bg-white p-8 shadow-md rounded-md">
        <h1 className="text-2xl font-bold mb-4">Account Managers</h1>
        <ul>
          {managers.map((manager) => (
            <li key={manager.id} className="p-2 border-b">
              <strong>{manager.name}</strong> - {manager.email}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AccountManager;
