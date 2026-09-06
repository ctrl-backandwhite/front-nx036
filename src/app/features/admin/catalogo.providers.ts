import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { CASOS_DE_USO_DE_CATALOGO } from './application/catalogo/casos-de-uso';
import { ALTA_DE_PRODUCTO_PORT } from './domain/catalogo/port/alta-de-producto.port';
import {
  ARBOL_DE_CATEGORIAS_PORT,
  CATEGORIAS_ADMIN_PORT,
} from './domain/catalogo/port/categorias-admin.port';
import {
  IDIOMAS_DE_TIENDA_PORT,
  TASAS_DE_CAMBIO_PORT,
} from './domain/catalogo/port/catalogo-comun.port';
import {
  FICHA_DE_PRODUCTO_PORT,
  IMAGENES_DE_PRODUCTO_PORT,
  VALORES_DE_VARIACION_PORT,
  VARIANTES_PORT,
} from './domain/catalogo/port/ficha-de-producto.port';
import { GRUPOS_DE_DECLARACION_PORT } from './domain/catalogo/port/grupos-de-declaracion.port';
import {
  GRUPOS_DE_PRODUCTOS_PORT,
  MIEMBROS_DE_GRUPO_PORT,
} from './domain/catalogo/port/grupos-de-productos.port';
import {
  ANUNCIOS_AL_BUS_PORT,
  COMPRESION_DE_IMAGENES_PORT,
  PRODUCTOS_ADMIN_PORT,
  PRODUCTOS_MASIVOS_PORT,
} from './domain/catalogo/port/productos-admin.port';
import {
  PROVEEDORES_ADMIN_PORT,
  PROVEEDORES_MASIVOS_PORT,
} from './domain/catalogo/port/proveedores-admin.port';
import {
  DESCARGA_DE_ARCHIVOS_PORT,
  EXPORTACION_DE_CATALOGO_PORT,
  EXPORTACION_EN_FLUJO_PORT,
  IMPORTACION_DE_CATALOGO_PORT,
  LECTOR_DE_ARCHIVOS_PORT,
} from './domain/catalogo/port/transferencia-de-catalogo.port';
import { AltaDeProductoHttpAdapter } from './infrastructure/catalogo/alta-de-producto-http.adapter';
import { ArchivosNavegadorAdapter } from './infrastructure/catalogo/archivos-navegador.adapter';
import { CatalogoComunHttpAdapter } from './infrastructure/catalogo/catalogo-comun-http.adapter';
import { CategoriasAdminHttpAdapter } from './infrastructure/catalogo/categorias-admin-http.adapter';
import { FichaDeProductoHttpAdapter } from './infrastructure/catalogo/ficha-de-producto-http.adapter';
import { GruposDeDeclaracionHttpAdapter } from './infrastructure/catalogo/grupos-de-declaracion-http.adapter';
import { GruposDeProductosHttpAdapter } from './infrastructure/catalogo/grupos-de-productos-http.adapter';
import { MiembrosDeGrupoHttpAdapter } from './infrastructure/catalogo/miembros-de-grupo-http.adapter';
import { ProductosAdminHttpAdapter } from './infrastructure/catalogo/productos-admin-http.adapter';
import { ProveedoresAdminHttpAdapter } from './infrastructure/catalogo/proveedores-admin-http.adapter';
import { TransferenciaDeCatalogoHttpAdapter } from './infrastructure/catalogo/transferencia-de-catalogo-http.adapter';
import { ValoresDeVariacionHttpAdapter } from './infrastructure/catalogo/valores-de-variacion-http.adapter';
import { VariantesHttpAdapter } from './infrastructure/catalogo/variantes-http.adapter';

/**
 * Ata los puertos del área de CATÁLOGO del panel con sus adaptadores.
 *
 * <p>Es el único sitio del área donde aparece una clase de infraestructura. Todo lo demás —casos de uso,
 * estado, pantallas— solo conoce las interfaces, así que cambiar de proveedor, o poner un doble en una
 * prueba, es cambiar estas líneas y nada más.
 *
 * <p>Va colgado de las rutas del área y no de la raíz para que el navegador no se descargue el panel
 * entero al abrir la tienda.
 */
