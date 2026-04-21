import PocketBase from 'pocketbase';

// URL desde variables de entorno
const API_URL = import.meta.env.VITE_API_URL;

// Crear instancia
const pb = new PocketBase(API_URL);

// Evita cancelar requests automáticamente (importante en apps reales)
pb.autoCancellation(false);

// ===============================
// 🔐 MANEJO DE SESIÓN
// ===============================

// Cargar sesión desde cookies al iniciar
if (typeof document !== 'undefined') {
  pb.authStore.loadFromCookie(document.cookie);
}

// Guardar sesión automáticamente en cookies
pb.authStore.onChange(() => {
  if (typeof document !== 'undefined') {
    document.cookie = pb.authStore.exportToCookie({
      httpOnly: false,
    });
  }
});

// ===============================
// 🔑 AUTH HELPERS
// ===============================

export async function login(email, password) {
  return await pb.collection('users').authWithPassword(email, password);
}

export function logout() {
  pb.authStore.clear();
}

export function getUser() {
  return pb.authStore.model;
}

export function isAuthenticated() {
  return pb.authStore.isValid;
}

// ===============================
// 📥 DATA HELPERS
// ===============================

export async function getList(collection, query = {}) {
  return await pb.collection(collection).getFullList(query);
}

export async function getOne(collection, id) {
  return await pb.collection(collection).getOne(id);
}

export async function create(collection, data) {
  return await pb.collection(collection).create(data);
}

export async function update(collection, id, data) {
  return await pb.collection(collection).update(id, data);
}

export async function remove(collection, id) {
  return await pb.collection(collection).delete(id);
}

// ===============================
// 🔄 REALTIME
// ===============================

export function subscribe(collection, callback) {
  return pb.collection(collection).subscribe('*', callback);
}

export function unsubscribe(collection) {
  return pb.collection(collection).unsubscribe('*');
}

// ===============================
// 📦 EXPORT PRINCIPAL
// ===============================

export default pb;
