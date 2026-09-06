import {
  IconDefinition,
  faBell,
  faBoxesPacking,
  faBoxesStacked,
  faCartShopping,
  faChalkboardUser,
  faChartLine,
  faCircleUser,
  faCoins,
  faEnvelope,
  faFileLines,
  faFileSignature,
  faGauge,
  faGraduationCap,
  faHandshake,
  faHeadset,
  faIndustry,
  faKey,
  faLanguage,
  faLayerGroup,
  faLifeRing,
  faMagnifyingGlassDollar,
  faPalette,
  faPercent,
  faSackDollar,
  faShieldHalved,
  faShop,
  faStore,
  faSwatchbook,
  faTag,
  faTags,
  faTruck,
  faUsers,
  faWallet,
  faWarehouse,
} from '@fortawesome/free-solid-svg-icons';

/** El papel de quien mira el panel. Decide qué opciones se pintan. */
export type PapelAdmin = 'ADMIN' | 'OPERATOR' | 'PARTNER' | 'USER';

export interface OpcionAdmin {
  readonly destino: string;
  readonly clave: string;
  readonly icono: IconDefinition;
  /** La coincidencia tiene que ser exacta: si no, «/admin» quedaría activo en todas sus subpáginas. */
  readonly exacta?: boolean;
  /** Solo para el personal interno (administración y soporte). */
  readonly soloPersonal?: boolean;
  /** Solo para clientes: al personal no le corresponde. */
  readonly soloCliente?: boolean;
  /** Lo que sí puede ver quien da soporte. Todo lo demás le queda fuera. */
  readonly permitidaAOperador?: boolean;
}

export interface SeccionAdmin {
  readonly clave: string;
  readonly opciones: readonly OpcionAdmin[];
}

/**
 * El mapa del panel.
 *
 * <p>El orden es el estándar de un panel de empresa: visión de conjunto → trabajo diario (catálogo y
 * ventas) → dinero → crecimiento → sistema → cuenta. Es una lista de DESTINOS y rótulos, no de reglas
 * de negocio: quién puede entrar de verdad a cada pantalla lo decide el backend, aquí solo se decide
 * qué se enseña para no ofrecer puertas que van a rebotar.
 */
