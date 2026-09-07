/**
 * La dirección del backend MIENTRAS SE CONSTRUYE.
 *
 * <p>Este es el detalle que decide si el prerenderizado sirve de algo. En el navegador, la API vive en
 * el mismo origen y basta con pedir `/api/...`; pero al generar el HTML no hay navegador ni origen: el
 * código corre en Node, y una ruta relativa no apunta a ninguna parte. Las peticiones fallan **en
 * silencio** y la página se escribe con sus marcadores de carga puestos.
 *
 * <p>Así estaba: el HTML de la portada pesaba 63 kB y contenía 1.035 caracteres de texto, ningún
 * precio y ningún producto — solo la maqueta. Se pagaba la complejidad del prerenderizado sin cobrar
 * su beneficio: ni los buscadores veían el catálogo, ni la ficha de un producto llevaba su título al
 * compartirla, que era el motivo de montar todo esto.
 *
 * <p>Es exactamente el mismo fallo que tuvo el front anterior con su renderizado en servidor, y por la
 * misma causa. Por eso la variable se llama igual: quien la configure en el despliegue configura las
 * dos.
 *
 * <p>Vive en un fichero propio —y no dentro de `app.config.server.ts`— porque tiene DOS clientes: la
 * configuración con la que se prerenderiza y la elección de QUÉ fichas se prerenderizan
 * (`features/catalog/presentation/fichas-a-prerenderizar.ts`). Si cada uno leyera la variable por su
 * cuenta acabarían discrepando —uno apuntando al backend y el otro a ninguna parte— y la discrepancia
 * no daría ningún error: saldría una compilación con páginas vacías, que es justo el fallo que este
 * fichero existe para evitar.
 *
 * <p>Sin Angular a propósito: lo importa código que corre ANTES de que haya aplicación.
 */

/** El nombre de la variable de entorno. Se exporta para poder nombrarla en los avisos y en las pruebas. */
export const VARIABLE_API_INTERNA = 'NEXADROP_API_INTERNA';

/**
 * El valor por defecto apunta al backend por su nombre de servicio, que es como se alcanza dentro del
 * clúster. En un equipo de desarrollo se apunta al puerto local.
 */
export const API_INTERNA_POR_DEFECTO = 'http://backend:18082';

/** La raíz del backend, sin barra final, tal y como se alcanza desde donde se compila. */
export function baseDelBackendAlConstruir(
  entorno: Readonly<Record<string, string | undefined>> = typeof process !== 'undefined'
    ? process.env
    : {},
): string {
  const declarada = entorno[VARIABLE_API_INTERNA];
  return (declarada ?? API_INTERNA_POR_DEFECTO).replace(/\/+$/, '');
}
