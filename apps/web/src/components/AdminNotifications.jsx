import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import pb from '@/lib/pocketbaseClient';
import {
  isNotificationsConfigured,
  getNotificationStatus,
  enableAdminNotifications,
  disableAdminNotifications,
  playAlertSound
} from '@/lib/notifications';

// Solo se monta cuando hay sesión de admin (ver Header.jsx).
export default function AdminNotifications() {
  const [status, setStatus] = useState('loading');
  const [isBusy, setIsBusy] = useState(false);
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    let active = true;
    getNotificationStatus().then((s) => active && setStatus(s));
    return () => {
      active = false;
    };
  }, []);

  // Aviso en vivo (con sonido) mientras la página está abierta.
  // Si el dispositivo ya recibe push, el sistema hace sonar la notificación,
  // así que aquí solo se muestra el aviso en pantalla para no duplicar el sonido.
  useEffect(() => {
    let unsubscribe = null;
    let mounted = true;

    pb.collection('registros')
      .subscribe('*', (e) => {
        if (!mounted || e.action !== 'create') return;
        const r = e.record || {};
        if (statusRef.current !== 'on') playAlertSound();
        toast.success(`Nueva alta · ${r.ejecutivo || 'Sin ejecutivo'}`, {
          description: [r.plan, r.tipo_ingreso, r.chat].filter(Boolean).join(' · ')
        });
      })
      .then((fn) => {
        if (mounted) unsubscribe = fn;
        else fn();
      })
      .catch((err) => console.error('No se pudieron activar los avisos en vivo:', err));

    return () => {
      mounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  if (!isNotificationsConfigured()) return null;

  const handleClick = async () => {
    if (status === 'ios-needs-install') {
      toast.info('Para recibir notificaciones en iPhone', {
        description: 'Abre el sitio en Safari, toca Compartir → "Agregar a inicio", entra desde ese ícono e inicia sesión de nuevo.',
        duration: 10000
      });
      return;
    }
    if (status === 'unsupported') {
      toast.error('Este navegador no permite notificaciones push. Usa Chrome, Edge o Firefox.');
      return;
    }
    if (status === 'denied') {
      toast.error('Las notificaciones están bloqueadas', {
        description: 'Actívalas en la configuración del navegador para este sitio (ícono del candado junto a la dirección).',
        duration: 8000
      });
      return;
    }

    setIsBusy(true);
    try {
      if (status === 'on') {
        await disableAdminNotifications();
        setStatus('off');
        toast.success('Notificaciones desactivadas en este dispositivo');
      } else {
        const next = await enableAdminNotifications();
        setStatus(next);
        if (next === 'on') {
          playAlertSound();
          toast.success('Notificaciones activadas', {
            description: 'Recibirás un aviso con sonido por cada alta nueva, aunque cierres el navegador.'
          });
        } else if (next === 'denied') {
          toast.error('No se dio permiso para notificaciones');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cambiar las notificaciones');
    } finally {
      setIsBusy(false);
    }
  };

  const isOn = status === 'on';
  const Icon = isOn ? BellRing : status === 'off' || status === 'loading' ? Bell : BellOff;
  const label = isOn ? 'Notificaciones activadas (toca para desactivar)' : 'Activar notificaciones de altas nuevas';

  return (
    <Button
      variant={isOn ? 'default' : 'outline'}
      size="sm"
      onClick={handleClick}
      disabled={isBusy || status === 'loading'}
      title={label}
      aria-label={label}
      className="gap-2"
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{isOn ? 'Avisos activos' : 'Activar avisos'}</span>
    </Button>
  );
}
