import { Link } from 'react-router-dom'

export default function AdminNav({ handleLogout }) {
  return (
    <nav className="fixed top-0 left-0 h-full w-64 flex flex-col justify-between bg-[#6B8E23] border-r-2 border-white border-opacity-50 shadow-lg py-8">
      <div className="flex flex-col items-center space-y-4">
        <img
          src="/images/logo1.png"
          alt="Logo"
          className="h-24 w-24 rounded-full border-2 border-white"
        />
        <h2 className="text-white text-xl font-bold uppercase tracking-wide">
          Admin
        </h2>
      </div>

      <ul className="flex-1 mt-8 px-6 space-y-4">
        {[
          { to: '/tenants', label: 'Tenant List' },
          { to: '/add-tenants', label: 'Add Tenants' },
          { to: '/messages', label: 'Messages' },
          { to: '/notes', label: 'Notes' },
          { to: '/details', label: 'Details' },
        ].map(({ to, label }) => (
          <li key={to}>
            <Link
              to={to}
              className="block text-white text-lg font-semibold uppercase tracking-wide transform transition duration-200 hover:scale-105 hover:text-gray-200"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="px-6">
        <button
          onClick={handleLogout}
          className="block w-full text-left text-white text-lg font-semibold uppercase tracking-wide transform transition duration-200 hover:scale-105 hover:text-gray-200"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
