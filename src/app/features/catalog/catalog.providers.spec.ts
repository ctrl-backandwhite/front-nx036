import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, expect, it } from 'vitest';
import { APP_CONFIG } from '@core/config/app-config';
import { proveeCatalogo } from './catalog.providers';
import { CATALOGO_PORT, PORTADA_PORT, TAXONOMIA_PORT } from './domain/port/catalogo.port';
import { FAVORITOS_PORT } from './domain/port/favoritos.port';
import { HISTORIAL_PORT } from './domain/port/historial.port';
import { RESENAS_PORT } from './domain/port/resenas.port';
import { PROMOCIONES_PORT } from './domain/port/promociones.port';
import { ANALITICA_DE_PRODUCTO_PORT } from './domain/port/analitica-de-producto.port';
import { EDICION_DE_FICHA_PORT } from './domain/port/edicion-de-ficha.port';
import { CESTA_PORT } from './domain/port/cesta.port';
import { GUIA_DE_BIENVENIDA_PORT } from './domain/port/guia-de-bienvenida.port';

/**
 * La raíz de composición del contexto: el único sitio donde aparece una clase de infraestructura.
 *
 * <p>Si un puerto se queda sin atar, la pantalla que lo pide revienta al abrirse y no antes: por eso se
 * comprueban TODOS de una vez, aquí, y no cuando alguien tropieza con ello en producción.
 */
describe('proveeCatalogo', () => {
  it('ata cada puerto con su adaptador', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBase: '', produccion: false } },
        proveeCatalogo(),
      ],
    });

    for (const puerto of [
      CATALOGO_PORT,
      TAXONOMIA_PORT,
      PORTADA_PORT,
      FAVORITOS_PORT,
      HISTORIAL_PORT,
      RESENAS_PORT,
      PROMOCIONES_PORT,
      ANALITICA_DE_PRODUCTO_PORT,
      EDICION_DE_FICHA_PORT,
      CESTA_PORT,
      GUIA_DE_BIENVENIDA_PORT,
    ]) {
      expect(TestBed.inject(puerto), `sin adaptador: ${puerto}`).toBeTruthy();
    }
  });

  /** Tres puertos, un solo adaptador: lo que importa es que quien los usa vea contratos pequeños. */
  it('el catálogo, la taxonomía y la portada comparten adaptador', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBase: '', produccion: false } },
        proveeCatalogo(),
      ],
    });
    expect(TestBed.inject(CATALOGO_PORT)).toBe(TestBed.inject(TAXONOMIA_PORT));
    expect(TestBed.inject(CATALOGO_PORT)).toBe(TestBed.inject(PORTADA_PORT));
  });
});
