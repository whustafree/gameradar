/**
 * Carga perezosa de google-play-scraper.
 *
 * La v10 del paquete es ESM y Vercel ejecuta Node 22, donde `require()` de un
 * módulo ESM lanza ERR_REQUIRE_ESM. Al requerirlo en el top-level de un
 * servicio, ese error tumbaba TODA la función (500 en /api/health incluido).
 *
 * Con `import()` dinámico funciona tanto en Node 22 como en Node 24, y el
 * fallo queda contenido: sólo se pierde esa fuente.
 */
let cached = null;

async function getGplay() {
  if (!cached) {
    cached = import('google-play-scraper')
      .then(mod => mod.default || mod)
      .catch(err => {
        cached = null; // permitir reintento en la siguiente llamada
        throw err;
      });
  }
  return cached;
}

module.exports = { getGplay };
