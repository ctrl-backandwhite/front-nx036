import { Entorno } from './entorno';

/**
 * PREPRODUCCIÓN. Es el ensayo general: tiene que parecerse a producción en TODO, o deja de servir para
 * lo único que sirve, que es detectar lo que se rompería allí.
 *
 * <p>Por eso las ayudas de desarrollo van apagadas igual que en producción. Un entorno de ensayo con
 * atajos que producción no tiene certifica un comportamiento que nadie va a ver.
 */
export const environment: Entorno = {
  nombre: 'pre',
  produccion: true,
  apiBase: '',
  urlPublica: 'https://pre.nx036.com',
  origenDeImagenes: 'https://img-pre.nx036.com',
  muestraCuentasDeEjemplo: false,
  permitePedidosDeEjemplo: false,
};
