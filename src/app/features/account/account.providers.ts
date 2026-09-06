import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import {
  BAJA_DE_CUENTA_PORT,
  FIN_DE_SESION_PORT,
  PERFIL_PORT,
  PORTABILIDAD_PORT,
} from './domain/port/perfil.port';
import { AYUDA_DE_DIRECCION_PORT, DIRECCIONES_PORT } from './domain/port/direcciones.port';
import { METODOS_DE_PAGO_PORT, PASARELA_DE_TARJETA_PORT } from './domain/port/cobros.port';
import { FACTURAS_PORT, PLANES_PORT } from './domain/port/planes.port';
import {
  CODIGO_QR_PORT,
  DOBLE_FACTOR_PORT,
  SESIONES_ACTIVAS_PORT,
} from './domain/port/seguridad.port';
import { DESCARGA_PORT } from './domain/port/descarga.port';
import { PerfilHttpAdapter } from './infrastructure/perfil-http.adapter';
import { DireccionesHttpAdapter } from './infrastructure/direcciones-http.adapter';
import { CobrosHttpAdapter } from './infrastructure/cobros-http.adapter';
import { FacturasHttpAdapter, PlanesHttpAdapter } from './infrastructure/planes-http.adapter';
import { SeguridadHttpAdapter } from './infrastructure/seguridad-http.adapter';
import { StripeTarjetaAdapter } from './infrastructure/stripe-tarjeta.adapter';
import { QrLocalAdapter } from './infrastructure/qr-local.adapter';
import { DescargaNavegadorAdapter } from './infrastructure/descarga-navegador.adapter';
import { CobrosStore } from './application/state/cobros.store';
import { CuentaStore } from './application/state/cuenta.store';
import { DireccionesStore } from './application/state/direcciones.store';
import { PlanesStore } from './application/state/planes.store';
import {
  ConfirmaBajaDeCuenta,
  SolicitaBajaDeCuenta,
} from './application/use-case/baja-de-cuenta.use-case';
import { CambiaContrasena } from './application/use-case/cambia-contrasena.use-case';
import {
  AnadePaypal,
  AnadeTarjeta,
  CargaCobros,
  EliminaMetodoDePago,
  MarcaMetodoPorDefecto,
  PideCodigoDeBajaDeMetodo,
} from './application/use-case/cobros.use-case';
import { DescargaMisDatos } from './application/use-case/descarga-mis-datos.use-case';
import {
  CargaDirecciones,
  EliminaDireccion,
  GuardaDireccion,
} from './application/use-case/direcciones.use-case';
import { GuardaPerfil } from './application/use-case/guarda-perfil.use-case';
import {
  CancelaSuscripcion,
  CargaFacturas,
  CargaPlanes,
  ContrataPlan,
  DescargaFactura,
} from './application/use-case/planes.use-case';
import { RecuperaCuenta } from './application/use-case/recupera-cuenta.use-case';
import {
  ActivaDobleFactor,
  CargaSesionesActivas,
  ConfirmaDobleFactor,
  ConsultaDobleFactor,
  DesactivaDobleFactor,
  RevocaSesion,
} from './application/use-case/seguridad.use-case';

/**
 * Ata los puertos de «account» con sus adaptadores.
 *
 * <p>Es el único sitio del contexto donde aparece una clase de infraestructura —y el único donde se
 * nombra a Stripe. Todo lo demás, casos de uso, estado y pantallas, solo conoce las interfaces: cambiar
 * de pasarela de pago, o poner un doble en una prueba, es cambiar una línea de aquí.
 *
 * <p>Se declara en la ruta del contexto (`providers: [proveeAccount()]`) para que estas dependencias no
 * pesen en el arranque de quien nunca abre su perfil.
 *
 * <p>Con los puertos viajan también los CASOS DE USO y el ESTADO. Antes se marcaban `providedIn: 'root'`
 * y eso los construía en el inyector RAÍZ, que no ve lo que se declara en una ruta: al abrir el perfil
 * Angular no encontraba el `PerfilPort` y la pantalla moría con «NG0201: No provider found». Las pruebas
 * no lo detectaban porque en ellas el caso de uso y el doble del puerto se dan en el mismo banco; solo
 * se veía navegando. La regla que queda: quien depende de un puerto de este contexto vive en su
 * inyector, no en la raíz.
 */
