/**
 * Comprueba que se deduce bien el "public_id" de una URL de Cloudinary.
 *
 * Es lo que permite borrar la foto del almacen cuando el usuario la elimina.
 * Si el public_id se calcula mal, la foto se queda para siempre en Cloudinary
 * ocupando espacio (y apareciendo en la galeria sin volver a usarse).
 *
 * Uso:  node test-publicid.js
 */
const { publicIdDesdeUrl } = require('./storage');

const casos = [
  // URL con numero de version y carpeta  ->  gymapp/abc123def456
  [
    'https://res.cloudinary.com/micloud/image/upload/v1749000000/gymapp/abc123def456.jpg',
    'gymapp/abc123def456',
  ],
  // URL sin numero de version           ->  gymapp/solohex
  [
    'https://res.cloudinary.com/micloud/image/upload/gymapp/solohex.webp',
    'gymapp/solohex',
  ],
  // Foto subida antes de usar carpetas   ->  sincarpeta/hash
  [
    'https://res.cloudinary.com/micloud/image/upload/v1749000000/sincarpeta/hash.png',
    'sincarpeta/hash',
  ],
  // Carpeta con un nivel anidado        ->  gymapp/2026/sep/foto1
  [
    'https://res.cloudinary.com/micloud/image/upload/v1/gymapp/2026/sep/foto1.jpg',
    'gymapp/2026/sep/foto1',
  ],
];

console.log('=== Deducir el public_id desde la URL ===');
let fallos = 0;

for (const [url, esperado] of casos) {
  const obtenido = publicIdDesdeUrl(url);
  const ok = obtenido === esperado;
  if (!ok) fallos++;
  console.log(`  ${ok ? 'OK   ' : 'FALLO'} ${url.split('/upload/')[1]}`);
  console.log(`         -> "${obtenido}"${ok ? '' : `  (esperado "${esperado}")`}`);
}

console.log('');
console.log(fallos === 0 ? '===== public_id correcto =====' : `===== ${fallos} FALLO(S) =====`);
process.exit(fallos === 0 ? 0 : 1);