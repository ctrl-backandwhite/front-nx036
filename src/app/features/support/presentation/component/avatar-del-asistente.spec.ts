import { Component, signal } from '@angular/core';
import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { exito } from '@shared/result/result';
import { LineaDeCesta, SugerenciaParaLaCesta } from '../../domain/model/cesta';
import { SUGERENCIAS_DE_CESTA_PORT } from '../../domain/port/asistente.port';
import { VOZ_PORT } from '../../domain/port/voz.port';
import { AvatarStore } from '../../application/state/avatar.store';
import { SugiereParaLaCesta } from '../../application/use-case/sugiere-para-la-cesta.use-case';
import { DiceEnAlto } from '../../application/use-case/dice-en-alto.use-case';
import { Desplazandose } from '../desplazandose';
import { AvatarDelAsistente } from './avatar-del-asistente';

/**
 * El asistente que acompaña la navegación.
 *
 * <p>Habla en momentos concretos y NUNCA por hablar, que es justo lo difícil de mantener: cada regla de
 * «cuándo sí» tiene su «cuándo no», y perder uno de los dos convierte al asistente en el elemento más
 * molesto de la tienda. Lo que se fija aquí:
 *
 * <ul>
 *   <li>que la cesta de una sesión ANTERIOR no cuenta como novedad —si contara, el globo saltaría solo
 *       al abrir la web, sin que nadie haya hecho nada—;
 *   <li>que cualquier cambio de la cesta cuenta, no solo añadir: al quitar algo cambian la partida
 *       arancelaria compartida y el hueco del paquete, así que seguir enseñando lo de antes es hablar de
 *       una cesta que ya no existe;
 *   <li>que con la cesta vacía se calla y OLVIDA lo que tenía;
 *   <li>que al ocultarlo se dice dónde volver a encontrarlo. La opción está en el menú de la cuenta desde
 *       el principio, pero nadie puede adivinarlo, y sin el aviso ocultarlo parece definitivo;
 *   <li>que la voz solo habla si está encendida a mano.
 * </ul>
 */
/**
 * Lo que la cesta trae YA PUESTO al montar. Es un dato del banco de pruebas y no una entrada del
 * anfitrión a propósito: la diferencia entre «ya estaba» y «acaba de cambiar» se decide en el PRIMER
 * pintado, así que tiene que estar ahí antes de que el componente exista.
 */
let lineasAlMontar: readonly LineaDeCesta[] = [];

@Component({
  selector: 'nx-anfitrion',
  imports: [AvatarDelAsistente],
  template: `<nx-avatar-del-asistente [lineasDeLaCesta]="lineas()" [enElPago]="enElPago()" />`,
})
class Anfitrion {
  readonly lineas = signal<readonly LineaDeCesta[]>(lineasAlMontar);
  readonly enElPago = signal(false);
}

const SUGERENCIA: SugerenciaParaLaCesta = {
  id: 'p9',
  slug: 'calcetines',
  titulo: 'Calcetines de lana',
  motivo: 'DUTY',
};

interface Opciones {
  sugerencias?: readonly SugerenciaParaLaCesta[];
  hayVoz?: boolean;
  /** La cesta que ya venía puesta al abrir la página. */
  cestaAlMontar?: readonly LineaDeCesta[];
}

