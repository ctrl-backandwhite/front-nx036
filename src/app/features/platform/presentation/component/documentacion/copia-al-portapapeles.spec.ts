import { TestBed } from '@angular/core/testing';
import { CopiaAlPortapapeles } from './copia-al-portapapeles';

function crea(): CopiaAlPortapapeles {
  TestBed.configureTestingModule({ providers: [CopiaAlPortapapeles] });
  return TestBed.inject(CopiaAlPortapapeles);
}


/**
 * El idioma activo se fija a español ANTES de montar nada.
 *
 * <p>El servicio de preferencias lo deduce de la cookie y, si no la hay, del idioma del navegador. En
 * el entorno de pruebas ese idioma es el inglés, así que sin fijarlo las comprobaciones dependerían de
 * la máquina donde se ejecutan: la misma prueba pasaría aquí y fallaría en otro equipo.
 */
beforeEach(() => {
  document.cookie = 'nx036-locale=es; Path=/';
});

describe('CopiaAlPortapapeles', () => {
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('copia y anuncia que se ha copiado', async () => {
    const escribe = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: escribe },
      configurable: true,
    });
    const copia = crea();

    copia.copia('curl https://nx036.com');
    await Promise.resolve();

    expect(escribe).toHaveBeenCalledWith('curl https://nx036.com');
    expect(copia.copiado()).toBe(true);
  });

  it('SIN portapapeles no lanza y no anuncia nada', async () => {
    // `navigator.clipboard` no existe fuera de contexto seguro —y el desarrollo local va por http—.
    // Sin el `?.`, el clic lanzaba dentro del manejador y se llevaba por delante la documentación
    // entera.
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    const copia = crea();

    expect(() => copia.copia('algo')).not.toThrow();
    await Promise.resolve();
    expect(copia.copiado()).toBe(false);
  });

  it('si el navegador RECHAZA la escritura, no se dice «Copiado»', async () => {
    // Decir que se copió algo que no está en el portapapeles hace que la gente pegue lo anterior.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('sin permiso')) },
      configurable: true,
    });
    const copia = crea();

    copia.copia('algo');
    await Promise.resolve();
    await Promise.resolve();

    expect(copia.copiado()).toBe(false);
  });
});
