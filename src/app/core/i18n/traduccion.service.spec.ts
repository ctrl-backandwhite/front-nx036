import { TestBed } from '@angular/core/testing';
import { PreferenciasService } from '@core/preferences/preferencias';
import { TraduccionService, buscaTexto, sustituyeMarcadores } from './traduccion.service';

/**
 * Se prueba contra los diccionarios REALES y no contra unos de mentira: el sistema de pruebas de Angular
 * no admite `vi.mock` sobre módulos propios, y además así queda comprobado de paso que el `import()`
 * diferido resuelve de verdad —que es la parte que puede romperse al mover un fichero de sitio—.
 *
 * <p>Lo que no se puede provocar con los diccionarios reales es que una clave falte en un idioma y esté
 * en inglés: los ocho tienen exactamente las mismas 2.884 claves. Ese caso se cubre sobre la función
 * pura `buscaTexto`, que es donde vive la cadena de respaldo.
 */
describe('buscaTexto — la cadena de respaldo', () => {
  it('devuelve el texto del idioma activo cuando la clave está', () => {
    expect(
      buscaTexto({ 'cart.empty': 'Carrito vacío' }, { 'cart.empty': 'Empty cart' }, 'cart.empty'),
    ).toBe('Carrito vacío');
  });

  it('cae al inglés cuando la clave falta en el idioma activo', () => {
    expect(buscaTexto({}, { 'cart.empty': 'Empty cart' }, 'cart.empty')).toBe('Empty cart');
  });

  it('devuelve la clave misma cuando no está en ningún diccionario', () => {
    expect(buscaTexto({}, {}, 'cart.empty')).toBe('cart.empty');
  });

  /** Una traducción vacía es un texto válido: no puede confundirse con «no está» y disparar el respaldo. */
  it('respeta una traducción vacía en vez de tomarla por ausente', () => {
    expect(buscaTexto({ 'aviso.ninguno': '' }, { 'aviso.ninguno': 'None' }, 'aviso.ninguno')).toBe(
      '',
    );
  });
});

describe('sustituyeMarcadores', () => {
  it('sustituye todos los marcadores, incluidos los repetidos', () => {
    expect(sustituyeMarcadores('{n} de {n} en {v}', { n: 3, v: 'es' })).toBe('3 de 3 en es');
  });

  it('deja intacto el marcador para el que no se pasa valor', () => {
    expect(sustituyeMarcadores('Hola {nombre}', {})).toBe('Hola {nombre}');
  });
});

describe('TraduccionService', () => {
  let servicio: TraduccionService;
  let preferencias: PreferenciasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    preferencias = TestBed.inject(PreferenciasService);
    servicio = TestBed.inject(TraduccionService);
  });

  it('traduce en el idioma activo', () => {
    preferencias.cambiaIdioma('es');

    expect(servicio.t('quickview.close')).toBe('Cerrar');
  });

  it('cae al inglés cuando el idioma activo no tiene diccionario', () => {
    // `Locale` es texto libre a propósito —el contenido de producto se traduce en cualquier idioma—, así
    // que hay códigos sin diccionario de interfaz. No es un error: se quedan en inglés.
    preferencias.cambiaIdioma('ja');
    TestBed.tick();

    expect(servicio.idioma()).toBe('ja');
    expect(servicio.t('quickview.close')).toBe('Close');
  });

  it('devuelve la clave misma cuando no está en ningún diccionario', () => {
    preferencias.cambiaIdioma('es');

    expect(servicio.t('no.existe.en.ningun.sitio')).toBe('no.existe.en.ningun.sitio');
  });

  it('sustituye los marcadores con tCon', () => {
    preferencias.cambiaIdioma('es');

    expect(servicio.tCon('admin.legal.published', { v: '3.1', n: 42 })).toBe(
      'Publicado como 3.1. Aviso enviado a 42 cuentas.',
    );
  });

  /**
   * El requisito que justifica todo el diseño: `t()` es SÍNCRONA aunque el diccionario venga por la red.
   * Mientras baja se ve el inglés —nunca la clave técnica— y en cuanto llega, escribir el signal invalida
   * el `computed` y la siguiente lectura ya devuelve el idioma pedido, sin que nadie avise a nadie.
   */
  it('responde con el respaldo mientras baja un idioma diferido y con el pedido en cuanto llega', async () => {
    preferencias.cambiaIdioma('pt');
    TestBed.tick(); // el efecto ve el cambio de idioma y arranca la descarga

    expect(servicio.t('quickview.close')).toBe('Close');

    await vi.waitFor(() => {
      expect(servicio.t('quickview.close')).toBe('Fechar');
    });
  });

  /** Un idioma diferido ya descargado no se vuelve a pedir: al regresar responde de inmediato. */
  it('no vuelve a descargar un idioma diferido que ya tiene', async () => {
    preferencias.cambiaIdioma('pt');
    TestBed.tick();
    await vi.waitFor(() => {
      expect(servicio.t('quickview.close')).toBe('Fechar');
    });

    preferencias.cambiaIdioma('es');
    TestBed.tick();
    expect(servicio.t('quickview.close')).toBe('Cerrar');

    preferencias.cambiaIdioma('pt');
    TestBed.tick();
    expect(servicio.t('quickview.close')).toBe('Fechar');
  });

  /** El español viaja en el paquete inicial: no hay espera ni respaldo que valga. */
  it('tiene el español disponible sin esperar a ninguna descarga', () => {
    preferencias.cambiaIdioma('es');

    expect(servicio.t('cart.empty')).toBe('Tu carrito está vacío');
  });

  it('cambiaIdioma delega en las preferencias, que son el único sitio que guarda el idioma', () => {
    servicio.cambiaIdioma('es');

    expect(preferencias.idioma()).toBe('es');
    expect(servicio.idioma()).toBe('es');
  });
});
