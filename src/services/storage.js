import { LocalBackend } from './localStorageBackend';
import { ServerBackend } from './serverBackend';
import { isServerMode } from '../config/appConfig';

let activeBackend = isServerMode() ? ServerBackend : LocalBackend;
let loadError = null;

export function getBackend() {
  return activeBackend;
}

export function setBackend(backend) {
  activeBackend = backend || defaultBackend();
}

function defaultBackend() {
  return isServerMode() ? ServerBackend : LocalBackend;
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