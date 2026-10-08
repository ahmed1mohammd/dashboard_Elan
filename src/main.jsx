import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { showError } from './utils/swal';

// Safety net: Intercept any remaining native alerts with SweetAlert2
window.alert = (message) => {
  showError('تنبيه', typeof message === 'object' ? JSON.stringify(message) : String(message || ''));
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

