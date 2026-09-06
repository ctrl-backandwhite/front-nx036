import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { PreferenciasService } from '@core/preferences/preferencias';
import { proveeNucleo } from './composition/nucleo.providers';
import { proveeAtribucionDeReferido } from '@features/affiliate/affiliate.providers';
import { proveeAuth } from '@features/auth/auth.providers';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // El armazón monta la captura de referido, que registra de quién viene la visita en cualquier
      // página. Necesita su puerto igual que en la aplicación de verdad.
      providers: [provideRouter([]), proveeNucleo(), proveeAuth(), proveeAtribucionDeReferido()],
    }).compileComponents();
  });

  it('coloca la salida del enrutador, que es todo lo que tiene que pintar', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });

  /**
   * El idioma y el tema se escriben en el elemento raíz y no en un componente porque de ahí cuelgan
   * cosas que no pasan por Angular: `data-theme` es lo que lee daisyUI para repintar la paleta entera,
   * y `lang` lo usan el lector de pantalla y el corte de palabras del navegador.
   */
  it('mantiene el idioma y el tema del documento en sintonía con las preferencias', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const documento = TestBed.inject(DOCUMENT);
    const preferencias = TestBed.inject(PreferenciasService);

    preferencias.cambiaIdioma('fr');
    preferencias.cambiaTema('nx036-pastel-dark');
    fixture.detectChanges();

    expect(documento.documentElement.lang).toBe('fr');
    expect(documento.documentElement.getAttribute('data-theme')).toBe('nx036-pastel-dark');
  });

  it('descarta una preferencia manipulada en vez de escribirla en el documento', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const documento = TestBed.inject(DOCUMENT);
    const preferencias = TestBed.inject(PreferenciasService);

    // Una cookie la escribe el cliente: puede llegar con cualquier cosa dentro.
    preferencias.cambiaTema('<script>alert(1)</script>');
    fixture.detectChanges();

    expect(documento.documentElement.getAttribute('data-theme')).toBe('nx036-pastel');
  });
});
