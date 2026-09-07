import { TestBed } from '@angular/core/testing';
import { EnvironmentProviders, InjectionToken, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { proveeAccount } from '@features/account/account.providers';
import { proveeAfiliado, proveeAtribucionDeReferido } from '@features/affiliate/affiliate.providers';
import { proveeAdminCatalogo } from '@features/admin/catalogo.providers';
import { proveeAdminGestion } from '@features/admin/gestion.providers';
import { proveeAdminLogistica } from '@features/admin/logistica.providers';
import { proveeAuth } from '@features/auth/auth.providers';
import { proveeCarrito } from '@features/cart/cart.providers';
import {
  proveeAcompanantesDelCatalogo,
  proveeCatalogo,
} from '@features/catalog/catalog.providers';
import { proveeCheckout } from '@features/checkout/checkout.providers';
import { proveeNotifications } from '@features/notifications/notifications.providers';
import { proveePedidos } from '@features/orders/orders.providers';
import { proveePlatform } from '@features/platform/platform.providers';
import { proveeSupport } from '@features/support/support.providers';
import { proveeCartera } from '@features/wallet/wallet.providers';

/**
 * La raíz de composición: el ÚNICO sitio donde cada puerto se ata con su adaptador.
 *
 * <p>Es el fichero que el resto de la arquitectura da por hecho y el que nadie mira. Un puerto que se
 * declara y no se registra NO rompe la compilación —el `InjectionToken` existe igual— y tampoco rompe el
 * lint: revienta cuando alguien abre la pantalla que lo usa, con un `NullInjectorError` que menciona el
 * nombre del token y ninguna pista de qué línea falta. En producción eso es una pantalla en blanco.
 *
 * <p>Esta batería MONTA cada contexto y resuelve TODO lo que registra. No comprueba qué hace cada
 * adaptador —para eso está la prueba de cada uno—: comprueba que existe, que se puede construir y que
 * sus propias dependencias también están. Es lo que convierte «se me olvidó registrarlo» en un fallo de
 * la suite en vez de en una incidencia.
 */
describe('composición de los contextos', () => {
  /** Lo que cualquier adaptador necesita para poder construirse: configuración, HTTP y almacenamiento. */
  const BASE: (Provider | EnvironmentProviders)[] = [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
    { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
    {
      provide: APP_CONFIG,
      useValue: {
        apiBase: '',
        produccion: false,
        urlPublica: 'https://nx036.com',
        entorno: 'prueba',
      },
    },
  ];

  /**
   * Saca los tokens que registra un conjunto de proveedores.
   *
   * <p>Se leen de la estructura interna de `EnvironmentProviders` a propósito: enumerarlos a mano en la
   * prueba haría que un puerto NUEVO sin registrar pasara desapercibido, que es justo el fallo que esto
   * tiene que cazar. Así la lista se saca de lo que hay, y lo que falta se nota al resolverlo.
   */
  function tokensDe(proveedores: EnvironmentProviders): InjectionToken<unknown>[] {
    const encontrados: InjectionToken<unknown>[] = [];
    const recorre = (nodo: unknown): void => {
      if (Array.isArray(nodo)) {
        nodo.forEach(recorre);
        return;
      }
      if (!nodo || typeof nodo !== 'object') {
        return;
      }
      const registro = nodo as Record<string, unknown>;
      if (registro['ɵproviders']) {
        recorre(registro['ɵproviders']);
        return;
      }
      if (registro['provide'] instanceof InjectionToken) {
        encontrados.push(registro['provide'] as InjectionToken<unknown>);
      }
    };
    recorre(proveedores);
    return encontrados;
  }

  const CONTEXTOS: readonly [string, () => EnvironmentProviders][] = [
    ['auth', proveeAuth],
    ['catalog', proveeCatalogo],
    ['acompañantes del catálogo', proveeAcompanantesDelCatalogo],
    ['cart', proveeCarrito],
    ['checkout', proveeCheckout],
    ['orders', proveePedidos],
    ['account', proveeAccount],
    ['wallet', proveeCartera],
    ['affiliate', proveeAfiliado],
    ['atribución de referido', proveeAtribucionDeReferido],
    ['notifications', proveeNotifications],
    ['support', proveeSupport],
    ['platform', proveePlatform],
    ['admin · catálogo', proveeAdminCatalogo],
    ['admin · gestión', proveeAdminGestion],
    ['admin · logística', proveeAdminLogistica],
  ];

  for (const [nombre, provee] of CONTEXTOS) {
    it(`«${nombre}» registra un adaptador para cada puerto que declara`, () => {
      const proveedores = provee();
      TestBed.configureTestingModule({
        providers: [...BASE, proveedores as EnvironmentProviders],
      });

      const tokens = tokensDe(proveedores);
      expect(tokens.length, `«${nombre}» no registra ningún puerto: revisa la lectura`).toBeGreaterThan(0);

      for (const token of tokens) {
        expect(
          TestBed.inject(token, null),
          `«${nombre}»: el puerto ${String(token)} está declarado pero no se puede construir`,
        ).not.toBeNull();
      }
    });
  }
});
