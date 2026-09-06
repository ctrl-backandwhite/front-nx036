/**
 * El paso a paso de «conecta tu tienda», y el resumen técnico que repite la documentación.
 *
 * <p>DEUDA HEREDADA, a la vista y no escondida: en el front de React estos textos estaban escritos en
 * castellano DENTRO del componente, sin pasar por el diccionario. Salían en español aunque la interfaz
 * estuviera en inglés o en chino. Se portan tal cual —el encargo es que el diseño y el contenido no
 * cambien— pero sacados a datos, que es el paso previo obligatorio para traducirlos: mientras vivían
 * incrustados en el marcado, meterlos en los ocho diccionarios exigía reescribir la pantalla.
 *
 * <p>Para traducirlos basta con dar de alta las claves `connect.*` en `shared/i18n` y sustituir estos
 * literales por la clave; el resto de la pantalla no se entera.
 */
export type PlataformaDeConexion = 'shopify' | 'woocommerce';

export const PLATAFORMAS_DE_CONEXION: readonly PlataformaDeConexion[] = ['shopify', 'woocommerce'];

export interface PasoDeConexion {
  readonly titulo: string;
  readonly cuerpo: string;
}

export const PASOS_DE_CONEXION: Readonly<
  Record<PlataformaDeConexion, readonly PasoDeConexion[]>
> = {
  shopify: [
    {
      titulo: '1. Pide tus credenciales',
      cuerpo:
        'Desde tu panel de NX036, en "Integraciones", genera un client_id y client_secret (OAuth2). Estas credenciales identifican tu tienda y son secretas.',
    },
    {
      titulo: '2. Instala la conexión',
      cuerpo:
        'En Shopify, ve a Apps → Desarrollar apps → crea una app privada y autoriza los permisos de productos y pedidos (read_products, write_orders). Pega ahí la URL de NX036 y tus credenciales.',
    },
    {
      titulo: '3. Sincroniza el catálogo',
      cuerpo:
        'NX036 expone el catálogo en GET /api/v1/partner/catalog/products (con tu token Bearer). Los precios ya vienen como precio mayorista final, en la moneda que pidas (header X-Currency).',
    },
    {
      titulo: '4. Recibe los pedidos',
      cuerpo:
        'Cuando un cliente compra en tu Shopify, tu tienda envía el pedido a POST /api/v1/integrations/shops (webhook firmado). NX036 lo procesa, lo abastece con el proveedor y te devuelve el seguimiento.',
    },
  ],
  woocommerce: [
    {
      titulo: '1. Pide tus credenciales',
      cuerpo:
        'En tu panel de NX036, en "Integraciones", genera tu client_id y client_secret. Guárdalos de forma segura.',
    },
    {
      titulo: '2. Instala el conector',
      cuerpo:
        'En WooCommerce (WordPress) instala el conector NX036 (o usa la REST API de Woo). Introduce la URL de NX036 y tus credenciales para autorizar el acceso a productos y pedidos.',
    },
    {
      titulo: '3. Sincroniza el catálogo',
      cuerpo:
        'Importa productos desde GET /api/v1/partner/catalog/products. Los precios son el precio mayorista final y se calculan en tiempo real con la tasa del día en tu moneda (X-Currency).',
    },
    {
      titulo: '4. Recibe los pedidos',
      cuerpo:
        'Configura el webhook de Woo para enviar los pedidos a POST /api/v1/integrations/shops. NX036 los recibe, los procesa y te devuelve el número de seguimiento.',
    },
  ],
};

/** Las tres notas de pie de la página de conexión: autenticación, precios y direcciones de la API. */
export interface NotaDeConexion {
  readonly icono: 'llave' | 'giro' | 'codigo';
  readonly titulo: string;
  readonly cuerpo: string;
  /** Trozos que se pintan en tipografía de código, en el orden en que aparecen tras el cuerpo. */
  readonly codigos?: readonly string[];
}

export const NOTAS_DE_CONEXION: readonly NotaDeConexion[] = [
  {
    icono: 'llave',
    titulo: 'Autenticación',
    cuerpo: 'OAuth2 (client_id/secret) → token Bearer con scope',
    codigos: ['shop.sync'],
  },
  {
    icono: 'giro',
    titulo: 'Precios en vivo',
    cuerpo: 'Precio mayorista final calculado con la tasa del día en tu moneda.',
  },
  {
    icono: 'codigo',
    titulo: 'API',
    cuerpo: '',
    codigos: [
      '/api/v1/partner/catalog',
      '/api/v1/partner/orders',
      '/api/v1/integrations/shops',
    ],
  },
];

