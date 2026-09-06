import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PAIS_COMODIN, limiteEnBlanco } from '../../domain/logistica/model/limite-transportista';
import { operadorEnBlanco } from '../../domain/logistica/model/cumplimiento';
import { LimitesTransportistaHttpAdapter } from './limites-transportista-http.adapter';
import { AlmacenesHttpAdapter } from './almacenes-http.adapter';
import { ImpuestosHttpAdapter } from './impuestos-http.adapter';
import { CumplimientoHttpAdapter } from './cumplimiento-http.adapter';
import { OperadoresHttpAdapter } from './operadores-http.adapter';
import { ComprasHttpAdapter } from './compras-http.adapter';
import { SeguimientoHttpAdapter } from './seguimiento-http.adapter';
import { BuscadorDeProductosHttpAdapter } from './buscador-de-productos-http.adapter';

/** Monta un adaptador con el cliente HTTP de pruebas. Cada uno se prueba aislado del resto. */
function monta<T>(tipo: Type<T>): { instancia: T; http: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), tipo],
  });
  return { instancia: TestBed.inject(tipo), http: TestBed.inject(HttpTestingController) };
}

describe('LimitesTransportistaHttpAdapter', () => {
  it('una fila sin marca de vigencia se toma como ACTIVA, no como apagada', async () => {
    const { instancia, http } = monta(LimitesTransportistaHttpAdapter);
    const promesa = instancia.lista();

    http.expectOne('/api/admin/carrier-limits').flush([
      { channelCode: 'FZZXR', countryCode: '*' },
    ]);

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor[0].activo).toBe(true);
    expect(resultado.ok && resultado.valor[0].pesoMaximoGramos).toBe(0);
    http.verify();
  });

  it('guarda contra la ruta canal+país y sube el canal a mayúsculas', async () => {
    const { instancia, http } = monta(LimitesTransportistaHttpAdapter);
    const promesa = instancia.guarda({ ...limiteEnBlanco(), canal: ' fzzxr ', pais: 'ES' });

    const peticion = http.expectOne('/api/admin/carrier-limits/FZZXR/ES');
    expect(peticion.request.body.channelCode).toBe('FZZXR');
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
    http.verify();
  });

  /** El asterisco es un carácter válido en una ruta: se manda tal cual. */
  it('el comodín viaja sin escapar', async () => {
    const { instancia, http } = monta(LimitesTransportistaHttpAdapter);
    const promesa = instancia.borra('FZZXR', PAIS_COMODIN);

    http.expectOne('/api/admin/carrier-limits/FZZXR/*').flush({});

    expect((await promesa).ok).toBe(true);
    http.verify();
  });
});

describe('AlmacenesHttpAdapter', () => {
  it('traduce el almacén y distingue crear de actualizar', async () => {
    const { instancia, http } = monta(AlmacenesHttpAdapter);

    const lectura = instancia.lista();
    http
      .expectOne('/api/admin/warehouses')
      .flush([{ id: 'a1', code: 'ES-MAD', name: 'Madrid', active: false }]);
    const resultado = await lectura;
    expect(resultado.ok && resultado.valor[0].codigo).toBe('ES-MAD');
    expect(resultado.ok && resultado.valor[0].activo).toBe(false);

    const alta = instancia.crea({ codigo: 'ES-BCN', nombre: 'Barcelona', activo: true });
    const peticionAlta = http.expectOne('/api/admin/warehouses');
    expect(peticionAlta.request.method).toBe('POST');
    peticionAlta.flush({});
    expect((await alta).ok).toBe(true);

    const edicion = instancia.actualiza('a1', {
      codigo: 'ES-MAD',
      nombre: 'Madrid',
      activo: true,
    });
    const peticionEdicion = http.expectOne('/api/admin/warehouses/a1');
    expect(peticionEdicion.request.method).toBe('PUT');
    peticionEdicion.flush({});
    expect((await edicion).ok).toBe(true);

    const borrado = instancia.borra('a1');
    http.expectOne('/api/admin/warehouses/a1').flush({});
    expect((await borrado).ok).toBe(true);

    http.verify();
  });
});

