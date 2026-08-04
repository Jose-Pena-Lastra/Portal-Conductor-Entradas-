import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import ConductorPage from './pages/ConductorPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="*" element={<ConductorPage />} />
      </Routes>
    </HashRouter>
  );
}
