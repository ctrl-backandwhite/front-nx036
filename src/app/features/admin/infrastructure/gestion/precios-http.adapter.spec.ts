import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AmbitosDeReglaHttpAdapter, PreciosHttpAdapter } from './precios-http.adapter';

describe('PreciosHttpAdapter', () => {
  let adaptador: PreciosHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PreciosHttpAdapter],
    });
    adaptador = TestBed.inject(PreciosHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('traduce la regla al vocabulario del dominio', async () => {
    const promesa = adaptador.reglas();

    http.expectOne('/api/admin/pricing/rules').flush([
      {
        id: 'r1', scope: 'CATEGORY', scopeId: 'c1', scopeName: 'Moda', marginType: 'FIXED',
        marginValue: 5, minCostUsd: 0, maxCostUsd: 50, active: true, countryCode: 'ES',
      },
    ]);

    const resultado = await promesa;
    if (resultado.ok) {
      const regla = resultado.valor[0];
      expect(regla.ambito).toBe('CATEGORY');
      expect(regla.nombreDelAmbito).toBe('Moda');
      expect(regla.tipo).toBe('FIXED');
      expect(regla.pais).toBe('ES');
    }
  });

  /**
   * Un ámbito desconocido se trata como global, que es lo más conservador de interpretar: nunca se
   * pinta una regla como si afectara a un producto concreto cuando no se sabe a cuál.
   */
  it('un ámbito desconocido se degrada a GLOBAL', async () => {
    const promesa = adaptador.reglas();

    http.expectOne('/api/admin/pricing/rules')
      .flush([{ id: 'r1', scope: 'LO_QUE_SEA', marginType: 'X', marginValue: '30', active: true }]);

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor[0].ambito).toBe('GLOBAL');
      // Un tipo de margen desconocido se lee como porcentaje, que es el habitual.
      expect(resultado.valor[0].tipo).toBe('PERCENTAGE');
      expect(resultado.valor[0].valor).toBe(30);
    }
  });

  it('crea por POST y actualiza por PUT sobre la misma forma de cuerpo', async () => {
    const creada = adaptador.crea({ ambito: 'GLOBAL', tipo: 'PERCENTAGE', valor: 30, activa: true });
    const post = http.expectOne('/api/admin/pricing/rules');
    expect(post.request.method).toBe('POST');
    expect(post.request.body.scope).toBe('GLOBAL');
    post.flush({});
    await creada;

    const actualizada = adaptador.actualiza('r1', { ambito: 'GLOBAL', valor: 45 });
    const put = http.expectOne('/api/admin/pricing/rules/r1');
    expect(put.request.method).toBe('PUT');
    put.flush({});
    await actualizada;
  });

  it('el ajuste de pedido mínimo cae a valores neutros cuando el backend no manda nada', async () => {
    const promesa = adaptador.ajusteDeMoq();

    http.expectOne('/api/admin/pricing/moq-rule').flush({});

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor).toEqual({ activo: false, factorPorcentaje: 100 });
    }
  });
});

describe('AmbitosDeReglaHttpAdapter', () => {
  let adaptador: AmbitosDeReglaHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AmbitosDeReglaHttpAdapter],
    });
    adaptador = TestBed.inject(AmbitosDeReglaHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Lo que necesita la pantalla es un desplegable, no el modelo de producto ni el de categoría. */
  it('reduce cada entidad a un par identificador-nombre', async () => {
    const categorias = adaptador.categorias();
    http.expectOne((p) => p.url === '/api/catalog/categories')
      .flush([{ id: 'c1', name: 'Moda' }, { id: 'c2', slug: 'sin-nombre' }]);
    const resultado = await categorias;

    if (resultado.ok) {
      expect(resultado.valor).toEqual([
        { id: 'c1', nombre: 'Moda' },
        // Sin nombre traducido se usa el identificador legible que haya.
        { id: 'c2', nombre: 'sin-nombre' },
      ]);
    }
  });

  it('los productos llegan paginados y se aplanan', async () => {
    const promesa = adaptador.productos();

    const peticion = http.expectOne((p) => p.url === '/api/catalog/products');
    expect(peticion.request.params.get('size')).toBe('200');
    peticion.flush({ items: [{ id: 'p1', title: 'Gorro' }] });

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor).toEqual([{ id: 'p1', nombre: 'Gorro' }]);
    }
  });

  /** El recuento va en el rótulo: elegir un grupo vacío por error es el fallo típico de esta pantalla. */
  it('el grupo enseña cuántos productos tiene', async () => {
    const promesa = adaptador.grupos();

    http.expectOne('/api/admin/product-groups').flush([{ id: 'g1', name: 'Invierno', memberCount: 12 }]);

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor[0].nombre).toBe('Invierno (12)');
    }
  });
});
