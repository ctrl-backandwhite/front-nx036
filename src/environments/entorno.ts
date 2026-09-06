/**
 * La FORMA que tiene la configuración de un entorno.
 *
 * <p>Está escrita como tipo, y no solo como cuatro objetos parecidos, para que añadir una clave obligue
 * a rellenarla en los cuatro. Es el fallo clásico de este patrón: se añade una bandera, se rellena en
 * local y en producción, y se descubre meses después que en preproducción valía `undefined` — que en
 * JavaScript no es un error, es «falso», así que la funcionalidad simplemente no estaba.
 */
export interface Entorno {
  /** Cómo se llama este entorno. Se enseña en diagnósticos y viaja en los avisos de error. */
  readonly nombre: 'local' | 'des' | 'pre' | 'pro';

  /** Si es un entorno real de cara al público. Apaga diagnósticos y ayudas de desarrollo. */
  readonly produccion: boolean;

  /**
   * Raíz del backend, SIN barra final ni el sufijo `/api`.
   *
   * <p>Vacía en todos los entornos desplegados, y no es un descuido: la interfaz y la API se sirven
   * desde el mismo origen —nginx recibe `/api` y lo reenvía—, así que las rutas relativas bastan y
   * además evitan por completo el asunto de las peticiones entre orígenes. Solo habría que rellenarla
   * si algún día se separan en dominios distintos.
   */
  readonly apiBase: string;

  /**
   * La dirección pública de este entorno, absoluta.
   *
   * <p>Hace falta porque las páginas se PRERENDERIZAN: las etiquetas que leen WhatsApp, LinkedIn o un
   * buscador al compartir un enlace —`og:url`, `og:image`, la canónica— tienen que ser absolutas, y al
   * generarlas durante la compilación no hay ningún navegador del que deducir el dominio. Poner aquí el
   * de otro entorno hace que se compartan enlaces a producción desde preproducción, o al revés.
   */
  readonly urlPublica: string;

  /** Dominio desde el que se sirven las fotos de producto. Cambia por entorno. */
  readonly origenDeImagenes: string;

  /**
   * Enseñar el panel de cuentas de ejemplo en la pantalla de acceso.
   *
   * <p>NUNCA en preproducción ni en producción: es una lista de correos de acceso con su papel al lado.
   * En el front anterior estaba protegido por una comprobación doble —modo distinto de producción Y la
   * bandera activada—, y esa cautela se mantiene.
   */
  readonly muestraCuentasDeEjemplo: boolean;

  /** Permitir crear pedidos de ejemplo desde el panel. Solo donde los datos son desechables. */
  readonly permitePedidosDeEjemplo: boolean;
}
