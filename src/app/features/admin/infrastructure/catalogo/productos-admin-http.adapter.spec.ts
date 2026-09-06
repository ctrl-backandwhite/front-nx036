import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductosAdminHttpAdapter } from './productos-admin-http.adapter';

describe('ProductosAdminHttpAdapter', () => {
  let adaptador: ProductosAdminHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProductosAdminHttpAdapter],
    });
    adaptador = TestBed.inject(ProductosAdminHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('lista', () => {
    it('traduce el JSON del backend al vocabulario del dominio', async () => {
      const pendiente = adaptador.lista({ pagina: 0, tamano: 30, idioma: 'es' });
      const peticion = http.expectOne((r) => r.url.endsWith('/api/admin/catalog/products'));
      peticion.flush({
        items: [
          {
            id: 'p1',
            slug: 'auricular',
            title: 'Auricular',
            basePrice: 18.5,
            currency: 'CNY',
            monthlySales: 120,
            status: 'ACTIVE',
            verified: true,
          },
        ],
        page: 0,
        size: 30,
        totalElements: 1,
        totalPages: 1,
      });

      const resultado = await pendiente;

      expect(resultado.ok && resultado.valor.productos[0]).toEqual({
        id: 'p1',
        slug: 'auricular',
        titulo: 'Auricular',
        imagenPrincipal: undefined,
        coste: 18.5,
        divisa: 'CNY',
        ventasMensuales: 120,
        tendencia: undefined,
        estado: 'ACTIVE',
        verificado: true,
      });
    });

    /** Un filtro sin valor no puede llegar al servidor como filtro puesto. */
    it('los filtros vacíos no viajan', async () => {
      const pendiente = adaptador.lista({
        pagina: 1,
        tamano: 30,
        idioma: 'es',
        texto: '  ',
        estado: 'ACTIVE',
        costeMinimo: 5,
      });
      const peticion = http.expectOne((r) => r.url.endsWith('/api/admin/catalog/products'));

      expect(peticion.request.params.has('q')).toBe(false);
      expect(peticion.request.params.get('status')).toBe('ACTIVE');
      expect(peticion.request.params.get('minCost')).toBe('5');

      peticion.flush({ items: [], page: 1, size: 30, totalElements: 0, totalPages: 1 });
      await pendiente;
    });

    it('un fallo del servidor se convierte en un error de la aplicación', async () => {
      const pendiente = adaptador.lista({ pagina: 0, tamano: 30, idioma: 'es' });
      http
        .expectOne((r) => r.url.endsWith('/api/admin/catalog/products'))
        .flush({ message: 'Se rompió' }, { status: 500, statusText: 'Server Error' });

      const resultado = await pendiente;

      expect(resultado.ok).toBe(false);
      expect(!resultado.ok && resultado.error.tipo).toBe('error-del-servidor');
      expect(!resultado.ok && resultado.error.mensaje).toBe('Se rompió');
    });
  });

  it('el cambio de estado va por su propia ruta', async () => {
    const pendiente = adaptador.cambiaEstado('p1', 'PAUSED');
    const peticion = http.expectOne((r) => r.url.endsWith('/api/admin/catalog/products/p1/status'));

    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({ status: 'PAUSED' });
    peticion.flush({});
    expect((await pendiente).ok).toBe(true);
  });

  it('la certificación lleva el idioma en la dirección', async () => {
    const pendiente = adaptador.marcaVerificado('p1', true, 'pt');
    const peticion = http.expectOne((r) => r.url.includes('/api/admin/catalog/products/p1?lang=pt'));

    expect(peticion.request.body).toEqual({ verified: true });
    peticion.flush({});
    await pendiente;
  });

  /**
   * El lote llega con dos nombres para lo mismo: `succeeded` al cambiar de estado y `deleted` al
   * borrar. Traducirlo aquí evita que ese detalle del backend suba al dominio.
   */
  it('unifica el recuento del lote venga con el nombre que venga', async () => {
    const cambio = adaptador.cambiaEstados(['p1'], 'ACTIVE');
    http
      .expectOne((r) => r.url.endsWith('/api/admin/catalog/products/bulk-status'))
      .flush({ succeeded: 3, failed: 1, errors: ['x'] });
    expect((await cambio).ok && (await cambio)).toMatchObject({
      valor: { correctos: 3, fallidos: 1, errores: ['x'] },
    });

    const borrado = adaptador.eliminaEnLote(['p1']);
    http
      .expectOne((r) => r.url.endsWith('/api/admin/catalog/products/bulk-delete'))
      .flush({ deleted: 2, failed: 0 });
    expect((await borrado).ok && (await borrado)).toMatchObject({
      valor: { correctos: 2, fallidos: 0, errores: [] },
    });
  });

  /** La bolsa que se deja vacía no se manda: así se toca el envío sin pisar el arancel. */
  it('la subvención solo manda las bolsas que se han fijado', async () => {
    const pendiente = adaptador.fijaSubvencion({ envioCny: 2, productoIds: ['p1'] });
    const peticion = http.expectOne((r) => r.url.endsWith('/api/admin/catalog/products/subsidy'));

    expect(peticion.request.body).toEqual({ shippingUserCny: 2, productIds: ['p1'] });
    peticion.flush({ updated: 4 });
    expect(await pendiente).toEqual({ ok: true, valor: 4 });
  });

  it('los anuncios fallidos se traducen al vocabulario del dominio', async () => {
    const pendiente = adaptador.fallidos();
    http.expectOne((r) => r.url.endsWith('/api/admin/catalog/bus/anuncios-fallidos')).flush([
      {
        id: 'p1',
        externalId: '979',
        slug: 'auricular',
        title: null,
        intentos: 3,
        error: 'timeout',
        actualizadoEn: '2026-09-01',
      },
    ]);

    const resultado = await pendiente;

    expect(resultado.ok && resultado.valor[0].idExterno).toBe('979');
  });

  it('el lote de compresión lleva el límite en la dirección', async () => {
    const pendiente = adaptador.encolaLote(500);
    const peticion = http.expectOne((r) =>
      r.url.includes('/api/admin/catalog/imagenes/comprimir-historico?limite=500'),
    );

    peticion.flush({ pendientes: 70000, enCola: 500 });
    expect(await pendiente).toEqual({ ok: true, valor: { pendientes: 70000, enCola: 500 } });
  });
});
