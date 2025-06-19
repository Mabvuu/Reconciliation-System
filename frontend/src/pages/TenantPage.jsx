// src/pages/TenantPage.jsx
import React, { useState, useEffect } from 'react';
import TenantList from '../components/TenantList';

const TenantPage = () => {
  const [tenants, setTenants] = useState(() => {
    const saved = localStorage.getItem('tenants');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(t => {
            if (Array.isArray(t.posIds)) {
              return t;
            }
            if (t.posId) {
              return {
                name: t.name || '',
                posIds: [t.posId],
                dateAdded: t.dateAdded || new Date().toLocaleDateString(),
              };
            }
            return {
              name: t.name || '',
              posIds: [],
              dateAdded: t.dateAdded || new Date().toLocaleDateString(),
            };
          });
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('tenants', JSON.stringify(tenants));
  }, [tenants]);

  const addTenant = tenant => {
    setTenants(prev => [...prev, tenant]);
  };

  const removeTenant = index => {
    setTenants(prev => prev.filter((_, i) => i !== index));
  };

  const addPosId = (index, posId) => {
    setTenants(prev =>
      prev.map((t, i) =>
        i === index
          ? { ...t, posIds: Array.isArray(t.posIds) ? [...t.posIds, posId] : [posId] }
          : t
      )
    );
  };

  return (
    <TenantList
      tenants={tenants}
      addTenant={addTenant}
      removeTenant={removeTenant}
      addPosId={addPosId}
    />
  );
};

export default TenantPage;
