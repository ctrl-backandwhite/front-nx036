import { EnvironmentProviders, Provider, inject, makeEnvironmentProviders } from '@angular/core';
import {
  CATALOGO_PORT,
  PORTADA_PORT,
  TAXONOMIA_PORT,
} from './domain/port/catalogo.port';
import { FAVORITOS_PORT } from './domain/port/favoritos.port';
import { HISTORIAL_PORT } from './domain/port/historial.port';
import { RESENAS_PORT } from './domain/port/resenas.port';
import { PROMOCIONES_PORT } from './domain/port/promociones.port';
import { CIFRAS_DEL_SITIO_PORT } from './domain/port/cifras-del-sitio.port';
import { PAISES_DE_ENVIO_PORT } from './domain/port/paises-de-envio.port';
import { ALTA_EN_EL_BOLETIN_PORT } from './domain/port/alta-en-el-boletin.port';
import { ANALITICA_DE_PRODUCTO_PORT } from './domain/port/analitica-de-producto.port';
import { EDICION_DE_FICHA_PORT } from './domain/port/edicion-de-ficha.port';
import { CESTA_PORT } from './domain/port/cesta.port';
import { GUIA_DE_BIENVENIDA_PORT } from './domain/port/guia-de-bienvenida.port';
import { CatalogoHttpAdapter } from './infrastructure/catalogo-http.adapter';
import { FavoritosHttpAdapter, HistorialHttpAdapter } from './infrastructure/favoritos-http.adapter';
import { ResenasHttpAdapter } from './infrastructure/resenas-http.adapter';
import { PromocionesHttpAdapter } from './infrastructure/promociones-http.adapter';
import { CifrasDelSitioHttpAdapter } from './infrastructure/cifras-del-sitio-http.adapter';
import { PaisesDeEnvioHttpAdapter } from './infrastructure/paises-de-envio-http.adapter';
import { AltaEnElBoletinHttpAdapter } from './infrastructure/alta-en-el-boletin-http.adapter';
import { AnaliticaHttpAdapter } from './infrastructure/analitica-http.adapter';
import { EdicionDeFichaHttpAdapter } from './infrastructure/edicion-de-ficha-http.adapter';
import { CestaHttpAdapter } from './infrastructure/cesta-http.adapter';
import { GuiaDeBienvenidaHttpAdapter } from './infrastructure/guia-de-bienvenida-http.adapter';
import { FavoritosStore } from './application/state/favoritos.store';
import { ListadoStore } from './application/state/listado.store';
import { TaxonomiaStore } from './application/state/taxonomia.store';
import { ReferenciaDeCestaStore } from './application/state/referencia-de-cesta.store';
import { AbreLaFicha } from './application/use-case/abre-la-ficha.use-case';
import { MigaDeCategoria } from './application/use-case/miga-de-categoria.use-case';
import { AlternaFavorito } from './application/use-case/alterna-favorito.use-case';
import { AnadeALaCesta } from './application/use-case/anade-a-la-cesta.use-case';
import { BuscaProductos } from './application/use-case/busca-productos.use-case';
import { EditaLaFicha } from './application/use-case/edita-la-ficha.use-case';
import { ListaFavoritos, ListaHistorial } from './application/use-case/lista-guardados.use-case';
import { PublicaResena } from './application/use-case/publica-resena.use-case';

/**
 * Los casos de uso y el estado de «catalog».
 *
 * <p>Se listan aparte de los adaptadores para poder montarlos en una prueba EXACTAMENTE como los monta
 * la ruta. Es la lección del fallo que arregló esta lista: mientras cada clase se declaraba a sí misma
 * `providedIn: 'root'`, el banco de pruebas las tenía siempre a mano y la aplicación de verdad no, así
 * que 2.800 pruebas en verde convivían con pantallas que reventaban al abrirlas. Con una sola lista,
 * añadir un caso de uso lo mete a la vez en la ruta y en las pruebas, y no hay forma de que diverjan.
 */
