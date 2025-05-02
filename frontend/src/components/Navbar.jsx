import React from 'react';
import { Link } from 'react-router-dom';

const NavBar = () => (
  <nav className="bg-[#6B8E23] border-b-2 border-white border-opacity-50 shadow-md w-full">
    <div className="max-w-6xl mx-auto flex items-center py-4">
      {/* Logo Section */}
      <div className="flex-shrink-0 mr-8">
        <img
          src="/images/logo1.png" // Replace with the correct path to your logo
          alt="Logo"
          className="h-30 w-auto"
        />
      </div>

      {/* Navigation Links */}
      <div className="flex items-center justify-center space-x-8 flex-grow">
        <Link
          to="/tenants"
          className="text-white text-lg font-semibold uppercase tracking-wide transform transition duration-200 hover:text-gray-200 hover:scale-105"
        >
          Tenants
        </Link>
        <Link
          to="/reports"
          className="text-white text-lg font-semibold uppercase tracking-wide transform transition duration-200 hover:text-gray-200 hover:scale-105"
        >
          Reports
        </Link>
        <Link
          to="/notes"
          className="text-white text-lg font-semibold uppercase tracking-wide transform transition duration-200 hover:text-gray-200 hover:scale-105"
        >
          Notes
        </Link>
        <Link
          to="/messages"
          className="text-white text-lg font-semibold uppercase tracking-wide transform transition duration-200 hover:text-gray-200 hover:scale-105"
        >
          Messages
        </Link>
      </div>
    </div>
  </nav>
);

export default NavBar;
