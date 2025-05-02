import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TenantList from '../components/TenantList';
import TenantDetails from '../components/TenantDetails';

const TenantPage = () => {
    const [tenants, setTenants] = useState(() => {
        // Load tenants from localStorage if available
        const savedTenants = localStorage.getItem('tenants');
        return savedTenants ? JSON.parse(savedTenants) : [];
    });

    const { tenantId } = useParams();

    // Save tenants to localStorage whenever the state updates
    useEffect(() => {
        localStorage.setItem('tenants', JSON.stringify(tenants));
    }, [tenants]);

    // Add new tenant, preserving existing ones
    const addTenant = (name) => {
        const newTenant = {
            id: Date.now().toString(),
            name,
            dateAdded: new Date().toLocaleString(),  // Adding the date of addition
        };

        setTenants((prevTenants) => [...prevTenants, newTenant]);
    };

    if (tenantId) {
        return <TenantDetails tenantId={tenantId} />;
    }

    return <TenantList tenants={tenants} addTenant={addTenant} />;
};

export default TenantPage;
