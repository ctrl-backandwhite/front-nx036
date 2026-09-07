import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { provideRouter } from '@angular/router';
import userEvent from '@testing-library/user-event';
import { App } from './app';
import { PreferenciasService } from '@core/preferences/preferencias';
import { proveeNucleo } from './composition/nucleo.providers';
import { proveeAtribucionDeReferido } from '@features/affiliate/affiliate.providers';
import { proveeAuth } from '@features/auth/auth.providers';
import { CARRITO_GUARDADO_PORT, CARRITO_REMOTO_PORT } from '@features/cart/domain/port/carrito.port';
import { COTIZACION_DE_CARRITO_PORT } from '@features/cart/domain/port/cotizacion-de-carrito.port';
import { CarritoStore } from '@features/cart/application/state/carrito.store';
import { SincronizadorDelCarrito } from '@features/cart/application/state/sincronizador-del-carrito';
import { ApartaParaMasTarde } from '@features/cart/application/use-case/aparta-para-mas-tarde.use-case';
import { CambiaLaCantidad } from '@features/cart/application/use-case/cambia-la-cantidad.use-case';
import { CotizaElCarrito } from '@features/cart/application/use-case/cotiza-el-carrito.use-case';
import { DevuelveAlCarrito } from '@features/cart/application/use-case/devuelve-al-carrito.use-case';
import { EliminaLoGuardado } from '@features/cart/application/use-case/elimina-lo-guardado.use-case';
import { QuitaDelCarrito } from '@features/cart/application/use-case/quita-del-carrito.use-case';
import { VaciaElCarrito } from '@features/cart/application/use-case/vacia-el-carrito.use-case';
import { LineaDeCarrito } from '@features/cart/domain/model/linea-de-carrito';
import { exito } from '@shared/result/result';
import { ConsentimientoDeCookiesStore } from '@core/cookies/consentimiento-de-cookies.store';
import { ManejadorErrores } from '@core/error/manejador-errores';

/** Un doble de los puertos de la cesta que no habla con nadie: aquí se prueba el armazón, no la cesta. */
const CESTA_QUE_CALLA = {
  consulta: async () => exito<readonly LineaDeCarrito[]>([]),
  guarda: async () => exito<readonly LineaDeCarrito[]>([]),
  quita: async () => exito<readonly LineaDeCarrito[]>([]),
  fusiona: async () => exito<readonly LineaDeCarrito[]>([]),
  vacia: async () => exito<readonly LineaDeCarrito[]>([]),
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // El armazón monta la captura de referido, que registra de quién viene la visita en cualquier
      // página. Necesita su puerto igual que en la aplicación de verdad.
      providers: [
        provideRouter([]),
        proveeNucleo(),
        proveeAuth(),
        proveeAtribucionDeReferido(),
        // Lo que pide el CAJÓN DE LA CESTA. Se listan uno a uno en vez de llamar a `proveeCarrito()`
        // para no arrastrar aquí los adaptadores contra el backend: lo que se comprueba es que el
        // armazón lo monta, no cómo se cotiza una cesta.
        { provide: CARRITO_REMOTO_PORT, useValue: CESTA_QUE_CALLA },
        { provide: CARRITO_GUARDADO_PORT, useValue: CESTA_QUE_CALLA },
        {
          provide: COTIZACION_DE_CARRITO_PORT,
          useValue: { cotiza: async () => exito({ lineas: [], subtotalFormateado: '0,00 €' }) },
        },
        SincronizadorDelCarrito,
        CambiaLaCantidad,
        QuitaDelCarrito,
        VaciaElCarrito,
        ApartaParaMasTarde,
        DevuelveAlCarrito,
        EliminaLoGuardado,
        CotizaElCarrito,
      ],
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

  /**
   * El AVISO DE COOKIES tiene que salir sin haber decidido nada, y en cualquier pantalla.
   *
   * <p>Esta prueba es la que faltaba. El componente estaba escrito y probado por su cuenta, pero no lo
   * montaba nadie: la web se servía sin ninguna forma de aceptar ni de rechazar, que es incumplir el
   * RGPD en producción. Ninguna prueba lo denunciaba porque todas montaban el componente a mano.
   */
  it('pinta el aviso de cookies mientras no se haya decidido', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const aviso = fixture.nativeElement.querySelector('nx-consentimiento-de-cookies');
    expect(aviso).not.toBeNull();
    expect(aviso.textContent).toContain('cookies');
  });

  /** Y al aceptar desaparece: el aviso que no se va al decidir se lee como que no se guardó nada. */
  it('al aceptar todo se da por decidido y retira el aviso', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    // El primero de la franja es «aceptar todo», por orden de plantilla.
    const botones: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('nx-consentimiento-de-cookies button'),
    );
    await userEvent.click(botones[0]);
    fixture.detectChanges();

    expect(TestBed.inject(ConsentimientoDeCookiesStore).decidido()).toBe(true);
    expect(
      fixture.nativeElement.querySelector('nx-consentimiento-de-cookies').textContent.trim(),
    ).toBe('');
  });

  /**
   * El CAJÓN DE LA CESTA vive en el armazón porque lo abren los dos marcos —el del escaparate y el del
   * panel— y su estado es de raíz. Sin él montado, el icono de la cesta se limitaba a navegar.
   */
  it('abre el cajón de la cesta cuando lo pide el almacén', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('nx-cajon-del-carrito [role="dialog"]')).toBeNull();

    TestBed.inject(CarritoStore).abreCajon();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('nx-cajon-del-carrito [role="dialog"]'),
    ).not.toBeNull();
  });

  /**
   * La pantalla de error, montada.
   *
   * <p>El manejador propio ya recogía cualquier excepción no atendida y la publicaba, pero NADIE pintaba
   * ese estado: un fallo al renderizar dejaba exactamente lo mismo que sin manejador —la página en
   * blanco— con el agravante de que el código parecía cubierto. Se comprueba montándola desde el
   * manejador, que es como llega en la aplicación de verdad.
   */
  it('cuando algo revienta, sustituye la página por una salida en vez de dejarla en blanco', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    /* Antes de que falle nada no se pinta: es una pantalla de emergencia, no un marco permanente. */
    expect(fixture.nativeElement.querySelector('nx-pantalla-error')?.textContent ?? '').toBe('');

    TestBed.inject(ManejadorErrores).handleError(new Error('se rompió al pintar'));
    fixture.detectChanges();

    const emergencia = fixture.nativeElement.querySelector('nx-pantalla-error') as HTMLElement;
    /* Y lleva la salida: sin un botón para reintentar o volver al inicio, la única forma de salir de un
     * fallo es cerrar la pestaña. */
    expect(emergencia.querySelector('button')).not.toBeNull();
    expect(emergencia.querySelector('a[href="/"]')).not.toBeNull();
    /* Con el detalle técnico, plegado: es lo que hace falta para diagnosticarlo sin asustar a quien
     * solo quería comprar. */
    expect(emergencia.textContent).toContain('se rompió al pintar');
  });

  it('al olvidar el fallo, la pantalla de emergencia se retira', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const manejador = TestBed.inject(ManejadorErrores);

    manejador.handleError(new Error('x'));
    fixture.detectChanges();
    manejador.olvida();
    fixture.detectChanges();

    /* Sin esto, la pantalla se quedaría fija aunque la aplicación se recupere. */
    expect(fixture.nativeElement.querySelector('nx-pantalla-error')?.textContent ?? '').toBe('');
  });
});
