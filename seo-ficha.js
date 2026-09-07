/**
 * Etiquetas para compartir de la ficha de producto, resueltas en la pasarela.
 *
 * EL PROBLEMA. Quien pega un enlace de una ficha en WhatsApp, Telegram, Slack o una red social no
 * abre la página: un robot pide el HTML y lee `og:title`, `og:description` y `og:image`. Esos robots
 * NO ejecutan JavaScript. Nuestra aplicación pone esas etiquetas al montar la ficha —en
 * `core/seo/etiquetas.service.ts`— así que llegan tarde para todo el mundo salvo para un navegador de
 * verdad. Resultado: cada enlace compartido salía con el título genérico del sitio y sin foto.
 *
 * POR QUÉ NO SE PRERENDERIZAN LAS 7.729. Es la respuesta obvia y no vale entera, por tres motivos que
 * se midieron:
 *
 *   1. Hay 7.729 productos y un HTML pintado pesa entre 105 y 466 kB. Serían del orden de 1,5 GB
 *      dentro de la imagen.
 *   2. El catálogo CRECE entre despliegues: es el trabajo diario del proyecto. Todo lo que entrara
 *      después de construir se quedaría otra vez sin etiquetas, que es justo el problema a resolver.
 *   3. La ficha depende del idioma y de la divisa de quien mira, y el distintivo de arancel se calcula
 *      contra su cesta. Un HTML escrito al construir fija las tres cosas para todos.
 *
 * Y enumerar los 7.729 al construir tampoco es gratis: el listado del catálogo EXIGE SESIÓN (devuelve
 * 401), así que haría falta meter credenciales en la compilación.
 *
 * LO QUE SÍ. La ficha suelta —`/api/catalog/products/{slug}`— es PÚBLICA, responde 200 sin sesión
 * ninguna y ya trae `metaTitle`, `metaDescription` y las imágenes en el CDN. Así que la pasarela pide
 * esa ficha, mete las etiquetas en el HTML y lo devuelve. Cubre los 7.729 y los que se carguen mañana,
 * no alarga el despliegue, no pesa nada y un cambio de título se ve al instante.
 *
 * Se sirve lo MISMO a todo el mundo, robots y personas. Servir una cosa a los robots y otra a las
 * personas tiene nombre —encubrimiento— y lo penalizan los buscadores; además obligaría a mantener dos
 * caminos. Aquí solo se rellena el `<head>`: el cuerpo es idéntico y la aplicación arranca igual.
 *
 * ── AÑADIDO 7-sep-2026 · CONVIVENCIA CON EL PRERENDERIZADO PARCIAL ──────────────────────────────
 *
 * Los tres motivos de arriba descartan prerenderizar las 7.729, no prerenderizar UNAS CUANTAS. Desde
 * hoy, `catalog/:slug` se compila con `RenderMode.Prerender` y un cupo —las de la portada y las más
 * vendidas, ver `src/app/features/catalog/presentation/fichas-a-prerenderizar.ts`—, así que en el
 * disco conviven dos cosas para la misma dirección:
 *
 *   · `/usr/share/nginx/html/catalog/<slug>/index.html`  la ficha YA PINTADA, si entró en el cupo.
 *   · `/usr/share/nginx/html/index.csr.html`             el esqueleto vacío, para todas las demás.
 *
 * Y este fichero seguía sirviendo SIEMPRE el esqueleto, porque su `location` de nginx atrapa toda
 * `/catalog/<algo>` antes de que nadie mire el disco. Es decir: sin este añadido, prerenderizar las
 * fichas se pagaba entero —tiempo de compilación y megas en la imagen— y no se cobraba NADA, porque
 * el HTML pintado no llegaba a servirse nunca. No habría dado ningún error; simplemente no habría
 * servido para nada.
 *
 * La solución es de una línea de idea: la PLANTILLA deja de ser fija. Si esa ficha está
 * prerenderizada, se usa su HTML como base; si no, el esqueleto de siempre. Sobre esa base se inyecta
 * el `<head>` exactamente igual que antes. Se queda lo mejor de los dos:
 *
 *   · el CUERPO viene ya pintado en las fichas del cupo —el robot ve el producto entero, no solo el
 *     `<head>`, y quien entra la ve antes—;
 *   · el `<head>` sigue resolviéndose EN LA PETICIÓN, así que un cambio de título o de precio se ve
 *     al instante aunque la ficha se compilara hace una semana, y la dirección canónica sigue
 *     saliendo del dominio por el que se ha entrado y no de la compilación.
 *
 * Ojo con una consecuencia: el HTML pintado ya trae SUS etiquetas, puestas por la aplicación al
 * generarlo (`ficha.page.ts`). Si se inyectaran las nuestras encima quedarían DUPLICADAS —dos
 * `og:title`, dos `og:image`— y cada robot elige una distinta: la vista previa saldría bien en unos
 * sitios y mal en otros, que es el mismo fallo que ya se corrigió con el `<title>`. Por eso, antes de
 * inyectar, se limpian del `<head>` las etiquetas que este fichero va a escribir.
 *
 * Y las dos mitades se pueden desplegar por separado sin romper nada: una imagen con este fichero
 * pero sin fichas prerenderizadas cae siempre en el esqueleto —el comportamiento de antes—, y una con
 * fichas prerenderizadas pero con el fichero viejo sirve el esqueleto con las etiquetas —también el
 * comportamiento de antes, solo que desaprovechando el HTML pintado.
 */

