import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AsistenteHttpAdapter } from './asistente-http.adapter';

describe('AsistenteHttpAdapter', () => {
  let adaptador: AsistenteHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AsistenteHttpAdapter],
    });
    adaptador = TestBed.inject(AsistenteHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('traduce la respuesta del asistente al vocabulario del dominio', async () => {
    const promesa = adaptador.pregunta('calcetines', null, 'es');

    const peticion = http.expectOne('/api/chat');
    expect(peticion.request.body).toEqual({
      message: 'calcetines',
      conversationId: null,
      lang: 'es',
    });
    peticion.flush({
      conversationId: 'c-1',
      reply: 'Mira estos',
      products: [{ slug: 'calcetin', title: 'Calcetín', image: 'i.webp' }],
      degraded: false,
      searchQuery: 'calcetines',
      searchTotal: 12,
    });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.texto).toBe('Mira estos');
      expect(resultado.valor.productos[0]).toEqual({
        slug: 'calcetin',
        titulo: 'Calcetín',
        imagen: 'i.webp',
      });
      expect(resultado.valor.busqueda).toEqual({ consulta: 'calcetines', total: 12 });
    }
  });

  it('sin búsqueda no inventa una vacía', async () => {
    const promesa = adaptador.pregunta('hola', 'c-1', 'es');
    http.expectOne('/api/chat').flush({
      conversationId: 'c-1',
      reply: 'Hola',
      products: [],
      degraded: false,
    });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.busqueda).toBeUndefined();
  });

  it('convierte el rechazo del servidor en un error del dominio, sin lanzar', async () => {
    const promesa = adaptador.pregunta('hola', null, 'es');
    http.expectOne('/api/chat').flush(
      { message: 'Sin cupo.' },
      { status: 429, statusText: 'Too Many Requests' },
    );

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.tipo).toBe('demasiadas-peticiones');
      expect(resultado.error.mensaje).toBe('Sin cupo.');
    }
  });

  it('manda las líneas con el vocabulario del backend y copia los importes YA formateados', async () => {
    const promesa = adaptador.consulta([{ idProducto: 'p1', idVariante: 'v1', cantidad: 2 }], 'es');

    const peticion = http.expectOne('/api/catalog/cart-suggestions');
    expect(peticion.request.body).toEqual({
      items: [{ productId: 'p1', variantId: 'v1', quantity: 2 }],
      lang: 'es',
    });
    peticion.flush({
      items: [
        {
          id: 'p9',
          slug: 'gorra',
          title: 'Gorra',
          motivo: 'SHIPPING',
          shippingExtraFormatted: '0,80 €',
          shippingAloneFormatted: '4,20 €',
        },
      ],
      gramosLibres: 340,
      otroBultoFormatted: '3,00 €',
    });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.items[0].envioExtra).toBe('0,80 €');
      expect(resultado.valor.hueco).toEqual({ gramos: 340, otroBulto: '3,00 €' });
    }
  });

  it('sin gramos libres no hay hueco que enseñar', async () => {
    const promesa = adaptador.consulta([{ idProducto: 'p1', cantidad: 1 }], 'es');
    http.expectOne('/api/catalog/cart-suggestions').flush({ items: [], gramosLibres: 0 });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.hueco).toBeNull();
  });
});