export const SECCIONES_ADMIN: readonly SeccionAdmin[] = [
  {
    clave: 'admin.section.overview',
    opciones: [
      { destino: '/admin', clave: 'admin.nav.dashboard', icono: faGauge, exacta: true },
    ],
  },
  {
    clave: 'admin.section.catalog',
    opciones: [
      { destino: '/admin/browse', clave: 'admin.nav.browse', icono: faMagnifyingGlassDollar },
      { destino: '/admin/catalog', clave: 'admin.nav.products', icono: faBoxesStacked },
      { destino: '/admin/categories', clave: 'admin.nav.categories', icono: faTags },
      { destino: '/admin/suppliers', clave: 'admin.nav.suppliers', icono: faIndustry },
      { destino: '/admin/warehouses', clave: 'platform.warehouses', icono: faWarehouse },
      { destino: '/admin/pricing', clave: 'admin.nav.pricing', icono: faPercent },
      { destino: '/admin/product-groups', clave: 'admin.nav.product_groups', icono: faLayerGroup },
      { destino: '/admin/languages', clave: 'admin.nav.languages', icono: faLanguage },
      { destino: '/admin/currencies', clave: 'admin.nav.currencies', icono: faCoins },
      { destino: '/admin/taxes', clave: 'admin.nav.taxes', icono: faPercent },
      { destino: '/admin/promotions', clave: 'admin.nav.promotions', icono: faTag },
      { destino: '/admin/compliance', clave: 'admin.nav.compliance', icono: faShieldHalved },
      {
        destino: '/admin/declaration-groups',
        clave: 'admin.nav.declaration_groups',
        icono: faFileSignature,
      },
      { destino: '/admin/legal', clave: 'admin.legal.title', icono: faFileLines },
    ],
  },
  {
    clave: 'admin.section.operations',
    opciones: [
      { destino: '/admin/orders', clave: 'admin.nav.orders', icono: faTruck, permitidaAOperador: true },
      { destino: '/admin/purchases', clave: 'admin.nav.purchases', icono: faCartShopping },
      { destino: '/admin/carrier-limits', clave: 'admin.nav.carrier_limits', icono: faBoxesPacking },
      {
        destino: '/admin/operator/earnings',
        clave: 'operator.nav.earnings',
        icono: faSackDollar,
        permitidaAOperador: true,
      },
      { destino: '/admin/shops', clave: 'platform.shops', icono: faStore },
      { destino: '/admin/sourcing', clave: 'platform.sourcing', icono: faShop },
      { destino: '/admin/pod', clave: 'platform.pod', icono: faPalette },
      { destino: '/admin/odm', clave: 'platform.odm', icono: faIndustry },
      {
        destino: '/admin/affiliate',
        clave: 'platform.affiliate',
        icono: faHandshake,
        soloCliente: true,
      },
    ],
  },
  {
    clave: 'admin.section.finance',
    opciones: [
      { destino: '/admin/billing', clave: 'admin.nav.billing', icono: faSackDollar },
      { destino: '/admin/wallets', clave: 'admin.nav.wallets', icono: faWallet },
      {
        destino: '/admin/affiliates',
        clave: 'admin.affiliates.nav',
        icono: faHandshake,
        soloPersonal: true,
      },
    ],
  },
  {
    clave: 'admin.section.growth',
    opciones: [
      { destino: '/admin/intelligence', clave: 'platform.intelligence', icono: faChartLine },
      {
        destino: '/admin/newsletter',
        clave: 'admin.newsletter.nav',
        icono: faEnvelope,
        soloPersonal: true,
      },
      { destino: '/admin/academy', clave: 'platform.academy', icono: faGraduationCap },
      { destino: '/admin/mentors', clave: 'platform.mentors', icono: faChalkboardUser },
    ],
  },
  {
    clave: 'admin.section.system',
    opciones: [
      { destino: '/admin/users', clave: 'admin.nav.users', icono: faUsers },
      { destino: '/admin/operators', clave: 'admin.nav.operators', icono: faHeadset },
      { destino: '/admin/partners', clave: 'admin.nav.partners', icono: faKey },
      { destino: '/admin/notifications', clave: 'platform.notifications', icono: faBell },
      { destino: '/admin/support', clave: 'platform.support', icono: faLifeRing },
    ],
  },
  {
    clave: 'admin.section.account',
    opciones: [
      {
        destino: '/admin/profile',
        clave: 'admin.nav.profile',
        icono: faCircleUser,
        permitidaAOperador: true,
      },
      { destino: '/admin/styleguide', clave: 'admin.nav.styleguide', icono: faSwatchbook },
    ],
  },
];

/**
 * Las opciones que le tocan a un papel.
 *
 * <p>Quien da soporte solo ve lo suyo —procesar pedidos, sus ganancias y su perfil—: enseñarle el resto
 * sería ofrecerle puertas que el backend le va a cerrar. Las secciones que se quedan sin ninguna opción
 * visible no se pintan, para no dejar un título suelto sobre el vacío.
 */
export function seccionesPara(papel: PapelAdmin | null): readonly SeccionAdmin[] {
  const esOperador = papel === 'OPERATOR';
  const esPersonal = papel === 'ADMIN' || papel === 'OPERATOR';
  return SECCIONES_ADMIN.map((seccion) => ({
    clave: seccion.clave,
    opciones: seccion.opciones.filter((opcion) => {
      if (opcion.soloPersonal && !esPersonal) {
        return false;
      }
      if (opcion.soloCliente && esPersonal) {
        return false;
      }
      return !esOperador || !!opcion.permitidaAOperador;
    }),
  })).filter((seccion) => seccion.opciones.length > 0);
}