import fs from 'fs';

/** El esqueleto vacío, leído una vez por proceso. Es el mismo para todas las fichas SIN prerenderizar. */
let plantilla = null;

/** La raíz que publica nginx. De aquí cuelgan tanto el esqueleto como las fichas prerenderizadas. */
const RAIZ_WEB = '/usr/share/nginx/html';

const RUTA_HTML = RAIZ_WEB + '/index.csr.html';

/**
 * Escapa lo que va DENTRO de un atributo HTML.
 *
 * <p>No es una formalidad: los títulos y descripciones vienen de fichas de proveedores, ya traen
 * comillas y símbolos, y se meten en `content="…"`. Sin escapar, una comilla parte el atributo y a
 * partir de ahí lo que siga se interpreta como marcado.
 */
function escapa(texto) {
  return String(texto == null ? '' : texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Recorta sin cortar una palabra por la mitad. Las descripciones largas se truncan en los previos. */
function recorta(texto, maximo) {
  const limpio = String(texto == null ? '' : texto).replace(/\s+/g, ' ').trim();
  if (limpio.length <= maximo) {
    return limpio;
  }
  const cortado = limpio.slice(0, maximo);
  const ultimo = cortado.lastIndexOf(' ');
  return (ultimo > maximo * 0.6 ? cortado.slice(0, ultimo) : cortado) + '…';
}

/**
 * La imagen principal del producto.
 *
 * <p>Se prefiere la marcada como `MAIN`; si no hay ninguna, la primera. Y se usa `cdnUrl` y no
 * `sourceUrl`: la de origen apunta al proveedor, que puede negarse a servirla a un tercero y dejar la
 * vista previa sin foto.
 */
function imagenPrincipal(producto) {
  const imagenes = Array.isArray(producto.images) ? producto.images : [];
  if (imagenes.length === 0) {
    return '';
  }
  const principal = imagenes.filter((i) => i && i.role === 'MAIN')[0] || imagenes[0];
  return (principal && (principal.cdnUrl || principal.sourceUrl)) || '';
}

/** Construye el bloque de etiquetas que se inyecta en el `<head>`. */
function etiquetas(producto, url) {
  const titulo = recorta(producto.metaTitle || producto.title || '', 110);
  const descripcion = recorta(
    producto.metaDescription || producto.shortDescription || producto.description || '',
    200,
  );
  const imagen = imagenPrincipal(producto);
  const precio = producto.displayPrice;
  const divisa = producto.displayCurrency;

  const lineas = [
    '<title>' + escapa(titulo) + ' · NX036</title>',
    '<meta name="description" content="' + escapa(descripcion) + '">',
    '<link rel="canonical" href="' + escapa(url) + '">',
    '<meta property="og:type" content="product">',
    '<meta property="og:site_name" content="NX036">',
    '<meta property="og:title" content="' + escapa(titulo) + '">',
    '<meta property="og:description" content="' + escapa(descripcion) + '">',
    '<meta property="og:url" content="' + escapa(url) + '">',
    '<meta name="twitter:title" content="' + escapa(titulo) + '">',
    '<meta name="twitter:description" content="' + escapa(descripcion) + '">',
    // Sin foto, `summary_large_image` deja un hueco gris en la vista previa: se declara la tarjeta
    // pequeña, que es la que corresponde a un enlace sin imagen.
    '<meta name="twitter:card" content="' + (imagen ? 'summary_large_image' : 'summary') + '">',
  ];
  if (imagen) {
    lineas.push('<meta property="og:image" content="' + escapa(imagen) + '">');
    lineas.push('<meta name="twitter:image" content="' + escapa(imagen) + '">');
  }
  if (precio != null && divisa) {
    lineas.push('<meta property="product:price:amount" content="' + escapa(precio) + '">');
    lineas.push('<meta property="product:price:currency" content="' + escapa(divisa) + '">');
  }
  return lineas.join('\n');
}

/**
 * Las etiquetas que ESTE fichero escribe. Se listan para poder quitar del `<head>` las que ya
 * estuvieran puestas antes de añadir las nuestras.
 *
 * <p>La lista se escribe a mano y no se deduce del bloque generado a propósito: hay etiquetas que solo
 * se emiten a veces —`og:image` únicamente si hay foto, `product:price:*` únicamente si hay precio— y
 * si la limpieza dependiera de lo generado, una ficha sin foto conservaría la `og:image` que hubiera
 * escrito la aplicación al prerenderizar y se compartiría con la imagen equivocada.
 */
const META_POR_NOMBRE = [
  'description',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
];
const META_POR_PROPIEDAD = [
  'og:type',
  'og:site_name',
  'og:title',
  'og:description',
  'og:url',
  'og:image',
  'product:price:amount',
  'product:price:currency',
];

/** Escapa lo que va dentro de una expresión regular. Los nombres llevan `:` y `.`, que son especiales. */
function escapaParaRegExp(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Quita del `<head>` lo que vamos a volver a escribir.
 *
 * <p>Hace falta desde que hay fichas prerenderizadas: su HTML ya trae `<title>`, `description`,
 * `og:title`, `og:description`, `og:type` y `og:image`, puestas por la aplicación al generarlo. Sin
 * esta limpieza el documento saldría con cada una DOS veces, y ante etiquetas repetidas cada robot
 * elige una distinta: la vista previa saldría bien en unos sitios y mal en otros. Es el mismo fallo
 * que ya obligó a sustituir el `<title>` en vez de añadir otro, extendido al resto.
 */
function limpia(cabeza) {
  // El `<head>` de una página prerenderizada lleva dentro un bloque de CSS crítico de decenas de
  // kilobytes, puesto por el compilador. Lo que haya AHÍ DENTRO es texto, no marcado: si una regla
  // llevara `<title>` o `<meta …>` dentro de una cadena, la limpieza de abajo se lo comería y la
  // página saldría con el estilo roto. Se probó con una regla así y en efecto se la comía. Así que los
  // bloques `<style>` y `<script>` se apartan, se limpia lo que queda —que ya es solo marcado— y se
  // devuelven a su sitio.
  //
  // La marca es un COMENTARIO de HTML con un nombre propio. Tenía que ser algo que no pueda aparecer
  // por casualidad en el documento: con una marca de texto corriente bastaría que un atributo la
  // contuviera para que al recomponer se le colara dentro un bloque de CSS entero.
  const apartados = [];
  let texto = cabeza.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, function (bloque) {
    apartados.push(bloque);
    return '<!--nx-apartado-' + (apartados.length - 1) + '-->';
  });

  texto = texto.replace(/<title>[\s\S]*?<\/title>/gi, '');
  texto = texto.replace(/<link[^>]+rel=["']?canonical["']?[^>]*>/gi, '');
  const quita = function (atributo, nombres) {
    for (let i = 0; i < nombres.length; i++) {
      // El atributo puede ir antes o después de `content`, así que se acepta cualquier orden dentro de
      // la etiqueta; `[^>]*` no cruza a la siguiente porque `>` la cierra.
      const patron = new RegExp(
        '<meta[^>]*\\s' + atributo + '=["\']' + escapaParaRegExp(nombres[i]) + '["\'][^>]*>',
        'gi',
      );
      texto = texto.replace(patron, '');
    }
  };
  quita('name', META_POR_NOMBRE);
  quita('property', META_POR_PROPIEDAD);

  return texto.replace(/<!--nx-apartado-(\d+)-->/g, function (_, indice) {
    return apartados[Number(indice)];
  });
}

/**
 * Mete las etiquetas en el HTML.
 *
 * <p>Solo se toca el `<head>`: el documento se parte por el primer `</head>` y la limpieza se aplica
 * únicamente a esa mitad. No es cosmética. En una ficha prerenderizada el cuerpo lleva dentro la
 * respuesta del backend en JSON —cientos de kilobytes con títulos y descripciones de proveedores— y
 * una expresión regular suelta por todo el documento podría morder ahí. Acotándola al `<head>` eso no
 * puede pasar, y de paso se recorre una fracción del documento en vez de entero.
 */
function inyecta(html, bloque) {
  const fin = html.search(/<\/head>/i);
  if (fin === -1) {
    // Sin `</head>` no hay dónde acotar: se hace lo mínimo seguro, que es lo que se hacía antes.
    return html.replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<head>/i, '<head>\n' + bloque);
  }
  const cabeza = limpia(html.slice(0, fin));
  return cabeza.replace(/<head([^>]*)>/i, '<head$1>\n' + bloque) + html.slice(fin);
}

/**
 * Los dominios desde los que se sirve el sitio.
 *
 * <p>Existe esta lista porque la primera versión construía la dirección canónica con la cabecera `Host`
 * de la petición, y esa cabecera la escribe QUIEN PIDE. Como la respuesta se cachea cinco minutos en el
 * borde, bastaba una petición con un `Host` inventado para dejar guardada una ficha cuyo `canonical` y
 * cuyo `og:url` apuntan a otro dominio. A partir de ahí, todo el que compartiera ese enlace estaría
 * mandando gente a la web de otro, y los buscadores leerían que la página canónica está allí.
 *
 * <p>Se conserva el `Host` solo cuando coincide con uno de los nuestros —así los tres entornos generan
 * su propia dirección sin tocar el código— y en cualquier otro caso se cae al dominio de producción.
 */
var DOMINIOS_PROPIOS = [
  'nx036.com',
  'www.nx036.com',
  'pre.nx036.com',
  'dev.nx036.com',
  'localhost:3003',
  'localhost:3004',
];

var DOMINIO_POR_DEFECTO = 'https://nx036.com';

/** La dirección pública de la ficha, sin dejar que la escriba quien pide. */
function direccionCanonica(r, slug) {
  var host = String(r.headersIn.Host || '').toLowerCase();
  if (DOMINIOS_PROPIOS.indexOf(host) === -1) {
    return DOMINIO_POR_DEFECTO + '/catalog/' + encodeURIComponent(slug);
  }
  // En local no hay TLS; fuera de local siempre lo hay, así que el esquema tampoco se lee de la
  // petición: también viene del cliente y también acabaría en la respuesta cacheada.
  var esquema = host.indexOf('localhost') === 0 ? 'http' : 'https';
  return esquema + '://' + host + '/catalog/' + encodeURIComponent(slug);
}

/** Lee el esqueleto del disco. Si no se puede, se dice y se sigue: nunca se deja la ficha sin servir. */
function leePlantilla(r) {
  if (plantilla !== null) {
    return plantilla;
  }
  try {
    plantilla = fs.readFileSync(RUTA_HTML, 'utf8');
  } catch (e) {
    r.error('seo-ficha: no se pudo leer ' + RUTA_HTML + ': ' + e.message);
    plantilla = '';
  }
  return plantilla;
}

/**
 * Qué se considera un `slug` con el que se puede tocar el disco.
 *
 * <p>Es la parte de esto que hay que mirar dos veces: con el prerenderizado parcial, un trozo de la
 * dirección que escribe QUIEN PIDE pasa a formar parte de una ruta de fichero. Nginx ya normaliza el
 * `..` antes de que esto se ejecute y la expresión del `location` no admite barras, pero eso son dos
 * defensas de otro fichero: si mañana alguien cambia el `location`, la protección se evaporaría en
 * silencio. Así que aquí se valida por lista blanca —lo que de verdad puede ser un `slug` del
 * catálogo, comprobado contra los 7.729— y lo que no encaje ni se busca en el disco.
 */
const SLUG_VALIDO = /^[A-Za-z0-9._~-]{1,200}$/;

/**
 * El HTML ya pintado de esta ficha, si entró en el cupo del prerenderizado; si no, `null`.
 *
 * <p>NO se guarda en memoria lo leído, y es a propósito. Guardarlo por `slug` significaría un mapa que
 * crece con cada dirección pedida: con fichas de 105 a 466 kB, unas pocas miles de peticiones a
 * direcciones inventadas se comerían la memoria del proceso. Leer del disco cuesta lo que cuesta una
 * copia desde la caché de páginas del sistema —el fichero acaba de servirse mil veces—, y por delante
 * hay cinco minutos de caché en el borde, así que a la mayoría de las peticiones ni les llega el
 * turno. El esqueleto sí se guarda porque es UNO y lo comparten todas.
 */
function plantillaPrerenderizada(r, slug) {
  if (!SLUG_VALIDO.test(slug) || slug === '.' || slug === '..') {
    return null;
  }
  try {
    return fs.readFileSync(RAIZ_WEB + '/catalog/' + slug + '/index.html', 'utf8');
  } catch (e) {
    // Lo NORMAL es que no exista: solo unas cientos de las 7.729 entran en el cupo. No se anota nada
    // para no llenar el registro con una línea por visita.
    return null;
  }
}

/**
 * Punto de entrada. Lo llama nginx para `/catalog/<slug>`.
 *
 * <p>La regla es que esto NUNCA puede tumbar una ficha. Si el backend no responde, tarda o el producto
 * no existe, se devuelve el HTML de siempre y la aplicación se encarga, exactamente como hasta ahora.
 * Lo que se está añadiendo es una mejora del `<head>`, no una dependencia nueva para poder ver la
 * página.
 */
async function ficha(r) {
  const slug = decodeURIComponent((r.uri.match(/^\/catalog\/([^/]+)\/?$/) || [])[1] || '');

  // La plantilla: el HTML ya pintado de esta ficha si entró en el cupo del prerenderizado, y el
  // esqueleto de siempre para las demás. Es lo único que cambia entre una ficha del cupo y el resto:
  // de aquí para abajo el camino es el mismo, así que no hay dos comportamientos que mantener.
  const base = plantillaPrerenderizada(r, slug) || leePlantilla(r);
  if (!base) {
    r.internalRedirect('@aplicacion');
    return;
  }

  const url = direccionCanonica(r, slug);

  let html = base;
  try {
    const respuesta = await r.subrequest('/_ficha_para_compartir/' + encodeURIComponent(slug), {
      method: 'GET',
    });
    if (respuesta.status === 200) {
      const producto = JSON.parse(respuesta.responseText);
      html = inyecta(base, etiquetas(producto, url));
    }
  } catch (e) {
    // Un producto retirado, un backend reiniciándose o un JSON raro no pueden dejar sin página a
    // quien ha pulsado el enlace. Se anota y se sirve el HTML de siempre.
    r.log('seo-ficha: sin etiquetas para «' + slug + '»: ' + e.message);
  }

  r.headersOut['Content-Type'] = 'text/html; charset=utf-8';
  // Se cachea en el borde por URL. Cinco minutos es el compromiso: un cambio de título o de precio se
  // ve enseguida, y una ficha muy compartida no golpea el backend en cada visita.
  r.headersOut['Cache-Control'] = 'public, max-age=0, s-maxage=300';
  // La respuesta depende del dominio por el que se ha entrado —la dirección canónica va dentro—, así
  // que el borde tiene que guardar una copia por dominio. Sin esto, lo que se cachea pidiendo por
  // `pre.` se serviría a quien entra por el dominio de producción, con el canónico del otro.
  r.headersOut['Vary'] = 'Host';
  r.return(200, html);
}

/**
 * Lo que ve nginx —`js_content seo.ficha`— y lo que ven las pruebas, en UN SOLO objeto.
 *
 * <p>TRAMPA, y costó un contenedor que no arrancaba: njs NO admite `export { a, b, c };`. Es la forma
 * natural de exponer funciones para probarlas, se escribió así, y el resultado fue nginx negándose a
 * arrancar con «SyntaxError: 'as' expected» en la línea de ese export. Un fallo de ARRANQUE, o sea el
 * escaparate entero caído, por una línea escrita para las pruebas. Lo destapó levantar la imagen: ni
 * los tipos, ni el lint, ni las 28 pruebas de este fichero lo vieron, porque Vitest sí admite esa forma.
 *
 * <p>El export POR DEFECTO sí lo admite njs, así que las funciones puras cuelgan de aquí: escapar,
 * recortar, elegir la foto, componer las etiquetas, limpiar el `<head>` y resolver la dirección
 * canónica. Es donde está lo que puede salir mal sin hacer ruido —una comilla sin escapar que parte un
 * atributo, un `Host` inventado que se cuela en el canónico, una limpieza que se come el CSS crítico— y
 * probarlo por la puerta de `ficha()` obligaría a montar una petición entera de nginx para comprobar
 * una sustitución de texto.
 */
export default { ficha, escapa, recorta, imagenPrincipal, etiquetas, limpia, inyecta, direccionCanonica };
