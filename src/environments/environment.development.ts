/**
 * Configuración de desarrollo. La raíz va vacía igual que en producción: el servidor de desarrollo de
 * Angular reenvía `/api` al backend local del puerto 18082 (ver `proxy.conf.json`), así que desde el
 * código las rutas son relativas en los dos casos y no hay una rama distinta según el entorno.
 */
export const environment = {
  produccion: false,
  apiBase: '',
};