/**
 * Los pasos que la documentación de desarrolladores repite para cada integración, con más detalle que
 * la página pública de conexión. Misma deuda de traducción que lo anterior.
 */
export const PASOS_DE_INTEGRACION: Readonly<
  Record<PlataformaDeConexion, readonly PasoDeConexion[]>
> = {
  shopify: [
    {
      titulo: '1. Crea tu cuenta en NX036',
      cuerpo:
        'Entra al panel. En el menú Integraciones → Conectar tienda, elige Shopify y pulsa Generar credenciales. Copia tu client_id y client_secret (guárdalos, son secretos).',
    },
    {
      titulo: '2. Conecta tu tienda Shopify',
      cuerpo:
        'En Shopify ve a Configuración → Apps y canales de venta → Desarrollar apps, crea una app y dale permisos de read_products y write_orders. Pega ahí la URL de NX036 y tus credenciales para autorizar la conexión.',
    },
    {
      titulo: '3. Importa los productos',
      cuerpo:
        'Desde el panel de NX036 elige qué productos o categorías quieres vender y pulsa Sincronizar a Shopify. Aparecerán en tu tienda con fotos, descripción, variantes y precio mayorista final en tu moneda.',
    },
    {
      titulo: '4. Pon tu precio de venta (opcional)',
      cuerpo:
        'El precio importado es tu precio mayorista; fija por encima tu precio de venta al público en Shopify para tu beneficio de revendedor.',
    },
    {
      titulo: '5. Vende. Nosotros enviamos',
      cuerpo:
        'Cuando un cliente compra en tu Shopify, el pedido nos llega automáticamente, lo abastecemos con el proveedor y lo enviamos. Shopify recibe el número de seguimiento y tu cliente puede rastrearlo. Tú no tocas inventario.',
    },
  ],
  woocommerce: [
    {
      titulo: '1. Crea tu cuenta en NX036',
      cuerpo:
        'Entra al panel. En Integraciones → Conectar tienda, elige WooCommerce y pulsa Generar credenciales. Copia tu client_id y client_secret.',
    },
    {
      titulo: '2. Instala el conector en WordPress',
      cuerpo:
        'En tu WordPress (WooCommerce) instala el plugin NX036 (o usa la REST API de WooCommerce). En sus ajustes pega la URL de NX036 y tus credenciales, y autoriza el acceso a productos y pedidos.',
    },
    {
      titulo: '3. Importa los productos',
      cuerpo:
        'Desde el panel de NX036 elige los productos o categorías y pulsa Sincronizar a WooCommerce. Se crearán en tu tienda con imágenes, descripción, variantes y precio mayorista final en tu moneda.',
    },
    {
      titulo: '4. Ajusta tu precio de venta (opcional)',
      cuerpo: 'En WooCommerce, si quieres añadir tu propio margen de revendedor.',
    },
    {
      titulo: '5. Vende sin inventario',
      cuerpo:
        'Cada pedido de tu WooCommerce nos llega por webhook; lo procesamos, lo enviamos y devolvemos el seguimiento a tu tienda automáticamente.',
    },
  ],
};

/** La nota al pie de cada integración, la que aclara qué se sincroniza solo. */
export const NOTA_DE_INTEGRACION: Readonly<Record<PlataformaDeConexion, string>> = {
  shopify:
    'El stock y los precios se sincronizan solos; si un producto se agota, se marca como no disponible en tu tienda.',
  woocommerce:
    'Compatible con WooCommerce vía plugin o REST API. El conector mantiene stock y precios al día.',
};

/** El resumen técnico que cierra el capítulo de integraciones. */
export const RESUMEN_TECNICO: readonly string[] = [
  'Conectar la tienda: se hace desde tu panel (Integraciones → Conectar tienda), que llama a POST /api/me/shops con tu sesión. Ahí se registra la conexión y se genera el secreto inbound del webhook.',
  'Autenticación de la API: OAuth2 con tu client_id/secret → token Bearer (scopes catalog.read, orders.write, shop.sync).',
  'Catálogo: GET /api/v1/partner/catalog/products (precio mayorista final + tasa del día, en tu moneda con X-Currency).',
  'Crear pedidos: POST /api/v1/partner/orders (con el token Bearer y scope orders.write).',
  'Pedidos entrantes desde tu tienda: es un webhook firmado, POST /api/v1/integrations/shops/{shopId}/orders, con la cabecera X-NX-Signature (HMAC-SHA256 del cuerpo firmado con el secreto inbound de tu conexión) y opcionalmente Idempotency-Key. No es un endpoint para "crear la tienda" — la conexión se crea en el paso anterior.',
  'Seguimiento / consulta de pedidos: GET /api/v1/partner/orders/{id}.',
];
