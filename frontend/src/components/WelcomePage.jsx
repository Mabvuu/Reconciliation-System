// src/components/WelcomePage.jsx
import React from 'react';

const WelcomePage = () => {
  return (
    <div
      className="flex justify-between items-center min-h-screen pt-30 bg-cover bg-center px-8"
      style={{ backgroundImage: "url('/images/b.jpg')" }}
    >
      {/* Instructions Panel */}
      <div className="w-1/3 bg-[#4F5862] bg-opacity-90 rounded-lg shadow-xl p-6">
        <h2 className="text-2xl font-semibold uppercase text-[#ffffff] mb-4 border-b-2 border-[#ffffff] pb-2">
          How to Use
        </h2>
        <ol className="list-decimal list-inside space-y-4 text-[#ffffff]">
          <li>
            <span className="font-medium text-[#ffffff]">Go to Agent List:</span> Navigate to the
            agent list page to get started.
          </li>
          <li>
            <span className="font-medium text-[#ffffff]">Enter POS ID & Name:</span> Provide the
            necessary agent details.
          </li>
          <li>
            <span className="font-medium text-[#ffffff]">Fill Details:</span> Upload files and
            complete any required fields.
          </li>
          <li>
            <span className="font-medium text-[#ffffff]">Save:</span> Ensure all changes are saved
            before leaving the page.
          </li>
        </ol>
      </div>

      {/* Welcome Box */}
      <div className="w-1/3 bg-[#4F5862] bg-opacity-90 rounded-lg shadow-xl p-6 text-center">
        <h1 className="text-3xl font-bold text-[#ffffff] mb-4">
          ✨ Welcome to <span className="italic">Oliver Compass</span>! ✨
        </h1>
        <p className="text-lg text-[#ffffff] mb-6">
          Zimbabwe’s Premier Web Reconciliation Platform. Align every payment with its record and
          enjoy total transparency. 
        </p>
        <div className="flex justify-center">
          <div className="rounded-full border-4 border-white border-double p-2">
            <img
              src="/images/logo1.png"
              alt="Oliver Compass Logo"
              className="h-36 w-36 rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
