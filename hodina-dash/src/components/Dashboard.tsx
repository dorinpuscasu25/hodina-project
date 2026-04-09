import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './Navbar';
import Calendar from './pages/Calendar';
import CreateAccommodation from './pages/CreateAccommodation';
import CreateExperience from './pages/CreateExperience';
import Listings from './pages/Listings';
import Messages from './pages/Messages';
import OrganizationSettings from './pages/OrganizationSettings';
import Statistics from './pages/Statistics';
import Today from './pages/Today';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-white text-[#17332d]">
      <Navbar />
      <div className="pt-16">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard/today" replace />} />
          <Route path="/today" element={<Today />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/settings" element={<OrganizationSettings />} />
          <Route path="/account-settings" element={<Navigate to="/dashboard/settings?tab=account" replace />} />
          <Route path="/organization-settings" element={<Navigate to="/dashboard/settings?tab=company" replace />} />
          <Route path="/security-settings" element={<Navigate to="/dashboard/settings?tab=security" replace />} />
          <Route path="/settings/organization" element={<Navigate to="/dashboard/settings?tab=company" replace />} />
          <Route path="/settings/account" element={<Navigate to="/dashboard/settings?tab=account" replace />} />
          <Route path="/settings/security" element={<Navigate to="/dashboard/settings?tab=security" replace />} />
          <Route path="/experiences/create" element={<CreateExperience />} />
          <Route path="/experiences/:id/edit" element={<CreateExperience />} />
          <Route path="/accommodations/create" element={<CreateAccommodation />} />
          <Route path="/accommodations/:id/edit" element={<CreateAccommodation />} />
          <Route path="/create-experience" element={<Navigate to="/dashboard/experiences/create" replace />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="*" element={<Navigate to="/dashboard/today" replace />} />
        </Routes>
      </div>
    </div>
  );
}
