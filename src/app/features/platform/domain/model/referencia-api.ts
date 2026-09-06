/**
 * La referencia de la API pública, como DATOS.
 *
 * <p>En el front de React esto eran 1143 líneas de plantilla: cada endpoint escrito a mano con sus
 * cuatro ejemplos de código anidados dentro del marcado. Un muro así no se lee, no se prueba y no se
 * reordena sin erratas; y peor: el mismo endpoint documentado dos veces con distinta letra pequeña no
 * se detecta nunca.
 *
 * <p>Aquí es una lista, y la pantalla solo sabe pintar una ficha. Añadir un endpoint es añadir un
 * objeto; comprobar que la documentación cubre lo que el backend expone es recorrer un array.
 *
 * <p>Su sitio natural es `shared/content/`, junto a los textos legales e institucionales. Se queda en el
 * dominio de «platform» porque este porte solo puede escribir dentro de su contexto; moverlo después es
 * cambiar un import.
 */

export const URL_DE_PRODUCCION = 'https://nx036.com';
export const URL_DE_PRUEBAS = 'https://pre.nx036.com';

/** Los cuatro lenguajes de los ejemplos. El orden es el de las pestañas. */
export type LenguajeDeEjemplo = 'curl' | 'node' | 'python' | 'php';

export const ETIQUETAS_DE_LENGUAJE: Readonly<Record<LenguajeDeEjemplo, string>> = {
  curl: 'cURL',
  node: 'Node.js',
  python: 'Python',
  php: 'PHP',
};

export type EjemplosDeCodigo = Partial<Record<LenguajeDeEjemplo, string>>;

export interface ParametroDeEndpoint {
  readonly nombre: string;
  readonly tipo: string;
  readonly obligatorio: boolean;
  readonly descripcion: string;
}

export interface FichaDeEndpoint {
  readonly metodo: string;
  readonly ruta: string;
  /** Clave del diccionario con la frase que explica para qué sirve. */
  readonly claveIntro?: string;
  readonly parametros?: readonly ParametroDeEndpoint[];
  readonly peticion?: EjemplosDeCodigo;
  readonly respuesta?: string;
  /** Se puede repetir sin duplicar el efecto. Solo lo son los que crean algo. */
  readonly idempotente?: boolean;
}

/** Un apartado del capítulo de catálogo: título, icono e endpoints. */
export interface ApartadoDeReferencia {
  readonly id: string;
  readonly claveTitulo: string;
  readonly icono: string;
  readonly claveIntro?: string;
  readonly endpoints: readonly FichaDeEndpoint[];
  /** Aviso en ámbar que va tras el primer endpoint del apartado, cuando lo hay. */
  readonly avisoTrasElPrimero?: string;
}

/** Una entrada del índice lateral. `sangrada` marca los apartados de segundo nivel. */
export interface EntradaDelIndice {
  readonly id: string;
  readonly clave: string;
  readonly icono: string;
  readonly sangrada?: boolean;
}

export const INDICE: readonly EntradaDelIndice[] = [
  { id: 'quickstart', clave: 'docs.intro.heading', icono: 'cohete' },
  { id: 'overview', clave: 'docs.toc.overview', icono: 'nodos' },
  { id: 'auth', clave: 'docs.toc.auth', icono: 'escudo' },
  { id: 'integrations', clave: 'docs.toc.integrations', icono: 'enchufe' },
  { id: 'int-shopify', clave: 'docs.int.shopify.title', icono: 'tienda', sangrada: true },
  { id: 'int-woocommerce', clave: 'docs.int.woocommerce.title', icono: 'tienda', sangrada: true },
  { id: 'catalog', clave: 'docs.cat.heading', icono: 'tienda' },
  { id: 'cat-categories', clave: 'docs.cat.categories.title', icono: 'arbol', sangrada: true },
  { id: 'cat-products', clave: 'docs.cat.products.title', icono: 'cajas', sangrada: true },
  { id: 'cat-variants', clave: 'docs.cat.variants.title', icono: 'muestrario', sangrada: true },
  { id: 'cat-attrs', clave: 'docs.cat.attrs.title', icono: 'ajustes', sangrada: true },
  { id: 'cat-shipping', clave: 'docs.cat.shipping.title', icono: 'camion', sangrada: true },
  { id: 'cat-suppliers', clave: 'admin.suppliers.title', icono: 'comercio', sangrada: true },
  { id: 'checkout', clave: 'docs.toc.checkout', icono: 'rayo' },
  { id: 'tracking', clave: 'docs.toc.tracking', icono: 'camionRapido' },
  { id: 'webhooks', clave: 'docs.toc.webhooks', icono: 'antena' },
  { id: 'errors', clave: 'docs.toc.errors', icono: 'aviso' },
  { id: 'scopes', clave: 'docs.scopes.heading', icono: 'llave' },
  { id: 'limits', clave: 'docs.rate_limit.heading', icono: 'medidor' },
  { id: 'changelog', clave: 'docs.changelog.heading', icono: 'reloj' },
  { id: 'support', clave: 'docs.toc.support', icono: 'apreton' },
];