export function proveeAdminCatalogo(): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...CASOS_DE_USO_DE_CATALOGO,

    ProductosAdminHttpAdapter,
    { provide: PRODUCTOS_ADMIN_PORT, useFactory: () => inject(ProductosAdminHttpAdapter) },
    { provide: PRODUCTOS_MASIVOS_PORT, useFactory: () => inject(ProductosAdminHttpAdapter) },
    { provide: ANUNCIOS_AL_BUS_PORT, useFactory: () => inject(ProductosAdminHttpAdapter) },
    { provide: COMPRESION_DE_IMAGENES_PORT, useFactory: () => inject(ProductosAdminHttpAdapter) },

    FichaDeProductoHttpAdapter,
    { provide: FICHA_DE_PRODUCTO_PORT, useFactory: () => inject(FichaDeProductoHttpAdapter) },
    { provide: IMAGENES_DE_PRODUCTO_PORT, useFactory: () => inject(FichaDeProductoHttpAdapter) },

    VariantesHttpAdapter,
    { provide: VARIANTES_PORT, useFactory: () => inject(VariantesHttpAdapter) },
    ValoresDeVariacionHttpAdapter,
    { provide: VALORES_DE_VARIACION_PORT, useFactory: () => inject(ValoresDeVariacionHttpAdapter) },

    CategoriasAdminHttpAdapter,
    { provide: CATEGORIAS_ADMIN_PORT, useFactory: () => inject(CategoriasAdminHttpAdapter) },
    { provide: ARBOL_DE_CATEGORIAS_PORT, useFactory: () => inject(CategoriasAdminHttpAdapter) },

    ProveedoresAdminHttpAdapter,
    { provide: PROVEEDORES_ADMIN_PORT, useFactory: () => inject(ProveedoresAdminHttpAdapter) },
    { provide: PROVEEDORES_MASIVOS_PORT, useFactory: () => inject(ProveedoresAdminHttpAdapter) },

    GruposDeProductosHttpAdapter,
    { provide: GRUPOS_DE_PRODUCTOS_PORT, useFactory: () => inject(GruposDeProductosHttpAdapter) },
    MiembrosDeGrupoHttpAdapter,
    { provide: MIEMBROS_DE_GRUPO_PORT, useFactory: () => inject(MiembrosDeGrupoHttpAdapter) },

    GruposDeDeclaracionHttpAdapter,
    { provide: GRUPOS_DE_DECLARACION_PORT, useFactory: () => inject(GruposDeDeclaracionHttpAdapter) },

    TransferenciaDeCatalogoHttpAdapter,
    {
      provide: IMPORTACION_DE_CATALOGO_PORT,
      useFactory: () => inject(TransferenciaDeCatalogoHttpAdapter),
    },
    {
      provide: EXPORTACION_DE_CATALOGO_PORT,
      useFactory: () => inject(TransferenciaDeCatalogoHttpAdapter),
    },

    AltaDeProductoHttpAdapter,
    { provide: ALTA_DE_PRODUCTO_PORT, useFactory: () => inject(AltaDeProductoHttpAdapter) },

    CatalogoComunHttpAdapter,
    { provide: IDIOMAS_DE_TIENDA_PORT, useFactory: () => inject(CatalogoComunHttpAdapter) },
    { provide: TASAS_DE_CAMBIO_PORT, useFactory: () => inject(CatalogoComunHttpAdapter) },

    // Todo lo que toca el disco de quien administra: leer un archivo, guardar uno y volcar por flujo.
    ArchivosNavegadorAdapter,
    { provide: LECTOR_DE_ARCHIVOS_PORT, useFactory: () => inject(ArchivosNavegadorAdapter) },
    { provide: DESCARGA_DE_ARCHIVOS_PORT, useFactory: () => inject(ArchivosNavegadorAdapter) },
    { provide: EXPORTACION_EN_FLUJO_PORT, useFactory: () => inject(ArchivosNavegadorAdapter) },
  ]);
}
