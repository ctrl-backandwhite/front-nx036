/**
 * Etiquetas para compartir de la ficha de producto, resueltas en la pasarela.
 *
 * EL PROBLEMA. Quien pega un enlace de una ficha en WhatsApp, Telegram, Slack o una red social no
 * abre la página: un robot pide el HTML y lee `og:title`, `og:description` y `og:image`. Esos robots
 * NO ejecutan JavaScript. Nuestra aplicación pone esas etiquetas al montar la ficha —en
 * `core/seo/etiquetas.service.ts`— así que llegan tarde para todo el mundo salvo para un navegador de
 * verdad. Resultado: cada enlace compartido salía con el título genérico del sitio y sin foto.
 *
 * POR QUÉ NO SE PRERENDERIZA. Es la respuesta obvia y no vale, por tres motivos que se midieron:
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
 */

import fs from 'fs';

/** El HTML base, leído una vez por proceso. Es el mismo para todas las fichas. */
let plantilla = null;

const RUTA_HTML = '/usr/share/nginx/html/index.csr.html';

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
 * Mete las etiquetas en el HTML.
 *
 * <p>Se sustituye el `<title>` que ya trae la plantilla en vez de añadir otro: dos títulos en un
 * documento son marcado inválido y cada robot elige uno distinto, así que la vista previa saldría bien
 * en unos sitios y mal en otros.
 */
function inyecta(html, bloque) {
  const sinTitulo = html.replace(/<title>[\s\S]*?<\/title>/i, '');
  return sinTitulo.replace(/<head>/i, '<head>\n' + bloque);
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

/** Lee la plantilla del disco. Si no se puede, se dice y se sigue: nunca se deja la ficha sin servir. */
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
 * Punto de entrada. Lo llama nginx para `/catalog/<slug>`.
 *
 * <p>La regla es que esto NUNCA puede tumbar una ficha. Si el backend no responde, tarda o el producto
 * no existe, se devuelve el HTML de siempre y la aplicación se encarga, exactamente como hasta ahora.
 * Lo que se está añadiendo es una mejora del `<head>`, no una dependencia nueva para poder ver la
 * página.
 */
async function ficha(r) {
  const base = leePlantilla(r);
  if (!base) {
    r.internalRedirect('@aplicacion');
    return;
  }

  const slug = decodeURIComponent((r.uri.match(/^\/catalog\/([^/]+)\/?$/) || [])[1] || '');
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

export default { ficha };
