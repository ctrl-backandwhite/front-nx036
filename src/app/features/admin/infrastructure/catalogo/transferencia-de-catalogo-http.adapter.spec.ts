import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoriasAdminHttpAdapter } from './categorias-admin-http.adapter';
import { TransferenciaDeCatalogoHttpAdapter } from './transferencia-de-catalogo-http.adapter';
import { CatalogoComunHttpAdapter } from './catalogo-comun-http.adapter';

describe('adaptadores de transferencia y apoyo', () => {
  let transferencia: TransferenciaDeCatalogoHttpAdapter;
  let categorias: CategoriasAdminHttpAdapter;
  let comun: CatalogoComunHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TransferenciaDeCatalogoHttpAdapter,
        CategoriasAdminHttpAdapter,
        CatalogoComunHttpAdapter,
      ],
    });
    transferencia = TestBed.inject(TransferenciaDeCatalogoHttpAdapter);
    categorias = TestBed.inject(CategoriasAdminHttpAdapter);
    comun = TestBed.inject(CatalogoComunHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('la importación manda las filas tal cual y devuelve el recuento', async () => {
    const pendiente = transferencia.importaProductos([{ titleEs: 'a' }]);
    const peticion = http.expectOne((r) => r.url.endsWith('/api/admin/catalog/products/bulk'));

    expect(peticion.request.body).toEqual([{ titleEs: 'a' }]);
    peticion.flush({ created: 1, failed: 0, errors: [] });

    expect(await pendiente).toEqual({ ok: true, valor: { creados: 1, fallidos: 0, errores: [] } });
  });

  /** El reindexado responde al instante: `arrancado` es lo que distingue «ya había uno» de «va». */
  it('el reindexado devuelve si de verdad se ha arrancado', async () => {
    const pendiente = transferencia.reindexa();
    http.expectOne((r) => r.url.endsWith('/api/admin/catalog/reindex')).flush({
      started: false,
      running: true,
      indexed: 5,
    });

    expect(await pendiente).toEqual({
      ok: true,
      valor: { enMarcha: true, indexados: 5, arrancado: false },
    });
  });

  it('el contador de la exportación lleva el filtro puesto', async () => {
    const pendiente = transferencia.cuenta({ creadoDesde: '2026-01-01', verificado: true });
    const peticion = http.expectOne((r) =>
      r.url.endsWith('/api/admin/catalog/products/export/count'),
    );

    expect(peticion.request.params.get('createdFrom')).toBe('2026-01-01');
    expect(peticion.request.params.get('verified')).toBe('true');
    peticion.flush({ count: 3200 });
    expect(await pendiente).toEqual({ ok: true, valor: 3200 });
  });

  it('la exportación por tramo pide el rango en base uno', async () => {
    const pendiente = transferencia.exporta(1, 1000, {});
    const peticion = http.expectOne((r) => r.url.endsWith('/api/admin/catalog/products/export'));

    expect(peticion.request.params.get('from')).toBe('1');
    expect(peticion.request.params.get('to')).toBe('1000');
    peticion.flush([{ titleEs: 'a' }]);
    await pendiente;
  });

  /** El alta espera el contrato de ingesta, que llama `nameTranslations` a lo que la edición llama `names`. */
  it('el alta de categoría manda los nombres con los dos nombres que espera el backend', async () => {
    const pendiente = categorias.crea({
      slug: 'ropa',
      nombreZh: '',
      nombreEs: 'Ropa',
      nombreEn: 'Clothes',
      nombrePt: '',
      padreId: '',
    });
    const peticion = http.expectOne((r) => r.url.endsWith('/api/admin/catalog/categories'));

    expect(peticion.request.body).toMatchObject({
      slug: 'ropa',
      nameZh: 'Ropa',
      names: { es: 'Ropa', en: 'Clothes', pt: undefined },
      nameTranslations: { es: 'Ropa', en: 'Clothes' },
      parentId: null,
    });
    peticion.flush({});
    await pendiente;
  });

  it('el árbol de categorías se aplana a «Padre › Hijo» y se ordena por esa ruta', async () => {
    const pendiente = categorias.consulta('es');
    http.expectOne((r) => r.url.endsWith('/api/catalog/categories/tree')).flush([
      { id: '1', name: 'Moda', children: [{ id: '2', name: 'Ropa' }] },
      { id: '3', name: 'Casa' },
    ]);

    const resultado = await pendiente;

    expect(resultado.ok && resultado.valor.map((c) => c.etiqueta)).toEqual([
      'Casa',
      'Moda',
      'Moda › Ropa',
    ]);
  });

  it('las divisas llegan como tasa por dólar', async () => {
    const pendiente = comun.listaDivisas();
    http.expectOne((r) => r.url.endsWith('/api/admin/currency/all')).flush([
      { code: 'EUR', rateVsUsd: 0.92 },
      { code: 'XXX' },
    ]);

    const resultado = await pendiente;

    expect(resultado.ok && resultado.valor).toEqual([
      { codigo: 'EUR', porDolar: 0.92 },
      { codigo: 'XXX', porDolar: 1 },
    ]);
  });

  it('los idiomas llegan con su etiqueta y si son el de por defecto', async () => {
    const pendiente = comun.lista();
    http.expectOne((r) => r.url.endsWith('/api/admin/languages')).flush([
      { id: '1', code: 'es', label: 'Español', active: true, isDefault: true },
      { id: '2', code: 'de' },
    ]);

    const resultado = await pendiente;

    expect(resultado.ok && resultado.valor[1]).toEqual({
      codigo: 'de',
      etiqueta: 'DE',
      activo: true,
      porDefecto: false,
    });
  });
});
