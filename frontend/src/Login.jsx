// src/Login.jsx
import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login({ setToken, setIsAdmin }) {
  const [view, setView] = useState('admin'); // 'admin' or 'manager'
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [notifications, setNotifications] = useState([]);

  const navigate = useNavigate();

  // In-UI toast helper
  const showNotification = msg => {
    const id = Date.now();
    setNotifications(n => [...n, { id, msg }]);
    setTimeout(() => {
      setNotifications(n => n.filter(x => x.id !== id));
    }, 3000);
  };

  const submitAdmin = async () => {
    try {
      const res = await axios.post(
        'http://localhost:3001/auth/login',
        { email: adminEmail, password: adminPassword }
      );
      setToken(res.data.token);
      const payload = JSON.parse(atob(res.data.token.split('.')[1]));
      setIsAdmin(payload.is_admin);
      showNotification('Successfully logged in');
      navigate('/add');
    } catch (err) {
      showNotification(err.response?.data || 'Admin login failed');
    }
  };

  const submitManager = async () => {
    try {
      const res = await axios.post(
        'http://localhost:3001/manager/login',
        { email: managerEmail, idNumber }
      );
      setToken(res.data.token);
      setIsAdmin(false);
      showNotification('Successfully logged in');
      navigate('/tenants');
    } catch (err) {
      showNotification(err.response?.data?.error || 'Manager login failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5f5] text-gray-700 relative">
      {/* In-UI toasts */}
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

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setView('admin')}
          className={`px-4 py-2 rounded-md font-semibold border border-white ${
            view === 'admin' ? 'bg-[#4F5862] text-white' : 'bg-[#8A9A57] text-white'
          }`}
        >
          ADMIN
        </button>
        <button
          onClick={() => setView('manager')}
          className={`px-4 py-2 rounded-md font-semibold border border-white ${
            view === 'manager' ? 'bg-[#4F5862] text-white' : 'bg-[#8A9A57] text-white'
          }`}
        >
          ACCOUNT MANAGER
        </button>
      </div>

      {view === 'admin' && (
        <div className="w-full max-w-sm bg-[#6E7881] rounded-lg shadow-md p-6">
          <div className="rounded-full border-4 border-white border-double p-1">
    <img
      src="/images/logo1.png"
      alt="Logo"
      className="h-36 w-36 rounded-full"
    />
  </div>
          <h1 className="text-2xl font-bold text-center pt-4 mb-6 text-white">
            ADMIN LOGIN
          </h1>
          <div className="mb-4">
            <label htmlFor="adminEmail" className="block mb-2 text-white">
              Email
            </label>
            <input
              id="adminEmail"
              type="email"
              placeholder="Enter your email"
              onChange={e => setAdminEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#6B8E23]"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="adminPassword" className="block mb-2 text-white">
              Password
            </label>
            <input
              id="adminPassword"
              type="password"
              placeholder="Enter your password"
              onChange={e => setAdminPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#6B8E23]"
            />
          </div>
          <button
            onClick={submitAdmin}
            className="w-full bg-white text-[#6E7881] hover:text-[#ffffff]  py-2 rounded-md hover:bg-[#556B2F] transition-colors"
          >
            LOGIN
          </button>
        </div>
      )}

      {view === 'manager' && (
        <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-6">
          <div className="rounded-full border-4 border-[#4F5862] border-double p-1">
    <img
      src="/images/logo1.png"
      alt="Logo"
      className="h-36 w-36 rounded-full"
    />
  </div>
          <h1 className="text-2xl font-bold text-center mb-6 pt-4 text-[#4F5862]">
            ACCOUNT MANAGER LOGIN
          </h1>
          <div className="mb-4">
            <label htmlFor="managerEmail" className="block mb-2 text-gray-700">
              Email
            </label>
            <input
              id="managerEmail"
              type="email"
              placeholder="Enter your email"
              onChange={e => setManagerEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#6B8E23]"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="idNumber" className="block mb-2 text-gray-700">
              ID Number
            </label>
            <input
              id="idNumber"
              type="text"
              placeholder="Enter your ID number"
              onChange={e => setIdNumber(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#6B8E23]"
            />
          </div>
          <button
            onClick={submitManager}
            className="w-full bg-[#8A9A57] text-white py-2 rounded-md hover:bg-[#556B2F] transition-colors"
          >
            LOGIN
          </button>
        </div>
      )}
    </div>
  );
}
