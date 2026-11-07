import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { AdminApp } from '@/app/AdminApp';
import '@/design/tokens.css';
import '@/design/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Admin root element is missing.');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AdminApp />
    </BrowserRouter>
  </StrictMode>,
);
