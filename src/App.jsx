import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ConductorPage from './pages/ConductorPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<ConductorPage />} />
      </Routes>
    </BrowserRouter>
  );
}
