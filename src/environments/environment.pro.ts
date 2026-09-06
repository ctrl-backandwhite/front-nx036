import { Entorno } from './entorno';

/**
 * PRODUCCIÓN. Clientes reales, dinero real.
 *
 * <p>Las dos banderas de ayuda van apagadas y no se encienden «un momento para probar algo»: la de las
 * cuentas de ejemplo publica una lista de correos de acceso con su papel al lado, y la de los pedidos
 * de ejemplo mete datos falsos entre los de verdad.
 */
export const environment: Entorno = {
  nombre: 'pro',
  produccion: true,
  apiBase: '',
  urlPublica: 'https://nx036.com',
  origenDeImagenes: 'https://img.nx036.com',
  muestraCuentasDeEjemplo: false,
  permitePedidosDeEjemplo: false,
};
