// Imágenes de portada de los proyectos.
//
// Si el proyecto no tiene imagen subida se usa una foto aleatoria de
// picsum.photos con seed = id del proyecto (estable y determinista). Si
// falla (sin red), se muestra un degradado SVG local también determinista
// por seed. Las imágenes subidas se escalan vía canvas antes de persistir.

const PICSUM_URL = 'https://picsum.photos/seed';

// Pequeño hash de cadena → entero sin signo de 32 bits.
export function seedFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

const GRADIENTS = [
  ['#6200ea', '#b388ff'],
  ['#0b7285', '#66d9e8'],
  ['#c2255c', '#f783ac'],
  ['#2b8a3e', '#8ce99a'],
  ['#e8590c', '#ffd8a8'],
  ['#364fc7', '#91a7ff'],
  ['#862e9c', '#e599f7'],
  ['#c92a2a', '#ffa8a8'],
];

// SVG degradado determinista (data URI) para usar cuando no hay imagen ni red.
export function localFallback(seed) {
  const index = (seedFromString(String(seed)) % GRADIENTS.length + GRADIENTS.length) % GRADIENTS.length;
  const [c1, c2] = GRADIENTS[index];
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/>` +
    `</linearGradient></defs>` +
    `<rect width='640' height='360' fill='url(#g)'/>` +
    `<circle cx='540' cy='60' r='120' fill='rgba(255,255,255,0.18)'/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// URL de la portada: imagen subida si existe, si no foto aleatoria por seed.
export function coverImageUrl(project) {
  if (project?.image) return project.image;
  const seed = project?.id || 'proyecto';
  return `${PICSUM_URL}/${encodeURIComponent(seed)}/640/360`;
}

// Escala un archivo de imagen a un dataURL (JPEG) dentro del límite de tamaño.
// Se usa antes de guardar en localStorage.
export function downscaleImageFile(file, maxWidth = 640, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Archivo vacío'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('No es una imagen válida'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}