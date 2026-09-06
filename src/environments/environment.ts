import { Entorno } from './entorno';

/**
 * Configuración POR DEFECTO: la del equipo de quien desarrolla.
 *
 * <p>Que el valor por defecto sea el local y no el de producción es deliberado. Si alguien compila sin
 * decir para qué entorno, lo que sale apunta a su propia máquina y falla enseguida y de forma evidente;
 * al revés, un descuido produciría un artefacto que habla con producción sin que nadie lo haya pedido.
 * Entre los dos errores posibles, se elige el ruidoso.
 *
 * <p>La CLI sustituye este fichero por el del entorno correspondiente al compilar (ver
 * `fileReplacements` en `angular.json`).
 */
export const environment: Entorno = {
  nombre: 'local',
  produccion: false,
  // El servidor de desarrollo reenvía `/api` al backend del puerto 18082 (ver `proxy.conf.json`).
  apiBase: '',
  urlPublica: 'http://localhost:3004',
  origenDeImagenes: 'http://localhost:9000',
  muestraCuentasDeEjemplo: true,
  permitePedidosDeEjemplo: true,
};
