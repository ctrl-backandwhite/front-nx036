import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { CARRITO_GUARDADO_PORT, CARRITO_REMOTO_PORT } from './domain/port/carrito.port';
import { COTIZACION_DE_CARRITO_PORT } from './domain/port/cotizacion-de-carrito.port';
import { FICHA_PARA_ANADIR_PORT } from './domain/port/ficha-para-anadir.port';
import {
  ANADIR_AL_CARRITO_PORT,
  CARRITO_COMPARTIDO_PORT,
} from './domain/port/carrito-compartido.port';
import { CarritoHttpAdapter } from './infrastructure/carrito-http.adapter';
import { CarritoGuardadoHttpAdapter } from './infrastructure/carrito-guardado-http.adapter';
import { CotizacionDeCarritoHttpAdapter } from './infrastructure/cotizacion-de-carrito-http.adapter';
import { FichaParaAnadirHttpAdapter } from './infrastructure/ficha-para-anadir-http.adapter';
import { CarritoCompartido } from './application/state/carrito-compartido';
import { SincronizadorDelCarrito } from './application/state/sincronizador-del-carrito';
import { AnadeAlCarrito } from './application/use-case/anade-al-carrito.use-case';
import { ApartaParaMasTarde } from './application/use-case/aparta-para-mas-tarde.use-case';
import { CambiaLaCantidad } from './application/use-case/cambia-la-cantidad.use-case';
import { CotizaElCarrito } from './application/use-case/cotiza-el-carrito.use-case';
import { DevuelveAlCarrito } from './application/use-case/devuelve-al-carrito.use-case';
import { EliminaLoGuardado } from './application/use-case/elimina-lo-guardado.use-case';
import { QuitaDelCarrito } from './application/use-case/quita-del-carrito.use-case';
import { SincronizaConLaCuenta } from './application/use-case/sincroniza-con-la-cuenta.use-case';
import { VaciaElCarrito } from './application/use-case/vacia-el-carrito.use-case';

/**
 * Ata los puertos de «cart» con sus adaptadores.
 *
 * <p>Es el único sitio del contexto donde aparece una clase de infraestructura. Todo lo demás —casos de
 * uso, estado, pantallas— solo conoce las interfaces.
 *
 * <p>POR QUÉ LOS CASOS DE USO NO SON DE RAÍZ. Aquí se declaran junto a sus puertos, y no con
 * `providedIn: 'root'` como los de «auth». La diferencia es dónde se registran los proveedores: los de
 * «auth» viven en el arranque, así que sus puertos existen en la raíz; estos viven en las rutas, y un
 * servicio de raíz buscaría su puerto en la raíz —donde no está— y reventaría al inyectarlo. El único que
 * SÍ es de raíz es `CarritoStore`, porque no depende de ningún puerto y tiene que ser el mismo para la
 * cesta, el pago y el cajón: dos instancias serían dos cestas distintas.
 *
 * <p>DÓNDE VA. Hoy se declara en las rutas de «cart» y de «checkout», que son las dos que la necesitan. En
 * cuanto el marco de página monte el cajón lateral —que es de raíz, como en el front anterior—, su sitio
 * pasa a ser `app.config.ts`, junto a `proveeAuth()`, y hay que quitarlo de las rutas: declararlo en los
 * dos sitios crearía dos juegos de adaptadores.
 *
 * <p>El inicializador arranca la sincronización con la cuenta: al entrar sube la cesta del invitado y al
 * salir la retira. Es idempotente, así que registrarlo en dos rutas no la duplica.
 */
export function proveeCarrito(): EnvironmentProviders {
  return makeEnvironmentProviders([
    CarritoHttpAdapter,
    { provide: CARRITO_REMOTO_PORT, useFactory: () => inject(CarritoHttpAdapter) },
    CarritoGuardadoHttpAdapter,
    { provide: CARRITO_GUARDADO_PORT, useFactory: () => inject(CarritoGuardadoHttpAdapter) },
    CotizacionDeCarritoHttpAdapter,
    { provide: COTIZACION_DE_CARRITO_PORT, useFactory: () => inject(CotizacionDeCarritoHttpAdapter) },
    FichaParaAnadirHttpAdapter,
    { provide: FICHA_PARA_ANADIR_PORT, useFactory: () => inject(FichaParaAnadirHttpAdapter) },

    SincronizadorDelCarrito,
    AnadeAlCarrito,
    CambiaLaCantidad,
    QuitaDelCarrito,
    VaciaElCarrito,
    ApartaParaMasTarde,
    DevuelveAlCarrito,
    EliminaLoGuardado,
    CotizaElCarrito,
    SincronizaConLaCuenta,

    // El contrato público del contexto: es lo único que ven los demás contextos de la cesta.
    CarritoCompartido,
    { provide: CARRITO_COMPARTIDO_PORT, useFactory: () => inject(CarritoCompartido) },
    { provide: ANADIR_AL_CARRITO_PORT, useFactory: () => inject(CarritoCompartido) },

    provideEnvironmentInitializer(() => inject(SincronizaConLaCuenta).vigila()),
  ]);
}