describe('ImpuestosHttpAdapter', () => {
  it('convierte el porcentaje a puntos básicos al guardar', async () => {
    const { instancia, http } = monta(ImpuestosHttpAdapter);
    const promesa = instancia.guarda({
      pais: ' es ',
      etiqueta: 'IVA',
      porcentaje: 21,
      activo: true,
    });

    const peticion = http.expectOne('/api/admin/tax-rates/ES');
    expect(peticion.request.body).toEqual({ label: 'IVA', rateBps: 2100, active: true });
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
    http.verify();
  });

  /** El nulo NO es un cero: significa «usa la tasa nacional». */
  it('una región sin tasa propia se manda con la tasa a nulo', async () => {
    const { instancia, http } = monta(ImpuestosHttpAdapter);
    const promesa = instancia.guardaRegion('US', {
      codigo: 'ca',
      nombre: ' California ',
      porcentaje: '',
      activo: true,
    });

    const peticion = http.expectOne('/api/admin/regions/US/CA');
    expect(peticion.request.body).toEqual({
      name: 'California',
      rateBps: null,
      active: true,
    });
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
    http.verify();
  });

  it('las regiones se piden por parámetro de país', async () => {
    const { instancia, http } = monta(ImpuestosHttpAdapter);
    const promesa = instancia.regiones('US');

    const peticion = http.expectOne((r) => r.url === '/api/admin/regions');
    expect(peticion.request.params.get('country')).toBe('US');
    peticion.flush([
      { countryCode: 'US', regionCode: 'CA', regionName: 'California', ratePercent: null },
    ]);

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor[0].porcentaje).toBeNull();
    http.verify();
  });

  it('borrar un país y una región llegan a sus rutas', async () => {
    const { instancia, http } = monta(ImpuestosHttpAdapter);

    const pais = instancia.borra('ES');
    http.expectOne('/api/admin/tax-rates/ES').flush({});
    expect((await pais).ok).toBe(true);

    const region = instancia.borraRegion('US', 'CA');
    http.expectOne('/api/admin/regions/US/CA').flush({});
    expect((await region).ok).toBe(true);

    http.verify();
  });

  it('la lista traduce los porcentajes que calcula el servidor', async () => {
    const { instancia, http } = monta(ImpuestosHttpAdapter);
    const promesa = instancia.lista();

    http
      .expectOne('/api/admin/tax-rates')
      .flush([{ countryCode: 'ES', label: 'IVA', rateBps: 2100, ratePercent: 21, active: true }]);

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor[0].porcentaje).toBe(21);
    http.verify();
  });
});

describe('CumplimientoHttpAdapter', () => {
  /** Cuando no hay operador declarado el backend responde sin cuerpo. */
  it('un cuerpo vacío se traduce a «no hay operador», no a un objeto a medias', async () => {
    const { instancia, http } = monta(CumplimientoHttpAdapter);
    const promesa = instancia.operador('es');

    http.expectOne((r) => r.url === '/api/admin/compliance/responsible-person').flush('');

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toBeNull();
    http.verify();
  });

  it('traduce el operador declarado al vocabulario del dominio', async () => {
    const { instancia, http } = monta(CumplimientoHttpAdapter);
    const promesa = instancia.operador('es');

    http.expectOne((r) => r.url === '/api/admin/compliance/responsible-person').flush({
      name: 'NX036 SL',
      addressLine: 'C/ Mayor 1',
      country: 'ES',
      email: 'legal@nx036.test',
      role: 'IMPORTER',
      enabled: true,
    });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor?.nombre).toBe('NX036 SL');
    expect(resultado.ok && resultado.valor?.publicado).toBe(true);
    http.verify();
  });

  it('el guardado manda los nombres del backend con el idioma en la ruta', async () => {
    const { instancia, http } = monta(CumplimientoHttpAdapter);
    const promesa = instancia.guardaOperador(
      { ...operadorEnBlanco(), nombre: 'NX036 SL' },
      'fr',
    );

    const peticion = http.expectOne('/api/admin/compliance/responsible-person?lang=fr');
    expect(peticion.request.body.name).toBe('NX036 SL');
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
    http.verify();
  });

  it('los papeles y el estado se traducen con sus valores por defecto', async () => {
    const { instancia, http } = monta(CumplimientoHttpAdapter);

    const papeles = instancia.papeles('es');
    http
      .expectOne((r) => r.url === '/api/admin/compliance/operator-roles')
      .flush([{ code: 'IMPORTER', label: 'Importador' }]);
    const resultadoPapeles = await papeles;
    expect(resultadoPapeles.ok && resultadoPapeles.valor[0].codigo).toBe('IMPORTER');

    const estado = instancia.estado('es');
    http.expectOne((r) => r.url === '/api/admin/compliance/status').flush({});
    const resultadoEstado = await estado;
    expect(resultadoEstado.ok && resultadoEstado.valor).toEqual({
      operadorPublicado: false,
      productosActivos: 0,
      sinFabricante: 0,
    });

    http.verify();
  });
});

