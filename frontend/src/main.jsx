import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AppProvider } from './store/AppContext.jsx';
import { ToastProvider } from './store/ToastContext.jsx';
import { WishlistProvider } from './store/WishlistContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AppProvider>
          <WishlistProvider>
            <App />
          </WishlistProvider>
        </AppProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
