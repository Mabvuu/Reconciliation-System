// src/pages/TenantPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TenantList from '../components/TenantList';
import TenantDetails from '../components/TenantDetails';

const TenantPage = () => {
  const [tenants, setTenants] = useState(() => {
    const saved = localStorage.getItem('tenants');
    return saved ? JSON.parse(saved) : [];
  });
  const { tenantId } = useParams();

  useEffect(() => {
    localStorage.setItem('tenants', JSON.stringify(tenants));
  }, [tenants]);

  const addTenant = (name) => {
    const newTenant = {
      id: Date.now().toString(),
      name,
      dateAdded: new Date().toLocaleString(),
    };
    setTenants(prev => [...prev, newTenant]);
  };

  const deleteTenant = (id) => {
    setTenants(prev => prev.filter(t => t.id !== id));
  };

  if (tenantId) {
    return <TenantDetails tenantId={tenantId} />;
  }

  return (
    <TenantList
      tenants={tenants}
      addTenant={addTenant}
      deleteTenant={deleteTenant}
    />
  );
};

export default TenantPage;