describe('OperadoresHttpAdapter', () => {
  it('el rango viaja como parámetros y los importes llegan en céntimos de yuan', async () => {
    const { instancia, http } = monta(OperadoresHttpAdapter);
    const promesa = instancia.resumen({ desde: '2026-08-01', hasta: '2026-09-01' });

    const peticion = http.expectOne((r) => r.url === '/api/admin/operator/earnings');
    expect(peticion.request.params.get('from')).toBe('2026-08-01');
    peticion.flush({ operatorSubject: 's1', operations: 3, totalCommissionCnyCents: 1500 });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.comisionCentimosCny).toBe(1500);
    http.verify();
  });

  it('el histórico traduce cada operación y respeta la página pedida', async () => {
    const { instancia, http } = monta(OperadoresHttpAdapter);
    const promesa = instancia.historico({ desde: 'a', hasta: 'b' }, 2, 20);

    const peticion = http.expectOne((r) => r.url === '/api/admin/operator/history');
    expect(peticion.request.params.get('page')).toBe('2');
    peticion.flush({
      items: [
        {
          operatorSubject: 's1',
          orderId: 'p1',
          orderNumber: 'NX-1',
          commissionCnyCents: 300,
          itemCount: 2,
          processedAt: '2026-09-01',
        },
      ],
      total: 1,
    });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.operaciones[0].numeroDePedido).toBe('NX-1');
    expect(resultado.ok && resultado.valor.pagina).toBe(2);
    http.verify();
  });

  it('el reporte y el reindexado llegan a sus rutas', async () => {
    const { instancia, http } = monta(OperadoresHttpAdapter);

    const reporte = instancia.reporte({ desde: 'a', hasta: 'b' });
    http
      .expectOne((r) => r.url === '/api/admin/operators/report')
      .flush([{ operatorSubject: 's1', operations: 2, totalCommissionCnyCents: 400 }]);
    const resultado = await reporte;
    expect(resultado.ok && resultado.valor[0].operaciones).toBe(2);

    const reindexado = instancia.reindexa();
    http.expectOne('/api/admin/operators/reindex').flush({ indexed: 9 });
    expect((await reindexado).ok).toBe(true);

    http.verify();
  });
});

describe('ComprasHttpAdapter', () => {
  it('traduce la cola al vocabulario del dominio', async () => {
    const { instancia, http } = monta(ComprasHttpAdapter);
    const promesa = instancia.cola();

    http.expectOne('/api/admin/purchases').flush([
      {
        id: 'c1',
        orderId: 'p1',
        orderNumber: 'NX-1',
        status: 'PENDING',
        items: [{ orderItemId: 'l1', title: 'Gorro', titleZh: '帽子', quantity: 2 }],
      },
    ]);

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor[0].lineas[0].tituloZh).toBe('帽子');
    http.verify();
  });

  /** El motivo viaja como parámetro de consulta, que es como lo espera el endpoint. */
  it('la anulación lleva el motivo en la dirección, escapado', async () => {
    const { instancia, http } = monta(ComprasHttpAdapter);
    const promesa = instancia.anula('c1', 'sin stock');

    http.expectOne('/api/admin/purchases/c1/cancel?reason=sin%20stock').flush({});

    expect((await promesa).ok).toBe(true);
    http.verify();
  });

  it('sin motivo la anulación va a la ruta limpia', async () => {
    const { instancia, http } = monta(ComprasHttpAdapter);
    const promesa = instancia.anula('c1');

    http.expectOne('/api/admin/purchases/c1/cancel').flush({});

    expect((await promesa).ok).toBe(true);
    http.verify();
  });

  it('el avance de la hoja cuenta exportables e incidencias', async () => {
    const { instancia, http } = monta(ComprasHttpAdapter);
    const promesa = instancia.avance();

    http.expectOne('/api/admin/purchases/pack-sheet/preview').flush({
      exportable: 2,
      issues: [{ orderId: 'p1', orderNumber: 'NX-1', reason: 'falta peso' }],
    });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.exportables).toBe(2);
    expect(resultado.ok && resultado.valor.incidencias[0].motivo).toBe('falta peso');
    http.verify();
  });

  it('la hoja se pide como binario y su fallo sale como error de la aplicación', async () => {
    const { instancia, http } = monta(ComprasHttpAdapter);

    const buena = instancia.descarga();
    const peticion = http.expectOne('/api/admin/purchases/pack-sheet');
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(new Blob(['xls']));
    expect((await buena).ok).toBe(true);

    const mala = instancia.descarga();
    http
      .expectOne('/api/admin/purchases/pack-sheet')
      .flush(null, { status: 409, statusText: '' });
    const resultado = await mala;
    expect(!resultado.ok && resultado.error.tipo).toBe('conflicto');

    http.verify();
  });

  it('los pasos de avance llegan a sus rutas con su cuerpo', async () => {
    const { instancia, http } = monta(ComprasHttpAdapter);

    const comprada = instancia.marcaComprada('c1', { referencia: 'R', costeCny: 4 });
    const p1 = http.expectOne('/api/admin/purchases/c1/bought');
    expect(p1.request.body).toEqual({ purchaseRef: 'R', costCny: 4, shippingCny: undefined });
    p1.flush({});
    expect((await comprada).ok).toBe(true);

    const enviada = instancia.marcaEnviada('c1', { seguimiento: 'SF1' });
    const p2 = http.expectOne('/api/admin/purchases/c1/shipped');
    expect(p2.request.body.domesticTracking).toBe('SF1');
    p2.flush({});
    expect((await enviada).ok).toBe(true);

    const recibida = instancia.marcaRecibida('c1');
    http.expectOne('/api/admin/purchases/c1/received').flush({});
    expect((await recibida).ok).toBe(true);

    const empaquetada = instancia.marcaReempaquetada('c1', { numeroDeOrden: 'PK' });
    http.expectOne('/api/admin/purchases/c1/packed').flush({});
    expect((await empaquetada).ok).toBe(true);

    const reexportada = instancia.reexporta('c1');
    http.expectOne('/api/admin/purchases/c1/reexport').flush({});
    expect((await reexportada).ok).toBe(true);

    http.verify();
  });
});