/** El endpoint de credenciales. Va suelto porque es el único de su capítulo. */
export const ENDPOINT_DE_CREDENCIALES: FichaDeEndpoint = {
  metodo: 'POST',
  ruta: '/oauth2/token',
  peticion: {
    curl: `curl -X POST ${URL_DE_PRODUCCION}/oauth2/token \\
  -u "your-client-id:your-client-secret" \\
  -d "grant_type=client_credentials&scope=catalog.read orders.write"`,
    node: `const basic = Buffer.from('client-id:client-secret').toString('base64')
const r = await fetch('${URL_DE_PRODUCCION}/oauth2/token', {
  method: 'POST',
  headers: { Authorization: \`Basic \${basic}\`, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'grant_type=client_credentials&scope=catalog.read orders.write',
})
const { access_token, expires_in } = await r.json()`,
    python: `import requests
r = requests.post("${URL_DE_PRODUCCION}/oauth2/token",
    auth=("client-id", "client-secret"),
    data={"grant_type": "client_credentials", "scope": "catalog.read orders.write"})
token = r.json()["access_token"]`,
    php: `$ch = curl_init('${URL_DE_PRODUCCION}/oauth2/token');
curl_setopt_array($ch, [
  CURLOPT_USERPWD       => 'client-id:client-secret',
  CURLOPT_POST          => true,
  CURLOPT_POSTFIELDS    => 'grant_type=client_credentials&scope=catalog.read orders.write',
  CURLOPT_RETURNTRANSFER=> true,
]);
$token = json_decode(curl_exec($ch), true)['access_token'];`,
  },
  respuesta: `{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type":   "Bearer",
  "expires_in":   43200,
  "scope":        "catalog.read orders.write"
}`,
};

/** Crear un pedido de socio. Lleva clave de idempotencia: repetirlo no cobra dos veces. */
export const ENDPOINT_DE_PEDIDO: FichaDeEndpoint = {
  metodo: 'POST',
  ruta: '/api/v1/partner/orders',
  idempotente: true,
  peticion: {
    curl: `curl -X POST ${URL_DE_PRODUCCION}/api/v1/partner/orders \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Idempotency-Key: po-2026-00042" \\
  -H "Content-Type: application/json" \\
  -d '{
    "externalOrderId": "PO-2026-00042",
    "shippingAddress": { "fullName": "Lucía", "line1": "C/ Mayor 12", "city": "Madrid", "country": "ES" },
    "items": [{ "productId": "d023e7b5-…", "quantity": 2 }]
  }'`,
    node: `const order = await (await fetch('${URL_DE_PRODUCCION}/api/v1/partner/orders', {
  method: 'POST',
  headers: { Authorization: \`Bearer \${token}\`, 'Idempotency-Key': 'po-2026-00042', 'Content-Type': 'application/json' },
  body: JSON.stringify({ externalOrderId: 'PO-2026-00042', shippingAddress: {…}, items: [{ productId, quantity: 2 }] }),
})).json()`,
    python: `r = requests.post("${URL_DE_PRODUCCION}/api/v1/partner/orders",
    headers={"Authorization": f"Bearer {token}", "Idempotency-Key": "po-2026-00042"},
    json={"externalOrderId": "PO-2026-00042", "shippingAddress": {…}, "items": [{"productId": id, "quantity": 2}]})`,
    php: `$ch = curl_init('${URL_DE_PRODUCCION}/api/v1/partner/orders');
curl_setopt_array($ch, [
  CURLOPT_POST       => true,
  CURLOPT_HTTPHEADER => ["Authorization: Bearer $token","Idempotency-Key: po-2026-00042","Content-Type: application/json"],
  CURLOPT_POSTFIELDS => json_encode([ 'externalOrderId' => 'PO-2026-00042', 'shippingAddress' => […], 'items' => [['productId' => $id, 'quantity' => 2]] ]),
  CURLOPT_RETURNTRANSFER=> true,
]);
$order = json_decode(curl_exec($ch), true);`,
  },
  respuesta: `{
  "id":          "0f17fc26-…",
  "orderNumber": "NX-1779236757-8302",
  "status":      "PAID",
  "total":       "18.86",
  "currency":    "USD",
  "placedAt":    "2026-05-20T07:25:57Z"
}`,
};

