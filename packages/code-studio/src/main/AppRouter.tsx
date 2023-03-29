import React, { ReactElement } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AppInit from './AppInit';

function AppRouter(): ReactElement {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<AppInit />} />
        <Route path="notebook/:notebookPath+" element={<AppInit />} />
      </Routes>
    </Router>
  );
}

export default AppRouter;
