import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import {
  CATALOGO_PORT,
  PORTADA_PORT,
  TAXONOMIA_PORT,
} from './domain/port/catalogo.port';
import { FAVORITOS_PORT } from './domain/port/favoritos.port';
import { HISTORIAL_PORT } from './domain/port/historial.port';
import { RESENAS_PORT } from './domain/port/resenas.port';
import { PROMOCIONES_PORT } from './domain/port/promociones.port';
import { ANALITICA_DE_PRODUCTO_PORT } from './domain/port/analitica-de-producto.port';
import { EDICION_DE_FICHA_PORT } from './domain/port/edicion-de-ficha.port';
import { CESTA_PORT } from './domain/port/cesta.port';
import { GUIA_DE_BIENVENIDA_PORT } from './domain/port/guia-de-bienvenida.port';
import { CatalogoHttpAdapter } from './infrastructure/catalogo-http.adapter';
import { FavoritosHttpAdapter, HistorialHttpAdapter } from './infrastructure/favoritos-http.adapter';
import { ResenasHttpAdapter } from './infrastructure/resenas-http.adapter';
import { PromocionesHttpAdapter } from './infrastructure/promociones-http.adapter';
import { AnaliticaHttpAdapter } from './infrastructure/analitica-http.adapter';
import { EdicionDeFichaHttpAdapter } from './infrastructure/edicion-de-ficha-http.adapter';
import { CestaHttpAdapter } from './infrastructure/cesta-http.adapter';
import { GuiaDeBienvenidaHttpAdapter } from './infrastructure/guia-de-bienvenida-http.adapter';

/**
 * Ata los puertos de «catalog» con sus adaptadores.
 *
 * <p>Es el ÚNICO sitio del contexto donde aparece una clase de infraestructura. Todo lo demás —casos de
 * uso, estado, pantallas— solo conoce las interfaces, así que cambiar de proveedor de datos, o poner un
 * doble en una prueba, es cambiar estas líneas y nada más.
 *
 * <p>Se declara en las RUTAS del contexto y no en el arranque de la aplicación: quien entra a mirar el
 * catálogo se descarga esto, y quien entra a su cuenta no.
 */
export function proveeCatalogo(): EnvironmentProviders {
  return makeEnvironmentProviders([
    CatalogoHttpAdapter,
    { provide: CATALOGO_PORT, useFactory: () => inject(CatalogoHttpAdapter) },
    { provide: TAXONOMIA_PORT, useFactory: () => inject(CatalogoHttpAdapter) },
    { provide: PORTADA_PORT, useFactory: () => inject(CatalogoHttpAdapter) },

    FavoritosHttpAdapter,
    { provide: FAVORITOS_PORT, useFactory: () => inject(FavoritosHttpAdapter) },

    HistorialHttpAdapter,
    { provide: HISTORIAL_PORT, useFactory: () => inject(HistorialHttpAdapter) },

    ResenasHttpAdapter,
    { provide: RESENAS_PORT, useFactory: () => inject(ResenasHttpAdapter) },

    PromocionesHttpAdapter,
    { provide: PROMOCIONES_PORT, useFactory: () => inject(PromocionesHttpAdapter) },

    AnaliticaHttpAdapter,
    { provide: ANALITICA_DE_PRODUCTO_PORT, useFactory: () => inject(AnaliticaHttpAdapter) },

    EdicionDeFichaHttpAdapter,
    { provide: EDICION_DE_FICHA_PORT, useFactory: () => inject(EdicionDeFichaHttpAdapter) },

    CestaHttpAdapter,
    { provide: CESTA_PORT, useFactory: () => inject(CestaHttpAdapter) },

    GuiaDeBienvenidaHttpAdapter,
    { provide: GUIA_DE_BIENVENIDA_PORT, useFactory: () => inject(GuiaDeBienvenidaHttpAdapter) },
  ]);
}
