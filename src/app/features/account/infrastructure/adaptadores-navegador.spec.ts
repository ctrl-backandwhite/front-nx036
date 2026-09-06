import { TestBed } from '@angular/core/testing';
import { CARGADOR_DE_STRIPE, StripeTarjetaAdapter } from './stripe-tarjeta.adapter';
import { QrLocalAdapter } from './qr-local.adapter';
import { DescargaNavegadorAdapter } from './descarga-navegador.adapter';

/**
 * Un doble de la pasarela. Reproduce lo justo de su interfaz: crear elementos, montarlos y confirmar.
 *
 * <p>Se usa un doble y no la biblioteca real porque la real BAJA UN SCRIPT del dominio de la pasarela:
 * una prueba unitaria que dependa de la red no es una prueba.
 */
function pasarelaDoble(confirma = vi.fn().mockResolvedValue({}), campo = campoDoble()) {
  return {
    elements: vi.fn().mockReturnValue({ create: vi.fn().mockReturnValue(campo) }),
    confirmCardSetup: confirma,
  };
}

function campoDoble() {
  return { mount: vi.fn(), clear: vi.fn(), destroy: vi.fn() };
}

/** El adaptador está tipado contra la biblioteca real; el doble solo implementa lo que se usa. */
function conCargador(cargador: unknown) {
  TestBed.configureTestingModule({
    providers: [StripeTarjetaAdapter, { provide: CARGADOR_DE_STRIPE, useValue: cargador }],
  });
  return TestBed.inject(StripeTarjetaAdapter);
}

describe('StripeTarjetaAdapter', () => {
  it('monta el campo dentro del hueco que le da la pantalla', async () => {
    const campo = campoDoble();
    const pasarela = pasarelaDoble(undefined, campo);
    const adaptador = conCargador(vi.fn().mockResolvedValue(pasarela));
    const hueco = document.createElement('div');

    const resultado = await adaptador.monta(hueco, 'pk_test');

    expect(resultado.ok).toBe(true);
    expect(campo.mount).toHaveBeenCalledWith(hueco);
  });

  it('sin clave publicable ni se intenta cargar la pasarela', async () => {
    const carga = vi.fn();
    const adaptador = conCargador(carga);

    const resultado = await adaptador.monta(document.createElement('div'), '   ');

    expect(resultado.ok).toBe(false);
    expect(carga).not.toHaveBeenCalled();
  });

  /**
   * Un bloqueador de scripts o una red caída dejan la sección sin campo. Se avisa y no se rompe la
   * pantalla: el resto del perfil sigue siendo utilizable.
   */
  it('si la pasarela no llega, se falla sin lanzar', async () => {
    const adaptador = conCargador(vi.fn().mockResolvedValue(null));

    const resultado = await adaptador.monta(document.createElement('div'), 'pk_test');

    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? null : resultado.error.tipo).toBe('sin-conexion');
  });

  it('si la biblioteca revienta al montar, tampoco se lanza', async () => {
    const adaptador = conCargador(vi.fn().mockRejectedValue(new Error('bloqueado')));

    expect((await adaptador.monta(document.createElement('div'), 'pk_test')).ok).toBe(false);
  });

  /** El perfil monta el campo dos veces; bajar el script en cada montaje añadía medio segundo. */
  it('la pasarela se trae una sola vez por clave', async () => {
    const carga = vi.fn().mockResolvedValue(pasarelaDoble());
    const adaptador = conCargador(carga);

    await adaptador.monta(document.createElement('div'), 'pk_test');
    await adaptador.monta(document.createElement('div'), 'pk_test');
    expect(carga).toHaveBeenCalledTimes(1);

    await adaptador.monta(document.createElement('div'), 'pk_otra');
    expect(carga).toHaveBeenCalledTimes(2);
  });

  it('confirmar el alta manda el titular a la pasarela, no a nuestro backend', async () => {
    const confirma = vi.fn().mockResolvedValue({});
    const campo = campoDoble();
    const adaptador = conCargador(vi.fn().mockResolvedValue(pasarelaDoble(confirma, campo)));

    const montado = await adaptador.monta(document.createElement('div'), 'pk_test');
    const resultado = montado.ok ? await montado.valor.confirmaAlta('seti_1', '  Ana Pérez  ') : null;

    expect(resultado?.ok).toBe(true);
    expect(confirma).toHaveBeenCalledWith('seti_1', {
      payment_method: { card: campo, billing_details: { name: 'Ana Pérez' } },
    });
  });

  /** El mensaje de la pasarela ya viene traducido y dice qué corregir: no se sustituye por uno genérico. */
  it('el rechazo de la pasarela conserva su mensaje', async () => {
    const confirma = vi.fn().mockResolvedValue({ error: { message: 'Tarjeta caducada' } });
    const adaptador = conCargador(vi.fn().mockResolvedValue(pasarelaDoble(confirma)));

    const montado = await adaptador.monta(document.createElement('div'), 'pk_test');
    const resultado = montado.ok ? await montado.valor.confirmaAlta('seti_1', 'Ana') : null;

    expect(resultado?.ok).toBe(false);
    expect(resultado && !resultado.ok ? resultado.error.mensaje : null).toBe('Tarjeta caducada');
  });

  it('si la confirmación revienta, se devuelve un fallo de conexión', async () => {
    const confirma = vi.fn().mockRejectedValue(new Error('red'));
    const adaptador = conCargador(vi.fn().mockResolvedValue(pasarelaDoble(confirma)));

    const montado = await adaptador.monta(document.createElement('div'), 'pk_test');
    const resultado = montado.ok ? await montado.valor.confirmaAlta('seti_1', 'Ana') : null;

    expect(resultado?.ok).toBe(false);
  });

  it('limpiar y destruir se delegan en el campo de la pasarela', async () => {
    const campo = campoDoble();
    const adaptador = conCargador(vi.fn().mockResolvedValue(pasarelaDoble(undefined, campo)));

    const montado = await adaptador.monta(document.createElement('div'), 'pk_test');
    if (montado.ok) {
      montado.valor.limpia();
      montado.valor.destruye();
    }

    expect(campo.clear).toHaveBeenCalled();
    expect(campo.destroy).toHaveBeenCalled();
  });
});

describe('QrLocalAdapter', () => {
  /** Se dibuja EN EL NAVEGADOR: la dirección lleva dentro la semilla del segundo factor. */
  it('devuelve una imagen embebida, sin salir a ningún servicio', async () => {
    const adaptador = new QrLocalAdapter();

    const qr = await adaptador.dibuja('otpauth://totp/NX036?secret=ABC');

    expect(qr).toMatch(/^data:image\//);
  });

  it('si no se puede dibujar, devuelve nulo y el alta sigue por el secreto tecleado', async () => {
    const adaptador = new QrLocalAdapter();

    expect(await adaptador.dibuja('')).toBeNull();
  });
});

describe('DescargaNavegadorAdapter', () => {
  it('entrega el fichero creando un enlace temporal y lo suelta después', () => {
    const crear = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    const soltar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    new DescargaNavegadorAdapter().entrega({ nombre: 'mis-datos.json', contenido: new Blob(['{}']) });

    expect(crear).toHaveBeenCalled();
    expect(clic).toHaveBeenCalled();
    // Cada objeto creado así se queda en memoria hasta que se suelta: dos descargas dejaban dos copias.
    expect(soltar).toHaveBeenCalledWith('blob:x');
    expect(document.querySelector('a[download]')).toBeNull();

    crear.mockRestore();
    soltar.mockRestore();
    clic.mockRestore();
  });
});
