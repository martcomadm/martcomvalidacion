import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import LoginModal from '@/components/LoginModal.jsx';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const loggedInRef = useRef(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Antes se mostraba el modal y se redirigía a "/" al mismo tiempo, así que el
    // modal desaparecía al instante. Ahora se queda abierto en la ruta pedida;
    // si el usuario lo cierra sin entrar, se le regresa a Captura.
    return (
      <div className="min-h-[100dvh] bg-muted/30">
        <LoginModal
          open
          onSuccess={() => {
            loggedInRef.current = true;
          }}
          onOpenChange={(open) => {
            if (!open && !loggedInRef.current) navigate('/', { replace: true });
          }}
        />
      </div>
    );
  }

  return children;
}
