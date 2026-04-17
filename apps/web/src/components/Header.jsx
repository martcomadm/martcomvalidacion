import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { LogOut, Lock } from 'lucide-react';
import LoginModal from '@/components/LoginModal.jsx';
import { toast } from 'sonner';

export default function Header() {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const navItems = [
    { path: '/', label: 'Captura', public: true },
    { path: '/historial', label: 'Historial', public: false },
    { path: '/seguimiento', label: 'Seguimiento', public: false },
    { path: '/metricas', label: 'Métricas', public: false },
  ];

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada');
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center transition-opacity hover:opacity-80">
              <img 
                src="https://horizons-cdn.hostinger.com/9553684c-55ba-4f93-a6e5-0f29abdf5b8c/fbbb25a81154167603d26a9904afc397.png" 
                alt="MARTCOM"
                className="h-10 w-auto"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const isAccessible = item.public || isAuthenticated;
                
                if (!isAccessible) return null;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowLoginModal(true)}
                  className="gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Admin
                </Button>
              )}
            </div>
          </div>

          <nav className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isAccessible = item.public || isAuthenticated;
              
              if (!isAccessible) return null;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <LoginModal 
        open={showLoginModal} 
        onOpenChange={setShowLoginModal}
        onSuccess={() => setShowLoginModal(false)}
      />
    </>
  );
}