// Notificaciones push de "nuevas altas" para administradores (OneSignal).
//
// Cómo funciona:
// 1. Un admin inicia sesión y toca la campana → el navegador pide permiso.
// 2. Su dispositivo queda suscrito en OneSignal con la etiqueta rol=admin.
// 3. Cada vez que se crea un registro, PocketBase (pb_hooks/onesignal-push.pb.js)
//    le pide a OneSignal que envíe la notificación a todos los rol=admin.
// 4. La notificación llega con el sonido del sistema aunque el navegador esté cerrado.
//
// Para activarlo, pega aquí el "App ID" de tu app en OneSignal
// (OneSignal → Settings → Keys & IDs). Mientras esté vacío, la función queda oculta.
export const ONESIGNAL_APP_ID = '25f04d5d-eb9f-4aac-a9e1-3cc4c387e625';

const ADMIN_TAG_KEY = 'rol';
const ADMIN_TAG_VALUE = 'admin';

let initPromise = null;

export const isNotificationsConfigured = () => Boolean(ONESIGNAL_APP_ID);

// iPhone/iPad: Apple solo permite push si la app se agregó a la pantalla de inicio.
export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

// Devuelve la instancia de OneSignal una vez que el SDK cargó e inicializó.
export function getOneSignal() {
  if (!isNotificationsConfigured() || typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  if (!initPromise) {
    initPromise = new Promise((resolve) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            autoResubscribe: true,
            allowLocalhostAsSecureOrigin: window.location.hostname === 'localhost'
          });
          resolve(OneSignal);
        } catch (err) {
          console.error('No se pudo iniciar OneSignal:', err);
          resolve(null);
        }
      });
    });
  }

  return initPromise;
}

// Estado del dispositivo actual:
// 'unconfigured' | 'unsupported' | 'ios-needs-install' | 'denied' | 'on' | 'off'
export async function getNotificationStatus() {
  if (!isNotificationsConfigured()) return 'unconfigured';
  if (isIOS() && !isStandalone()) return 'ios-needs-install';

  const OneSignal = await getOneSignal();
  if (!OneSignal || !OneSignal.Notifications.isPushSupported()) return 'unsupported';

  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return 'denied';

  const isOn =
    OneSignal.Notifications.permission &&
    OneSignal.User.PushSubscription.optedIn &&
    localStorage.getItem('martcom_push_admin') === 'true';

  return isOn ? 'on' : 'off';
}

// Debe llamarse desde un clic (los navegadores solo piden permiso tras una acción del usuario).
export async function enableAdminNotifications() {
  const OneSignal = await getOneSignal();
  if (!OneSignal) return getNotificationStatus();

  if (!OneSignal.Notifications.permission) {
    await OneSignal.Notifications.requestPermission();
  }

  if (OneSignal.Notifications.permission) {
    await OneSignal.User.PushSubscription.optIn();
    OneSignal.User.addTag(ADMIN_TAG_KEY, ADMIN_TAG_VALUE);
    localStorage.setItem('martcom_push_admin', 'true');
  }

  return getNotificationStatus();
}

// Se llama al apagar la campana o al cerrar sesión.
export async function disableAdminNotifications() {
  localStorage.removeItem('martcom_push_admin');
  const OneSignal = await getOneSignal();
  if (!OneSignal) return;

  try {
    OneSignal.User.removeTag(ADMIN_TAG_KEY);
    await OneSignal.User.PushSubscription.optOut();
  } catch (err) {
    console.error('No se pudieron desactivar las notificaciones:', err);
  }
}

// Sonido corto para avisar de una alta mientras la página está abierta.
export function playAlertSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.17);
    });

    setTimeout(() => ctx.close(), 600);
  } catch {
    // Sin audio disponible: se ignora.
  }
}
