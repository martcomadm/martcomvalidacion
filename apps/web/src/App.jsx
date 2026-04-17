import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { Toaster } from '@/components/ui/sonner';
import ScrollToTop from '@/components/ScrollToTop.jsx';
import Header from '@/components/Header.jsx';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import CapturePage from '@/pages/CapturePage.jsx';
import HistorialPage from '@/pages/HistorialPage.jsx';
import SeguimientoPage from '@/pages/SeguimientoPage.jsx';
import MetricasPage from '@/pages/MetricasPage.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Header />
        <Routes>
          <Route path="/" element={<CapturePage />} />
          <Route 
            path="/historial" 
            element={
              <ProtectedRoute>
                <HistorialPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/seguimiento" 
            element={
              <ProtectedRoute>
                <SeguimientoPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/metricas" 
            element={
              <ProtectedRoute>
                <MetricasPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="*" 
            element={
              <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <div className="text-center">
                  <h1 className="text-4xl font-bold mb-4">404</h1>
                  <p className="text-muted-foreground mb-4">Página no encontrada</p>
                  <a href="/" className="text-primary hover:underline">
                    Volver al inicio
                  </a>
                </div>
              </div>
            } 
          />
        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;