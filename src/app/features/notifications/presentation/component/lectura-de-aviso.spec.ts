import { Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Aviso, Carpeta } from '../../domain/model/aviso';
import { LecturaDeAviso } from './lectura-de-aviso';

/**
 * El panel donde se lee un aviso y, si trae correo, se contesta.
 *
 * <p>Lo que hay que dejar fijado es el comportamiento AL CAMBIAR DE AVISO: el asunto se rehace y el
 * cuerpo se VACÍA. Arrastrar lo que se estaba escribiendo para el aviso anterior es la forma más rápida
 * de contestarle a quien no era — y con el correo del nuevo delante, sin que nada avise.
 *
 * <p>Y la otra: no todo aviso se contesta. Solo lo de soporte y lo que trae un correo tiene gestión;
 * enseñar el formulario de respuesta en un «tu pedido va en camino» invita a escribirle a nadie.
 */
@Component({
  selector: 'nx-anfitrion',
  imports: [LecturaDeAviso],
  template: `
    <nx-lectura-de-aviso
      [aviso]="aviso()"
      [carpeta]="carpeta()"
      [esDeLaCasa]="true"
      (responde)="respuestas.push($event)"
      (mueve)="movimientos.push($event)"
      (cambiaEstado)="estados.push($event)"
    />
  `,
})
class Anfitrion {
  readonly aviso = signal<Aviso | null>(null);
  readonly carpeta = signal<Carpeta>('inbox');
  readonly respuestas: { email: string; asunto: string; mensaje: string }[] = [];
  readonly movimientos: string[] = [];
  readonly estados: string[] = [];
}

function aviso(parcial: Partial<Aviso> = {}): Aviso {
  return {
    id: 'a1',
    tipoDeSuceso: 'CONTACT',
    titulo: 'Consulta sobre un pedido',
    cuerpo: '¿Cuándo llega?',
    canal: 'INBOX',
    creadoEl: '2026-09-01T10:00:00Z',
    datos: { email: 'cliente@ejemplo.com', subject: 'Mi pedido' },
    ...parcial,
  };
}

async function monta() {
  const vista = await render(Anfitrion);
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const anfitrion = vista.fixture.componentInstance;
  const asienta = async () => {
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };
  return { vista, anfitrion, asienta };
}

const asunto = () => document.querySelector<HTMLInputElement>('#aviso-asunto')!;
const mensaje = () => document.querySelector<HTMLTextAreaElement>('#aviso-mensaje')!;

describe('LecturaDeAviso', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('sin nada abierto invita a elegir un mensaje', async () => {
    await monta();

    expect(screen.getByText('Selecciona un mensaje para leerlo.')).toBeInTheDocument();
  });

  it('con un aviso abierto enseña su título y su cuerpo', async () => {
    const { anfitrion, asienta } = await monta();

    anfitrion.aviso.set(aviso());
    await asienta();

    expect(screen.getByText('Consulta sobre un pedido')).toBeInTheDocument();
    expect(screen.getByText('¿Cuándo llega?')).toBeInTheDocument();
  });

  it('un aviso sin cuerpo lo dice, en vez de dejar un hueco', async () => {
    const { anfitrion, asienta } = await monta();

    anfitrion.aviso.set(aviso({ cuerpo: undefined }));
    await asienta();

    expect(screen.getByText('(Sin contenido)')).toBeInTheDocument();
  });

  describe('la respuesta', () => {
    it('el asunto llega con el prefijo de respuesta ya puesto', async () => {
      const { anfitrion, asienta } = await monta();

      anfitrion.aviso.set(aviso());
      await asienta();

      expect(asunto().value).toBe('Re: Mi pedido');
    });

    it('se contesta al correo del aviso, no a uno tecleado a mano', async () => {
      const { anfitrion, asienta } = await monta();
      anfitrion.aviso.set(aviso());
      await asienta();

      await userEvent.type(mensaje(), 'Sale mañana');
      await userEvent.click(screen.getByRole('button', { name: /Enviar respuesta/ }));

      expect(anfitrion.respuestas).toEqual([
        { email: 'cliente@ejemplo.com', asunto: 'Re: Mi pedido', mensaje: 'Sale mañana' },
      ]);
    });

    /**
     * El fallo que esto impide: escribir media respuesta, pasar a otro aviso y mandarla — al correo del
     * nuevo. Con el asunto rehecho y el cuerpo en blanco no hay forma de que ocurra por descuido.
     */
    it('al cambiar de aviso se rehace el asunto y se VACÍA lo escrito', async () => {
      const { anfitrion, asienta } = await monta();
      anfitrion.aviso.set(aviso());
      await asienta();
      await userEvent.type(mensaje(), 'a medio escribir');

      anfitrion.aviso.set(
        aviso({ id: 'a2', datos: { email: 'otro@ejemplo.com', subject: 'Otra cosa' } }),
      );
      await asienta();

      expect(asunto().value).toBe('Re: Otra cosa');
      expect(mensaje().value, 'se arrastró lo escrito para el aviso anterior').toBe('');
    });

    it('tras enviar, el cuerpo se limpia para no mandarlo dos veces', async () => {
      const { anfitrion, asienta } = await monta();
      anfitrion.aviso.set(aviso());
      await asienta();

      await userEvent.type(mensaje(), 'Sale mañana');
      await userEvent.click(screen.getByRole('button', { name: /Enviar respuesta/ }));
      await asienta();

      expect(mensaje().value).toBe('');
    });

    /** Un «tu pedido va en camino» no tiene a quién contestar: ofrecer el formulario invita a escribir a nadie. */
    it('un aviso informativo no ofrece responder', async () => {
      const { anfitrion, asienta } = await monta();

      anfitrion.aviso.set(aviso({ tipoDeSuceso: 'ORDER_SHIPPED', datos: undefined }));
      await asienta();

      expect(document.querySelector('#aviso-mensaje')).toBeNull();
    });
  });

  describe('mover el aviso', () => {
    it('en la bandeja se ofrece archivar y tirar', async () => {
      const { anfitrion, asienta } = await monta();
      anfitrion.aviso.set(aviso());
      await asienta();

      await userEvent.click(screen.getByRole('button', { name: /Archivar/ }));

      expect(anfitrion.movimientos).toEqual(['archiva']);
    });

    it('en la papelera se ofrece restaurar y borrar para siempre', async () => {
      const { anfitrion, asienta } = await monta();
      anfitrion.aviso.set(aviso());
      anfitrion.carpeta.set('trash');
      await asienta();

      await userEvent.click(screen.getByRole('button', { name: /Restaurar/ }));

      expect(anfitrion.movimientos).toEqual(['restaura']);
    });
  });

  /** `NEW` es el estado de partida y no se elige a mano: se sale de él, no se vuelve. */
  it('el estado de partida no se puede elegir en el desplegable', async () => {
    const { anfitrion, asienta } = await monta();
    anfitrion.aviso.set(aviso());
    await asienta();

    const nuevo = screen.getByRole('option', { name: /Nuev/ }) as HTMLOptionElement;
    expect(nuevo.disabled).toBe(true);
  });
});
