import { LocalBackend } from './localStorageBackend';

let activeBackend = LocalBackend;
let loadError = null;

export function getBackend() {
  return activeBackend;
}

export function setBackend(backend) {
  activeBackend = backend || LocalBackend;
}

export function setLoadError(message) {
  loadError = message;
}

export function getLoadError() {
  return loadError;
}

export function backendName() {
  return activeBackend.name;
}