/** Consultar un pedido y su seguimiento. */
export const ENDPOINT_DE_SEGUIMIENTO: FichaDeEndpoint = {
  metodo: 'GET',
  ruta: '/api/v1/partner/orders/{id}',
  peticion: {
    curl: `curl ${URL_DE_PRODUCCION}/api/v1/partner/orders/0f17fc26-… -H "Authorization: Bearer $TOKEN"`,
    node: `const o = await (await fetch(\`${URL_DE_PRODUCCION}/api/v1/partner/orders/\${id}\`, { headers: { Authorization: \`Bearer \${token}\` } })).json()`,
    python: `o = requests.get(f"${URL_DE_PRODUCCION}/api/v1/partner/orders/{order_id}", headers={"Authorization": f"Bearer {token}"}).json()`,
    php: `$ch = curl_init("${URL_DE_PRODUCCION}/api/v1/partner/orders/$id");
curl_setopt_array($ch, [
  CURLOPT_HTTPHEADER     => ["Authorization: Bearer $token"],
  CURLOPT_RETURNTRANSFER => true,
]);
$o = json_decode(curl_exec($ch), true);`,
  },
  respuesta: `{
  "orderNumber":     "NX-1779236757-8302",
  "status":          "SHIPPED",
  "trackingCarrier": "DHL",
  "trackingNumber":  "JD0145020XYZ",
  "shippedAt":       "2026-05-22T08:14:00Z"
}`,
};

/** Cómo se comprueba la firma de un aviso entrante. Es el ejemplo que más se copia y se pega. */
export const EJEMPLOS_DE_FIRMA: EjemplosDeCodigo = {
  node: `import crypto from 'node:crypto'
export function verify(rawBody, headerSig, secret) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(headerSig))
}`,
  python: `import hashlib, hmac
def verify(raw_body, header_sig, secret):
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header_sig)`,
  php: `function nx036_verify($body, $sig, $secret) {
  return hash_equals(hash_hmac('sha256', $body, $secret), $sig);
}`,
  curl: `# Headers received on your endpoint:
# X-NX036-Signature: 4f0a3c…  (hex HMAC-SHA256 of raw body)
# X-NX036-Event:      order.shipped
# X-NX036-Attempt:    1`,
};

/** El ejemplo de cuerpo de error. Es el mismo para todos los códigos. */
export const EJEMPLO_DE_ERROR = `{
  "code":      "BR001",
  "message":   "Insufficient wallet balance",
  "data":      null,
  "details":   null,
  "timestamp": "2026-05-20T07:25:33.124Z"
}`;

/** Los avisos que se envían, con la clave del diccionario que los explica. */
export const AVISOS_DE_PEDIDO: readonly { readonly nombre: string; readonly clave: string }[] = [
  { nombre: 'order.forwarded', clave: 'docs.webhooks.event.forwarded' },
  { nombre: 'order.shipped', clave: 'docs.webhooks.event.shipped' },
  { nombre: 'order.delivered', clave: 'docs.webhooks.event.delivered' },
  { nombre: 'order.cancelled', clave: 'docs.webhooks.event.cancelled' },
  { nombre: 'order.refunded', clave: 'docs.webhooks.event.refunded' },
];

export const CODIGOS_DE_ERROR: readonly {
  readonly codigo: string;
  readonly estado: number;
  readonly clave: string;
}[] = [
  { codigo: 'SE002', estado: 401, clave: 'docs.errors.code.unauth' },
  { codigo: 'SE001', estado: 403, clave: 'docs.errors.code.forbidden' },
  { codigo: 'ENF001', estado: 404, clave: 'docs.errors.code.not_found' },
  { codigo: 'BR001', estado: 422, clave: 'docs.errors.code.business' },
  { codigo: 'RATE_LIMITED', estado: 429, clave: 'docs.errors.code.rate' },
  { codigo: 'IS001', estado: 500, clave: 'docs.errors.code.server' },
];

/** Las cinco paradas por las que pasa un pedido. */
export const CICLO_DEL_PEDIDO: readonly { readonly nombre: string; readonly clave: string }[] = [
  { nombre: 'placed', clave: 'docs.checkout.flow.placed' },
  { nombre: 'paid', clave: 'docs.checkout.flow.paid' },
  { nombre: 'forwarded', clave: 'docs.checkout.flow.forwarded' },
  { nombre: 'shipped', clave: 'docs.checkout.flow.shipped' },
  { nombre: 'delivered', clave: 'docs.checkout.flow.delivered' },
];

/** Los permisos que se pueden pedir al obtener un token. */
export const PERMISOS: readonly { readonly nombre: string; readonly clave: string }[] = [
  { nombre: 'catalog.read', clave: 'docs.scope.catalog_read' },
  { nombre: 'orders.write', clave: 'docs.scope.orders_write' },
  { nombre: 'shop.sync', clave: 'docs.scope.shop_sync' },
];

/**
 * Quita el nombre del permiso o del evento cuando el texto traducido lo repite.
 *
 * <p>Los diccionarios guardan «catalog.read — leer el catálogo» en una sola clave, y la tabla ya pinta
 * el nombre en su propia columna. Sin esto se lee dos veces seguidas.
 */
export function soloLaExplicacion(texto: string): string {
  const guion = texto.indexOf('—');
  return guion >= 0 ? texto.slice(guion + 1).trim() : texto;
}