export const APLICACION_DEL_CATALOGO: Provider[] = [
  FavoritosStore,
  ListadoStore,
  TaxonomiaStore,
  ReferenciaDeCestaStore,
  AbreLaFicha,
  MigaDeCategoria,
  AlternaFavorito,
  AnadeALaCesta,
  BuscaProductos,
  EditaLaFicha,
  ListaFavoritos,
  ListaHistorial,
  PublicaResena,
];

/**
 * Lo MÍNIMO del catálogo que necesitan los acompañantes del marco del escaparate: la guía de
 * bienvenida y la vista rápida de una ficha.
 *
 * <p>Existe por un problema de inyección con una única solución razonable. Los dos componentes viven en
 * el MARCO —salen sobre cualquier pantalla y su estado sobrevive al navegar—, pero `proveeCatalogo()`
 * cuelga de las rutas del catálogo. Desde el marco, que es su padre, esos proveedores no existen: la
 * guía reventaba con «NG0201: No provider found for InjectionToken GuiaDeBienvenidaPort» en cuanto
 * alguien entraba por `/orders` o por `/wallet`.
 *
 * <p>La alternativa era subir `proveeCatalogo()` entero al marco, y eso daría un segundo juego de
 * almacenes —listado, favoritos— por debajo del que ya montan las rutas del catálogo. Aquí se declara
 * solo lo que los dos acompañantes piden de verdad: cinco proveedores, no veintidós.
 *
 * <p>Sigue siendo este fichero y no `app.routes.ts` quien nombra los adaptadores, que es la regla del
 * contexto: fuera de aquí no aparece ninguna clase de infraestructura.
 */
export function proveeAcompanantesDelCatalogo(): EnvironmentProviders {
  return makeEnvironmentProviders([
    CatalogoHttpAdapter,
    { provide: CATALOGO_PORT, useFactory: () => inject(CatalogoHttpAdapter) },

    GuiaDeBienvenidaHttpAdapter,
    { provide: GUIA_DE_BIENVENIDA_PORT, useFactory: () => inject(GuiaDeBienvenidaHttpAdapter) },

    /* Ya no arrastra el puerto de la cesta: quien añade es el contrato público de «cart», que se
     * declara en el arranque. Aquí basta con el caso de uso. */
    AnadeALaCesta,
  ]);
}

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

    /* Las cifras del sitio: idiomas, divisas y almacenes. */
    CifrasDelSitioHttpAdapter,
    { provide: CIFRAS_DEL_SITIO_PORT, useFactory: () => inject(CifrasDelSitioHttpAdapter) },

    /* El cierre de la portada: la banda de países y el alta en el boletín. Los dos puertos son
     * propios del catálogo aunque otros contextos pregunten a las mismas rutas; ver el porqué en cada
     * fichero de puerto. */
    PaisesDeEnvioHttpAdapter,
    { provide: PAISES_DE_ENVIO_PORT, useFactory: () => inject(PaisesDeEnvioHttpAdapter) },

    AltaEnElBoletinHttpAdapter,
    { provide: ALTA_EN_EL_BOLETIN_PORT, useFactory: () => inject(AltaEnElBoletinHttpAdapter) },

    AnaliticaHttpAdapter,
    { provide: ANALITICA_DE_PRODUCTO_PORT, useFactory: () => inject(AnaliticaHttpAdapter) },

    EdicionDeFichaHttpAdapter,
    { provide: EDICION_DE_FICHA_PORT, useFactory: () => inject(EdicionDeFichaHttpAdapter) },

    CestaHttpAdapter,
    { provide: CESTA_PORT, useFactory: () => inject(CestaHttpAdapter) },

    GuiaDeBienvenidaHttpAdapter,
    { provide: GUIA_DE_BIENVENIDA_PORT, useFactory: () => inject(GuiaDeBienvenidaHttpAdapter) },

    ...APLICACION_DEL_CATALOGO,
  ]);
}
