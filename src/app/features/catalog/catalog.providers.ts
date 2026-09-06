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
import { FavoritosStore } from './application/state/favoritos.store';
import { ReferenciaDeCestaStore } from './application/state/referencia-de-cesta.store';
import { AbreLaFicha } from './application/use-case/abre-la-ficha.use-case';
import { AlternaFavorito } from './application/use-case/alterna-favorito.use-case';
import { AnadeALaCesta } from './application/use-case/anade-a-la-cesta.use-case';
import { BuscaProductos } from './application/use-case/busca-productos.use-case';
import { EditaLaFicha } from './application/use-case/edita-la-ficha.use-case';
import { ListaFavoritos, ListaHistorial } from './application/use-case/lista-guardados.use-case';
import { PublicaResena } from './application/use-case/publica-resena.use-case';

/**
 * Ata los puertos de «catalog» con sus adaptadores.
 *
 * <p>Es el ÚNICO sitio del contexto donde aparece una clase de infraestructura. Todo lo demás —casos de
 * uso, estado, pantallas— solo conoce las interfaces, así que cambiar de proveedor de datos, o poner un
 * doble en una prueba, es cambiar estas líneas y nada más.
 *
 * <p>Se declara en las RUTAS del contexto y no en el arranque de la aplicación: quien entra a mirar el
 * catálogo se descarga esto, y quien entra a su cuenta no.
 *
 * <p>Aquí van TAMBIÉN los casos de uso y el estado, y no marcados como `providedIn: 'root'`. La razón es
 * que un servicio de la raíz solo ve a los proveedores de la RAÍZ: si `BuscaProductos` viviera allí,
 * Angular lo construiría en el inyector raíz y su `CATALOGO_PORT` —que se declara en esta ruta— no
 * existiría, con lo que la pantalla reventaba nada más abrirla («NG0201: No provider found for
 * InjectionToken CatalogoPort»). No lo delataban las pruebas, donde todo se provee en el mismo banco.
 * Viviendo aquí, caso de uso y puerto comparten inyector y se cargan y se destruyen juntos.
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

    // El estado compartido de las pantallas del catálogo. Va con los puertos —y no en la raíz— porque
    // los casos de uso que lo escriben viven aquí: repartirlos entre dos inyectores daría dos estados.
    FavoritosStore,
    ReferenciaDeCestaStore,

    // Los casos de uso. Dependen de los puertos de arriba, así que su sitio es este inyector.
    AbreLaFicha,
    AlternaFavorito,
    AnadeALaCesta,
    BuscaProductos,
    EditaLaFicha,
    ListaFavoritos,
    ListaHistorial,
    PublicaResena,
  ]);
}
