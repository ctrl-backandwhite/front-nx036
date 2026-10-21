import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, expect, it } from 'vitest';
import { APP_CONFIG } from '@core/config/app-config';
import { proveeAdminLogistica } from './logistica.providers';

import * as altaDePedidos from './application/logistica/use-case/alta-de-pedidos.use-case';
import * as averiguaQuienMira from './application/logistica/use-case/averigua-quien-mira.use-case';
import * as configuraLogistica from './application/logistica/use-case/configura-logistica.use-case';
import * as consultaGanancias from './application/logistica/use-case/consulta-ganancias.use-case';
import * as gestionaCompras from './application/logistica/use-case/gestiona-compras.use-case';
import * as gestionaCumplimiento from './application/logistica/use-case/gestiona-cumplimiento.use-case';
import * as gestionaImpuestos from './application/logistica/use-case/gestiona-impuestos.use-case';
import * as gestionaPedidos from './application/logistica/use-case/gestiona-pedidos.use-case';
import * as leePedidosPegados from './application/logistica/use-case/lee-pedidos-pegados.use-case';
import * as sigueElEnvio from './application/logistica/use-case/sigue-el-envio.use-case';

/**
 * TODO caso de uso del área tiene que poder construirse con los proveedores del área.
 *
 * <p>La prueba no enumera los casos de uso: los DESCUBRE recorriendo lo que exporta cada módulo. Es
 * a propósito, porque una lista escrita a mano tiene exactamente el mismo fallo que viene a cubrir
 * —se olvida uno— y el día que se olvida, aquí no falla nada. Lo que sí hay que mantener es la
 * lista de MÓDULOS de arriba cuando se añada un fichero de casos de uso; de eso avisa el recuento
 * mínimo del final.
 *
 * <p>Lo que costó: la pantalla de TARIFAS DE TRANSPORTISTA llevaba su puerto registrado y CUATRO de
 * sus casos de uso no. Al abrir /admin/carrier-rates el componente moría al construirse con NG0201
 * y el outlet se quedaba vacío: pantalla EN BLANCO, sin error a la vista, sin ninguna petición
 * fallida y sin nada en el registro del servidor. Era inalcanzable desde que se escribió, y no lo
 * vio nadie porque esa dirección tampoco estaba en la lista de las que se certifican en navegador.
 *
 * <p>El puerto registrado es justo lo que despista al revisarlo: el fichero PARECE completo.
 *
 * <p>Y por qué ESTA área y no las tres: catálogo y gestión registran sus casos de uso con un barril
 * —una sola línea con los puntos suspensivos— así que olvidar uno exige olvidarlo también al
 * escribirlo. Logística los listaba uno a uno, que es justo donde se cae.
 */
describe('proveeAdminLogistica', () => {
  /**
   * Las clases que ESTA área tiene que proveer.
   *
   * <p>Se quedan fuera las de la RAÍZ: un caso de uso con `Service` se registra solo y sus
   * dependencias son transversales —`AveriguaQuienMira` pide el puerto de «auth»—, así que exigirlo
   * aquí no mediría el área, mediría lo que falta en el montaje de la prueba.
   */
  function casosDeUso(modulo: Record<string, unknown>): [string, new () => unknown][] {
    return Object.entries(modulo).filter((par): par is [string, new () => unknown] => {
      if (typeof par[1] !== 'function' || !('ɵfac' in (par[1] as object))) {
        return false;
      }
      return (par[1] as { ɵprov?: { providedIn?: unknown } }).ɵprov?.providedIn !== 'root';
    });
  }

  it('sabe construir todos sus casos de uso, también los que se añadan después', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBase: '', produccion: false } },
        proveeAdminLogistica(),
      ],
    });

    const modulos: Record<string, Record<string, unknown>> = {
      'alta-de-pedidos': altaDePedidos,
      'averigua-quien-mira': averiguaQuienMira,
      'configura-logistica': configuraLogistica,
      'consulta-ganancias': consultaGanancias,
      'gestiona-compras': gestionaCompras,
      'gestiona-cumplimiento': gestionaCumplimiento,
      'gestiona-impuestos': gestionaImpuestos,
      'gestiona-pedidos': gestionaPedidos,
      'lee-pedidos-pegados': leePedidosPegados,
      'sigue-el-envio': sigueElEnvio,
    };

    let cuantos = 0;
    for (const [donde, modulo] of Object.entries(modulos)) {
      for (const [nombre, clase] of casosDeUso(modulo)) {
        expect(
          () => TestBed.inject(clase),
          `${nombre} (${donde}) no se puede construir: falta en proveeAdminLogistica, y la pantalla ` +
            'que lo pida saldrá EN BLANCO con NG0201',
        ).not.toThrow();
        cuantos++;
      }
    }

    /* Red de seguridad de la propia prueba: si el descubrimiento dejara de encontrar clases, todo lo
     * de arriba pasaría sin comprobar absolutamente nada. */
    expect(cuantos, 'el descubrimiento no encontró casos de uso').toBeGreaterThan(30);
  });
});