describe('SeguimientoHttpAdapter', () => {
  it('traduce eventos, bultos y declaraciones', async () => {
    const { instancia, http } = monta(SeguimientoHttpAdapter);
    const promesa = instancia.consulta('p1');

    http.expectOne('/api/admin/orders/p1/tracking').flush({
      status: 'SHIPPED',
      events: [{ status: 'SHIPPED', description: 'Recogido' }],
      shipments: [{ sequenceNo: 1, weightGrams: 500, events: [], items: [{ quantity: 2 }] }],
      declarations: [
        {
          sequenceNo: 1,
          waybillNumber: 'YT1',
          declaration: {
            receiver: { firstName: 'Ana', addressLines: ['C/ Mayor 1'] },
            lines: [{ nameEn: 'Hat', hsCode: '650500', quantity: 2 }],
          },
        },
      ],
    });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.bultos[0].pesoGramos).toBe(500);
    expect(resultado.ok && resultado.valor.declaraciones[0].destinatario?.nombre).toBe('Ana');
    expect(resultado.ok && resultado.valor.declaraciones[0].lineas[0].partidaArancelaria).toBe(
      '650500',
    );
    http.verify();
  });

  it('una declaración sin destinatario no revienta', async () => {
    const { instancia, http } = monta(SeguimientoHttpAdapter);
    const promesa = instancia.consulta('p1');

    http
      .expectOne('/api/admin/orders/p1/tracking')
      .flush({ declarations: [{ sequenceNo: 1 }] });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.declaraciones[0].destinatario).toBeUndefined();
    expect(resultado.ok && resultado.valor.declaraciones[0].lineas).toEqual([]);
    http.verify();
  });

  it('sincronizar llama a su ruta', async () => {
    const { instancia, http } = monta(SeguimientoHttpAdapter);
    const promesa = instancia.sincroniza('p1');

    http.expectOne('/api/admin/orders/p1/sync-tracking').flush({});

    expect((await promesa).ok).toBe(true);
    http.verify();
  });

  /** Un enlace directo viajaría sin credencial y devolvería un 401 en vez del PDF. */
  it('la factura se pide como binario y un rechazo sale como error de la aplicación', async () => {
    const { instancia, http } = monta(SeguimientoHttpAdapter);

    const buena = instancia.descarga('p1');
    const peticion = http.expectOne('/api/admin/orders/p1/invoice.pdf');
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(new Blob(['pdf']));
    expect((await buena).ok).toBe(true);

    const mala = instancia.descarga('p1');
    http.expectOne('/api/admin/orders/p1/invoice.pdf').flush(null, { status: 403, statusText: '' });
    const resultado = await mala;
    expect(!resultado.ok && resultado.error.tipo).toBe('sin-permiso');

    http.verify();
  });
});

describe('BuscadorDeProductosHttpAdapter', () => {
  /** Devuelve DOS campos: es lo que evita atar el panel al modelo de producto del catálogo. */
  it('pide al escaparate y se queda solo con identificador y título', async () => {
    const { instancia, http } = monta(BuscadorDeProductosHttpAdapter);
    const promesa = instancia.busca('gorro', 'es');

    const peticion = http.expectOne((r) => r.url === '/api/catalog/products');
    expect(peticion.request.params.get('q')).toBe('gorro');
    expect(peticion.request.params.get('lang')).toBe('es');
    peticion.flush({ items: [{ id: 'x', title: 'Gorro', price: 9 }] });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toEqual([{ id: 'x', titulo: 'Gorro' }]);
    http.verify();
  });

  it('un producto sin título no deja la sugerencia con un hueco indefinido', async () => {
    const { instancia, http } = monta(BuscadorDeProductosHttpAdapter);
    const promesa = instancia.busca('x', 'es');

    http.expectOne((r) => r.url === '/api/catalog/products').flush({ items: [{ id: 'x' }] });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor[0].titulo).toBe('');
    http.verify();
  });
});
