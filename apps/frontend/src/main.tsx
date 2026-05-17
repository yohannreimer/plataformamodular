import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ToastProvider } from './shared/components/Toast';
import { readRuntimeConfig } from './config/runtime';
import './styles.css';

const clerkPublishableKey = readRuntimeConfig('VITE_CLERK_PUBLISHABLE_KEY')
  ?? readRuntimeConfig('CLERK_PUBLISHABLE_KEY');

function MissingClerkConfig() {
  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      Configure VITE_CLERK_PUBLISHABLE_KEY no ambiente do frontend.
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {clerkPublishableKey ? (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </ClerkProvider>
    ) : (
      <MissingClerkConfig />
    )}
  </React.StrictMode>
);
