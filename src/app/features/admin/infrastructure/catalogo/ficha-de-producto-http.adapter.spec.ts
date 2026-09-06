import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FichaDeProductoHttpAdapter } from './ficha-de-producto-http.adapter';
import { VariantesHttpAdapter } from './variantes-http.adapter';
import { ValoresDeVariacionHttpAdapter } from './valores-de-variacion-http.adapter';

describe('adaptadores de la ficha de producto', () => {
  let ficha: FichaDeProductoHttpAdapter;
  let variantes: VariantesHttpAdapter;
  let valores: ValoresDeVariacionHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FichaDeProductoHttpAdapter,
        VariantesHttpAdapter,
        ValoresDeVariacionHttpAdapter,
      ],
    });
    ficha = TestBed.inject(FichaDeProductoHttpAdapter);
    variantes = TestBed.inject(VariantesHttpAdapter);
    valores = TestBed.inject(ValoresDeVariacionHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('traduce la ficha entera, con sus tres importes en yuanes separados de lo formateado', async () => {
    const pendiente = ficha.consulta('p1', 'es');
    const peticion = http.expectOne((r) => r.url.endsWith('/api/admin/catalog/products/p1'));

    expect(peticion.request.params.get('lang')).toBe('es');
    peticion.flush({
      id: 'p1',
      slug: 'auricular',
      title: 'Auricular',
      titleZh: '耳机',
      status: 'ACTIVE',
      basePrice: 18.5,
      surchargeCny: 3,
      surchargeFormatted: '0,41 €',
      shippingUserCny: 1,
      dutyUserCny: 0,
      images: [{ id: 'i1', sourceUrl: 'https://o.jpg', position: 0, role: 'GALLERY' }],
      variantOptions: [
        { id: 'e1', nameZh: '颜色', name: 'Color', position: 0, values: [{ id: 'v1', valueZh: '白色', position: 0 }] },
      ],
      priceTiers: [{ minQty: 1, maxQty: 9, unitPrice: 18.5, currency: 'CNY' }],
      translations: { fr: { title: 'Casque' }, de: {} },
      compliance: { manufacturerName: 'Acme', manufacturerComplete: false },
    });

    const resultado = await pendiente;

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      return;
    }
    expect(resultado.valor.yuanes).toEqual({
      recargo: 3,
      subvencionDeEnvio: 1,
      subvencionDeArancel: 0,
    });
    expect(resultado.valor.yuanesFormateados.recargo).toBe('0,41 €');
    expect(resultado.valor.imagenes[0].urlOrigen).toBe('https://o.jpg');
    expect(resultado.valor.ejes[0].valores[0].valorZh).toBe('白色');
    expect(resultado.valor.tramos[0].cantidadMinima).toBe(1);
    // Solo los idiomas con título entran en el mapa: uno vacío no es una traducción.
    expect(resultado.valor.titulosPorIdioma).toEqual({ fr: 'Casque' });
    expect(resultado.valor.fabricante?.completo).toBe(false);
  });

  /** El backend distingue «no lo mando» de «lo mando vacío»: lo indefinido no puede viajar. */
  it('el guardado parcial solo manda lo que se tocó', async () => {
    const pendiente = ficha.actualiza('p1', { titulo: 'Nuevo', yuanes: { recargo: 0 } }, 'es');
    const peticion = http.expectOne((r) => r.url.includes('/api/admin/catalog/products/p1?lang=es'));

    expect(peticion.request.body).toEqual({ title: 'Nuevo', surchargeCny: 0 });
    peticion.flush({});
    await pendiente;
  });

  /** Los tres campos del fabricante van SIEMPRE: la cadena vacía es lo que borra un dato mal metido. */
  it('el fabricante viaja completo aunque esté vacío', async () => {
    const pendiente = ficha.actualiza(
      'p1',
      { fabricante: { nombre: '', direccion: '', correo: '' } },
      'es',
    );
    const peticion = http.expectOne((r) => r.url.includes('/api/admin/catalog/products/p1'));

    expect(peticion.request.body).toEqual({
      manufacturerName: '',
      manufacturerAddress: '',
      manufacturerEmail: '',
    });
    peticion.flush({});
    await pendiente;
  });

  it('el tramo se borra por su cantidad mínima, que es lo que lo identifica', async () => {
    const pendiente = ficha.eliminaTramo('p1', 10);
    const peticion = http.expectOne((r) =>
      r.url.endsWith('/api/admin/catalog/products/p1/price-tiers/10'),
    );

    expect(peticion.request.method).toBe('DELETE');
    peticion.flush({});
    await pendiente;
  });

  it('reordenar la galería manda los identificadores en el orden deseado', async () => {
    const pendiente = ficha.reordena('p1', ['i2', 'i1']);
    const peticion = http.expectOne((r) =>
      r.url.endsWith('/api/admin/catalog/products/p1/images/order'),
    );

    expect(peticion.request.body).toEqual({ imageIds: ['i2', 'i1'] });
    peticion.flush({});
    await pendiente;
  });

  it('las variantes llegan con su precio crudo y sus opciones', async () => {
    const pendiente = variantes.lista('p1');
    http.expectOne((r) => r.url.endsWith('/api/admin/catalog/products/p1/variants')).flush([
      { id: 'v1', sku: 'HX-1', price: 18.5, stock: 3, options: { Color: 'Rojo' } },
    ]);

    const resultado = await pendiente;

    expect(resultado.ok && resultado.valor[0]).toEqual({
      id: 'v1',
      sku: 'HX-1',
      titulo: undefined,
      precio: 18.5,
      existencias: 3,
      urlImagen: undefined,
      opciones: { Color: 'Rojo' },
      activa: true,
    });
  });

  it('el precio de la variante va por su propia ruta, sin tocar el resto', async () => {
    const pendiente = variantes.actualizaPrecio('v1', 21);
    const peticion = http.expectOne((r) => r.url.endsWith('/api/admin/catalog/variants/v1/price'));

    expect(peticion.request.body).toEqual({ price: 21 });
    peticion.flush({});
    await pendiente;
  });

  it('renombrar un valor cambia solo su etiqueta visible', async () => {
    const pendiente = valores.renombra('vv1', 'Blanco roto');
    const peticion = http.expectOne((r) =>
      r.url.endsWith('/api/admin/catalog/variant-values/vv1/label'),
    );

    expect(peticion.request.body).toEqual({ value: 'Blanco roto' });
    peticion.flush({});
    await pendiente;
  });

  it('fijar la foto de un color usa la ruta de imagen del valor', async () => {
    const pendiente = valores.fijaImagen('vv1', 'https://a.jpg');
    const peticion = http.expectOne((r) =>
      r.url.endsWith('/api/admin/catalog/variant-values/vv1/image'),
    );

    expect(peticion.request.body).toEqual({ imageUrl: 'https://a.jpg' });
    peticion.flush({});
    await pendiente;
  });
});
