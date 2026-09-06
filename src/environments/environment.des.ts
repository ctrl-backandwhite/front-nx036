import { Entorno } from './entorno';

/**
 * DESARROLLO. Es donde aterriza cada empujón a la rama de trabajo, así que se rompe a menudo y sus
 * datos son desechables: aquí sí tienen sentido las ayudas de desarrollo.
 */
export const environment: Entorno = {
  nombre: 'des',
  produccion: false,
  apiBase: '',
  urlPublica: 'https://dev.nx036.com',
  origenDeImagenes: 'https://img-dev.nx036.com',
  muestraCuentasDeEjemplo: true,
  permitePedidosDeEjemplo: true,
};
