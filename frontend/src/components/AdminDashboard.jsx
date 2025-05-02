// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from '../api/admin'; // axios instance, baseURL = http://localhost:3001
import AdminNav from './AdminNav';

const AdminDashboard = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [managers, setManagers] = useState([]);
  const [editIndex, setEditIndex] = useState(null);

  // fetch all managers on mount
  useEffect(() => {
    axios.get('/manager')
      .then(res => setManagers(res.data))
      .catch(() => {});
  }, []);

  const handleAddOrEdit = async () => {
    setMessage(''); setError('');
    if (!email.trim() || !name.trim()) {
      return setError('Both name and email are required!');
    }
    if (editIndex === null && managers.some(m => m.email === email)) {
      return setError('This email is already in use!');
    }

    try {
      if (editIndex !== null) {
        const mgr = managers[editIndex];
        await axios.put(`/manager/${mgr.id_number}`, { email, name });
        setManagers(ms =>
          ms.map((m, i) =>
            i === editIndex ? { ...m, email, name } : m
          )
        );
        setMessage('Manager updated successfully!');
      } else {
        const res = await axios.post('/manager/register', { email, name });
        setManagers(ms => [
          ...ms,
          { email, name, id_number: res.data.id_number }
        ]);
        setMessage(res.data.message);
      }
      setEmail(''); setName(''); setEditIndex(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong!');
    }
  };

  const handleDelete = async (idNumber) => {
    setMessage(''); setError('');
    try {
      await axios.delete(`/manager/${idNumber}`);
      setManagers(ms => ms.filter(m => m.id_number !== idNumber));
      setMessage('Manager deleted successfully!');
    } catch {
      setError('Failed to delete manager.');
    }
  };

  const startEdit = (i) => {
    const m = managers[i];
    setEditIndex(i);
    setName(m.name);
    setEmail(m.email);
    setMessage(''); setError('');
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex">
      <div className="w-1/4 bg-[#808000] text-white">
        <AdminNav />
      </div>

      <div className="w-3/4 flex items-center justify-center p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white shadow-lg rounded-lg p-8 max-w-5xl w-full">
          {/* Form */}
          <div className="p-6 bg-[#f5f5f5] rounded-md">
            <h1 className="text-3xl font-bold mb-6 text-[#808000] text-center">
              {editIndex !== null ? 'Edit Manager' : 'Add Account Manager'}
            </h1>
            <label className="block text-[#6B8E23] font-medium mb-2">Name</label>
            <input
              className="w-full px-4 py-2 border border-[#808000] rounded-md focus:outline-none focus:ring-2 focus:ring-[#6B8E23] mb-4"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter name"
            />
            <label className="block text-[#6B8E23] font-medium mb-2">Email</label>
            <input
              className="w-full px-4 py-2 border border-[#808000] rounded-md focus:outline-none focus:ring-2 focus:ring-[#6B8E23] mb-6"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter email"
            />
            <button
              className="w-full bg-[#808000] text-white py-2 rounded-md hover:bg-[#556B2F] transition-colors"
              onClick={handleAddOrEdit}
            >
              {editIndex !== null ? 'Update Manager' : 'Add Manager'}
            </button>
            {message && <p className="mt-4 text-center text-green-500">{message}</p>}
            {error   && <p className="mt-4 text-center text-red-500">{error}</p>}
          </div>

          {/* List */}
          <div className="p-6 bg-[#f5f5f5] rounded-md">
            <h1 className="text-3xl font-bold mb-6 text-[#808000] text-center">
              Account Managers
            </h1>
            {managers.length === 0 && (
              <p className="text-center text-gray-500">No managers added yet.</p>
            )}
            <ul className="space-y-4">
              {managers.map((m, i) => (
                <li
                  key={`${m.id_number}-${i}`}
                  className="flex justify-between items-center bg-white p-4 rounded-md shadow-sm"
                >
                  <div>
                    <p className="font-medium text-[#6B8E23]">Name: {m.name}</p>
                    <p className="font-medium text-[#6B8E23]">Email: {m.email}</p>
                    <p className="text-gray-600">ID: {m.id_number}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                      onClick={() => startEdit(i)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-700"
                      onClick={() => handleDelete(m.id_number)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