export function proveeAccount(): EnvironmentProviders {
  return makeEnvironmentProviders([
    PerfilHttpAdapter,
    { provide: PERFIL_PORT, useFactory: () => inject(PerfilHttpAdapter) },
    { provide: BAJA_DE_CUENTA_PORT, useFactory: () => inject(PerfilHttpAdapter) },
    { provide: PORTABILIDAD_PORT, useFactory: () => inject(PerfilHttpAdapter) },
    { provide: FIN_DE_SESION_PORT, useFactory: () => inject(PerfilHttpAdapter) },

    DireccionesHttpAdapter,
    { provide: DIRECCIONES_PORT, useFactory: () => inject(DireccionesHttpAdapter) },
    { provide: AYUDA_DE_DIRECCION_PORT, useFactory: () => inject(DireccionesHttpAdapter) },

    CobrosHttpAdapter,
    { provide: METODOS_DE_PAGO_PORT, useFactory: () => inject(CobrosHttpAdapter) },

    PlanesHttpAdapter,
    { provide: PLANES_PORT, useFactory: () => inject(PlanesHttpAdapter) },
    FacturasHttpAdapter,
    { provide: FACTURAS_PORT, useFactory: () => inject(FacturasHttpAdapter) },

    SeguridadHttpAdapter,
    { provide: DOBLE_FACTOR_PORT, useFactory: () => inject(SeguridadHttpAdapter) },
    { provide: SESIONES_ACTIVAS_PORT, useFactory: () => inject(SeguridadHttpAdapter) },

    QrLocalAdapter,
    { provide: CODIGO_QR_PORT, useFactory: () => inject(QrLocalAdapter) },

    // La pasarela de tarjeta. Es el punto donde se decide QUIÉN cobra: hoy Stripe, montado a mano
    // sobre su biblioteca agnóstica porque su envoltura para React no existe en Angular.
    StripeTarjetaAdapter,
    { provide: PASARELA_DE_TARJETA_PORT, useFactory: () => inject(StripeTarjetaAdapter) },

    DescargaNavegadorAdapter,
    { provide: DESCARGA_PORT, useFactory: () => inject(DescargaNavegadorAdapter) },

    /* El estado de las pantallas de la cuenta. Va con los puertos y no en la raíz porque quien lo
     * escribe son los casos de uso de aquí: repartirlos entre dos inyectores daría dos estados, y el
     * formulario del perfil leería uno distinto del que acaba de rellenar el caso de uso. */
    CobrosStore,
    CuentaStore,
    DireccionesStore,
    PlanesStore,

    // Los casos de uso, junto a los puertos de los que dependen: mismo inyector, misma vida.
    SolicitaBajaDeCuenta,
    ConfirmaBajaDeCuenta,
    CambiaContrasena,
    CargaCobros,
    AnadeTarjeta,
    AnadePaypal,
    MarcaMetodoPorDefecto,
    PideCodigoDeBajaDeMetodo,
    EliminaMetodoDePago,
    DescargaMisDatos,
    CargaDirecciones,
    GuardaDireccion,
    EliminaDireccion,
    GuardaPerfil,
    CargaPlanes,
    CargaFacturas,
    ContrataPlan,
    CancelaSuscripcion,
    DescargaFactura,
    /* `RecuperaCuenta` no depende de ningún puerto de «account» —pide el usuario por el puerto de
     * «auth», que sí está en la raíz—, pero escribe en `CuentaStore`, que vive aquí. Dejarlo en la raíz
     * le dejaría sin ese almacén: donde está el estado tiene que estar quien lo escribe. */
    RecuperaCuenta,
    ConsultaDobleFactor,
    ActivaDobleFactor,
    ConfirmaDobleFactor,
    DesactivaDobleFactor,
    CargaSesionesActivas,
    RevocaSesion,
  ]);
}
