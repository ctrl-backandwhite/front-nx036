/**
 * Configuración de producción. La CLI sustituye este fichero por el de desarrollo al compilar en modo
 * desarrollo (ver `fileReplacements` en `angular.json`).
 */
export const environment = {
  produccion: true,
  /**
   * Raíz del backend. Vacía porque la interfaz y la API se sirven desde el mismo origen: nginx recibe
   * `/api` y lo reenvía. Solo hay que rellenarla si algún día se separan en dominios distintos.
   */
  apiBase: '',
};
