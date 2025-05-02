import { useState, useCallback } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import Login from './Login'
import AdminDashboard from './components/AdminDashboard'
import Recon from './pages/recon'
import TenantPage from './pages/TenantPage'
import Reconciliation from './components/TenantDetails'
import AdminNav from './components/AdminNav'

export default function App() {
  const [token, setTokenState] = useState(() => localStorage.getItem('token'))
  const [isAdmin, setIsAdminState] = useState(() =>
    JSON.parse(localStorage.getItem('isAdmin') || 'false')
  )

  const setToken = useCallback(tok => {
    setTokenState(tok)
    if (tok) localStorage.setItem('token', tok)
    else localStorage.removeItem('token')
  }, [])

  const setIsAdmin = useCallback(flag => {
    setIsAdminState(flag)
    localStorage.setItem('isAdmin', JSON.stringify(flag))
  }, [])

  const handleLogout = () => {
    setToken(null)
    setIsAdmin(false)
  }

  return (
    <Router>
      {!token ? (
        <Routes>
          <Route
            path="/"
            element={<Login setToken={setToken} setIsAdmin={setIsAdmin} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <div className="flex">
          {isAdmin && <AdminNav handleLogout={handleLogout} />}

          <div className="flex-1 min-h-screen bg-gray-100 p-4">
            <Routes>
              {isAdmin && (
                <>
                  <Route
                    path="/"
                    element={<AdminDashboard token={token} />}
                  />
                  <Route path="/recon" element={<Recon />} />
                </>
              )}

              <Route path="/tenants" element={<TenantPage />} />
              <Route path="/tenants/:tenantId" element={<TenantPage />} />
              <Route
                path="/reconciliation/:tenantId"
                element={<Reconciliation />}
              />

              <Route
                path="*"
                element={
                  <Navigate to={isAdmin ? '/' : '/tenants'} replace />
                }
              />
            </Routes>
          </div>
        </div>
      )}
    </Router>
  )
}
