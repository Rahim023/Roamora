import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import App from './App.jsx';
import { AuthProvider } from './auth.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || '1054642678376-7pcdcsgqj05hldlp6ti2s8ib6oi39fdd.apps.googleusercontent.com'}>
    <BrowserRouter>
      <AuthProvider><App /></AuthProvider>
    </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
