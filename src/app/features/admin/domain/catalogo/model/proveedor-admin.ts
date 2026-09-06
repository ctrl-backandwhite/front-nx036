/**
 * Los proveedores del catálogo.
 *
 * <p>Casi todos llegan del volcado de 1688 y muchos vienen SIN ciudad. Por eso la ubicación se compone
 * con lo que existe y no concatenando a ciegas: había filas que empezaban por coma («, China»).
 */
export interface ProveedorAdmin {
  readonly id: string;
  readonly idExterno: string;
  readonly origen: string;
  readonly nombre: string;
  readonly nombreZh?: string;
  readonly pais?: string;
  readonly ciudad?: string;
  readonly valoracion?: number;
  readonly anosActivo?: number;
  readonly verificado: boolean;
  readonly trustPass: boolean;
  readonly urlPerfil?: string;
  readonly numeroDeProductos: number;
  readonly descripcion?: string;
  readonly plazoDeEntregaDias?: number;
  readonly puntualidadPorcentaje?: number;
  readonly tasaDeDefectos?: number;
  readonly horasDeRespuesta?: number;
}

export interface PaginaDeProveedores {
  readonly proveedores: readonly ProveedorAdmin[];
  readonly total: number;
  readonly paginas: number;
}

export interface CriterioDeProveedores {
  readonly texto?: string;
  readonly pais?: string;
  readonly verificado?: boolean;
  readonly pagina: number;
  readonly tamano: number;
}

/** Lo que se teclea en el alta y la edición de un proveedor. Todo texto: sale de campos de formulario. */
export interface BorradorDeProveedor {
  readonly nombre: string;
  readonly nombreZh: string;
  readonly pais: string;
  readonly ciudad: string;
  readonly valoracion: string;
  readonly anosActivo: string;
  readonly verificado: boolean;
  readonly trustPass: boolean;
  readonly urlPerfil: string;
}

export const BORRADOR_DE_PROVEEDOR_VACIO: BorradorDeProveedor = {
  nombre: '',
  nombreZh: '',
  pais: 'CN',
  ciudad: '',
  valoracion: '',
  anosActivo: '',
  verificado: false,
  trustPass: false,
  urlPerfil: '',
};

/** Lo que viaja al backend, ya con los tipos del negocio. El nulo BORRA; la cadena vacía no vale. */
export interface CambiosDeProveedor {
  readonly nombre: string;
  readonly nombreZh: string;
  readonly pais: string;
  readonly ciudad: string;
  readonly valoracion: number | null;
  readonly anosActivo: number | null;
  readonly verificado: boolean;
  readonly trustPass: boolean;
  readonly urlPerfil: string;
}

/**
 * Los países que se ofrecen en el filtro.
 *
 * <p>La lista es FIJA a propósito: derivarla de la página que se está viendo daría un desplegable
 * distinto en cada página y nunca ofrecería un país que no estuviera en las veinte filas cargadas.
 */
export const PAISES_DE_PROVEEDOR: readonly string[] = [
  'BR', 'CN', 'DE', 'ES', 'FR', 'GB', 'IN', 'IT', 'JP', 'KR', 'MX', 'PL', 'TH', 'TR', 'US', 'VN',
];

export function aBorradorDeProveedor(proveedor: ProveedorAdmin): BorradorDeProveedor {
  return {
    nombre: proveedor.nombre ?? '',
    nombreZh: proveedor.nombreZh ?? '',
    pais: proveedor.pais ?? '',
    ciudad: proveedor.ciudad ?? '',
    valoracion: proveedor.valoracion != null ? String(proveedor.valoracion) : '',
    anosActivo: proveedor.anosActivo != null ? String(proveedor.anosActivo) : '',
    verificado: proveedor.verificado,
    trustPass: proveedor.trustPass,
    urlPerfil: proveedor.urlPerfil ?? '',
  };
}

export function desdeBorradorDeProveedor(borrador: BorradorDeProveedor): CambiosDeProveedor {
  return {
    nombre: borrador.nombre.trim(),
    nombreZh: borrador.nombreZh.trim(),
    pais: borrador.pais.trim(),
    ciudad: borrador.ciudad.trim(),
    valoracion: borrador.valoracion ? Number(borrador.valoracion) : null,
    anosActivo: borrador.anosActivo ? Number(borrador.anosActivo) : null,
    verificado: borrador.verificado,
    trustPass: borrador.trustPass,
    urlPerfil: borrador.urlPerfil.trim(),
  };
}

/** «Yiwu, China», «China» o «—»: se une solo lo que hay, nunca una coma huérfana. */
export function ubicacionDeProveedor(ciudad?: string, pais?: string): string {
  return [ciudad, pais].filter(Boolean).join(', ') || '—';
}

/** Un proveedor sin nombre no se puede guardar: es lo único que lo identifica en la tabla. */
export function proveedorGuardable(borrador: BorradorDeProveedor): boolean {
  return borrador.nombre.trim() !== '';
}