async function monta(opciones: Opciones = {}) {
  lineasAlMontar = opciones.cestaAlMontar ?? [];
  const dicho: { texto: unknown; forzado: boolean }[] = [];
  const voz = {
    disponible: () => opciones.hayVoz ?? true,
    habla: vi.fn((texto: string, _idioma: string) => {
      dicho.push({ texto, forzado: false });
    }),
    calla: vi.fn(),
  };
  const consulta = vi.fn(async () => exito({ items: opciones.sugerencias ?? [SUGERENCIA] }));

  const vista = await render(Anfitrion, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      AvatarStore,
      SugiereParaLaCesta,
      DiceEnAlto,
      Desplazandose,
      AvisosStore,
      { provide: ALMACEN_LOCAL, useValue: new AlmacenMemoriaAdapter() },
      { provide: SUGERENCIAS_DE_CESTA_PORT, useValue: { consulta } },
      { provide: VOZ_PORT, useValue: voz },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const anfitrion = vista.fixture.componentInstance;
  const avatar = vista.fixture.debugElement.injector.get(AvatarStore);
  const sugiere = vista.fixture.debugElement.injector.get(SugiereParaLaCesta);
  const avisos = vista.fixture.debugElement.injector.get(AvisosStore);

  const asienta = async () => {
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  /** El avatar por dentro: sus manejadores de arrastre son `protected`, que es correcto. */
  const avatarComponente = () =>
    vista.fixture.debugElement.children[0].componentInstance as unknown as Record<
      string,
      (...args: never[]) => void
    >;

  return { vista, anfitrion, avatar, sugiere, avisos, consulta, voz, asienta, avatarComponente };
}

const LINEA = (cantidad: number): LineaDeCesta => ({ idProducto: 'p1', cantidad });

describe('AvatarDelAsistente', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  describe('cuándo habla', () => {
    /** Si la cesta guardada contara como novedad, el globo saltaría solo al abrir la web. */
    it('la cesta que ya venía puesta NO es una novedad', async () => {
      const { consulta, asienta } = await monta({ cestaAlMontar: [LINEA(2)] });

      await asienta();

      expect(consulta).not.toHaveBeenCalled();
    });

    it('añadir algo sí lo es', async () => {
      const { anfitrion, consulta, asienta } = await monta({ cestaAlMontar: [LINEA(2)] });
      await asienta();

      anfitrion.lineas.set([LINEA(3)]);
      await asienta();

      expect(consulta).toHaveBeenCalled();
    });

    /**
     * Quitar también cuenta. Lo que conviene comprar depende de lo que YA se lleva: al quitar algo
     * cambian la partida arancelaria compartida y el hueco del paquete.
     */
    it('quitar algo TAMBIÉN lo es', async () => {
      const { anfitrion, consulta, asienta } = await monta({ cestaAlMontar: [LINEA(3)] });
      await asienta();

      anfitrion.lineas.set([LINEA(1)]);
      await asienta();

      expect(consulta).toHaveBeenCalled();
    });

    it('con la cesta vacía se calla y olvida lo que tenía', async () => {
      const { anfitrion, sugiere, asienta } = await monta({ cestaAlMontar: [LINEA(1)] });
      anfitrion.lineas.set([LINEA(2)]);
      await asienta();
      expect(sugiere.items().length).toBeGreaterThan(0);

      anfitrion.lineas.set([]);
      await asienta();

      expect(sugiere.items()).toEqual([]);
    });

    /** En el pago sí se pregunta de entrada: todavía se puede añadir algo al mismo paquete. */
    it('en el pago pregunta sin esperar a que cambie nada', async () => {
      const { anfitrion, consulta, asienta } = await monta({ cestaAlMontar: [LINEA(1)] });

      anfitrion.enElPago.set(true);
      await asienta();

      expect(consulta).toHaveBeenCalled();
    });

    it('oculto no consulta nada aunque cambie la cesta', async () => {
      const { anfitrion, avatar, consulta, asienta } = await monta({ cestaAlMontar: [LINEA(1)] });
      avatar.cambiaEstado('oculto');
      await asienta();

      anfitrion.lineas.set([LINEA(2)]);
      await asienta();

      expect(consulta).not.toHaveBeenCalled();
    });
  });

  describe('apartarse sin desaparecer', () => {
    it('al ocultarlo se dice DÓNDE volver a encontrarlo', async () => {
      const { avisos, asienta } = await monta();

      await userEvent.click(screen.getByRole('button', { name: 'Ocultar el asistente' }));
      await asienta();

      /* Sin este aviso, ocultarlo parece definitivo: la opción para recuperarlo está en el menú de la
       * cuenta desde el principio, pero nadie puede adivinarlo. */
      expect(avisos.avisos()[0].mensaje).toContain('menú de tu cuenta');
    });

    it('encogido sigue a mano, y al pulsarlo despierta', async () => {
      const { avatar, asienta } = await monta();

      await userEvent.click(screen.getByRole('button', { name: 'Minimizar' }));
      await asienta();
      expect(avatar.estado()).toBe('mini');

      /* Encogido no desaparece: el botón sigue ahí y lo dice su etiqueta. */
      expect(screen.getByRole('button', { name: 'Abrir el asistente' })).toBeInTheDocument();
    });
  });

  describe('la voz', () => {
    it('nace apagada: nadie quiere que una tienda le hable sin haberlo pedido', async () => {
      const { voz, asienta } = await monta();
      await asienta();

      expect(voz.habla).not.toHaveBeenCalled();
    });

    it('al encenderla dice una frase de prueba, que es lo que confirma que se oye', async () => {
      const { voz, asienta } = await monta();

      await userEvent.click(screen.getByRole('button', { name: 'Activar la voz' }));
      await asienta();

      /* Encenderla y que no suene nada se lee como que no funciona. */
      expect(voz.habla).toHaveBeenCalled();
    });

    it('al apagarla se calla en el acto', async () => {
      const { voz, asienta } = await monta();
      await userEvent.click(screen.getByRole('button', { name: 'Activar la voz' }));
      await asienta();
      voz.calla.mockClear();

      await userEvent.click(screen.getByRole('button', { name: 'Silenciar' }));
      await asienta();

      expect(voz.calla).toHaveBeenCalled();
    });

    it('sin voz en el navegador no se ofrece el botón', async () => {
      await monta({ hayVoz: false });

      expect(screen.queryByRole('button', { name: 'Activar la voz' })).toBeNull();
    });
  });

  /**
   * El arrastre.
   *
   * <p>Aquí conviven dos gestos en el mismo control: mover el asistente y pulsarlo. Distinguirlos por un
   * UMBRAL es lo que evita que un temblor de dos píxeles cuente como arrastre —y deje el asistente
   * movido en vez de abierto— o que un arrastre corto se lea como una pulsación.
   */
  describe('mover el asistente', () => {
    const gesto = (x: number, y: number) =>
      ({ clientX: x, clientY: y, pointerId: 1, target: document.body }) as unknown as PointerEvent;

    it('un temblor por debajo del umbral cuenta como PULSACIÓN, no como arrastre', async () => {
      const { avatar, avatarComponente, sugiere, asienta } = await monta({
        cestaAlMontar: [LINEA(1)],
      });
      const donde = avatar.posicion();

      avatarComponente()['alPulsar'](gesto(100, 100) as never);
      avatarComponente()['alMover'](gesto(101, 101) as never);
      avatarComponente()['alSoltar']();
      await asienta();

      expect(avatar.posicion()).toEqual(donde);
      /* Al no haber arrastre se trata como pulsación: sin sugerencias guardadas, va a buscarlas. */
      expect(sugiere.items()).toBeDefined();
    });

    it('pasado el umbral SÍ se mueve, y la posición se guarda al soltar', async () => {
      const { avatar, avatarComponente, asienta } = await monta();
      const donde = avatar.posicion();

      avatarComponente()['alPulsar'](gesto(300, 300) as never);
      avatarComponente()['alMover'](gesto(200, 200) as never);
      await asienta();

      expect(avatar.posicion()).not.toEqual(donde);

      avatarComponente()['alSoltar']();
      await asienta();
      /* Se guarda al SOLTAR y no al mover: guardar en cada píxel serían decenas de escrituras. */
      expect(avatar.posicion()).not.toEqual(donde);
    });

    it('mover sin haber pulsado antes no hace nada', async () => {
      const { avatar, avatarComponente, asienta } = await monta();
      const donde = avatar.posicion();

      avatarComponente()['alMover'](gesto(0, 0) as never);
      await asienta();

      expect(avatar.posicion()).toEqual(donde);
    });

    /** Encogido, la pulsación DESPIERTA: es lo que hace que encogerlo no sea esconderlo. */
    it('encogido, una pulsación lo despierta', async () => {
      const { avatar, avatarComponente, asienta } = await monta();
      avatar.cambiaEstado('mini');
      await asienta();

      avatarComponente()['alPulsar'](gesto(100, 100) as never);
      avatarComponente()['alSoltar']();
      await asienta();

      expect(avatar.estado()).toBe('activo');
    });
  });

  it('al despertarlo enseña lo que ya tenía, sin que haya que pulsarlo otra vez', async () => {
    const { avatar, anfitrion, sugiere, asienta } = await monta({ cestaAlMontar: [LINEA(1)] });
    anfitrion.lineas.set([LINEA(2)]);
    await asienta();
    expect(sugiere.items().length).toBeGreaterThan(0);

    avatar.cambiaEstado('mini');
    await asienta();
    avatar.cambiaEstado('activo');
    await asienta();

    /* Si al abrirlo no enseñara lo que encontró, habría que pulsarlo una segunda vez para ver algo que
     * ya estaba calculado. */
    expect(sugiere.items().length).toBeGreaterThan(0);
  });
});
