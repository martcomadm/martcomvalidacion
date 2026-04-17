
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginModal({ open, onOpenChange, onSuccess }) {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const success = login(password);
      
      if (success) {
        toast.success('Acceso concedido');
        setPassword('');
        onSuccess?.();
        onOpenChange(false);
      } else {
        setError('Contraseña incorrecta');
        toast.error('Contraseña incorrecta');
      }
      
      setIsLoading(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Acceso de administrador
          </DialogTitle>
          <DialogDescription>
            Ingresa la contraseña para acceder al panel de administración
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Ingresa tu contraseña"
              className="text-gray-900"
              autoFocus
              required
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading || !password}
          >
            {isLoading ? 'Verificando...' : 'Ingresar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
