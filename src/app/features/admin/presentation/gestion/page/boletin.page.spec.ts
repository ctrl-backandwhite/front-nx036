import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { BOLETIN_PORT } from '../../../domain/gestion/port/contenido.port';
import { ResumenDelBoletin } from '../../../domain/gestion/model/contenido';
import {
  ConsultaElBoletin, EnviaElBoletin,
} from '../../../application/gestion/use-case/contenido.use-case';
import { BoletinPage } from './boletin.page';
import { instalaObservadorDeVisibilidad } from '../pruebas/visibilidad';

/**
 * El DOM simulado de las pruebas NO trae `IntersectionObserver`, que es lo que usa `@defer (on
 * viewport)` para saber cuándo se llega a un bloque. Sin el doble, montar la pantalla revienta con
 * «IntersectionObserver is not defined» y el fallo parece del componente cuando es del entorno.
 */
instalaObservadorDeVisibilidad();

const resumen = (parcial: Partial<ResumenDelBoletin> = {}): ResumenDelBoletin => ({
  suscriptores: 120,
  campanas: [],
  ...parcial,
});

/**
 * Estas pantallas montan tablas enteras y el teclado se simula tecla a tecla: con el resto de equipos
 * compilando a la vez, los cinco segundos por defecto de Vitest se agotan y la prueba falla por el
 * reloj, no por el código. Se les da holgura para que lo que falle sea siempre el comportamiento.
 */
vi.setConfig({ testTimeout: 30_000 });

function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

/**
 * `Playthrough` pinta los bloques `@defer` como si ya se hubiera llegado a ellos. Sin esto, lo que va
 * bajo el pliegue se queda en su hueco reservado —en una prueba nadie se desplaza por la página— y las
 * aserciones fallarían con «no se encuentra el elemento».
 */
describe('BoletinPage', () => {

  const puerto = { resumen: vi.fn(), envia: vi.fn() };
  const dialogo = { confirma: vi.fn(), alerta: vi.fn(), pregunta: vi.fn() };
  const avisos = { exito: vi.fn(), error: vi.fn(), muestra: vi.fn() };

  const monta = () =>
    render(BoletinPage, {
      // SIN `Playthrough`, y es a propósito. Esta pantalla no tiene ningún bloque diferido: su
      // contenido se pinta al montar. Si alguien vuelve a esconderlo tras un `@defer`, estas pruebas
      // se ponen en rojo, que es justo lo que NO pasó en /admin/partners —allí el `Playthrough` los
      // pintaba a la fuerza y el defecto solo se vio midiendo en el navegador—.
      providers: [
        { provide: BOLETIN_PORT, useValue: puerto },
        { provide: DialogoStore, useValue: dialogo },
        { provide: AvisosStore, useValue: avisos },
        ConsultaElBoletin, EnviaElBoletin,
      ],
    });

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
    puerto.resumen.mockResolvedValue(exito(resumen()));
  });

  it('enseña a cuántos suscriptores llegaría y qué se ha mandado antes', async () => {
    puerto.resumen.mockResolvedValue(
      exito(
        resumen({
          campanas: [
            {
              id: 'c1', asunto: 'Novedades de mayo', destinatarios: 118, estado: 'SENT',
              creadaEl: '2026-05-02T09:00:00Z',
            },
          ],
        }),
      ),
    );

    await monta();

    expect(await screen.findByText('Novedades de mayo')).toBeInTheDocument();
    expect(screen.getByText('120 suscriptores')).toBeInTheDocument();
  });

  it('sin historial lo dice en vez de dejar la tabla en blanco', async () => {
    await monta();

    expect(
      await screen.findByText('Aún no se ha enviado ninguna newsletter.'),
    ).toBeInTheDocument();
  });

  it('sin asunto y sin contenido no se puede enviar', async () => {
    await monta();

    expect(await screen.findByRole('button', { name: 'Enviar newsletter' })).toBeDisabled();
  });

  /** Sin nadie a quien mandárselo, enviar no significa nada. */
  it('sin suscriptores tampoco se puede enviar aunque esté escrito', async () => {
    puerto.resumen.mockResolvedValue(exito(resumen({ suscriptores: 0 })));

    await monta();
    await userEvent.type(await screen.findByLabelText('Asunto'), 'Hola');
    await userEvent.type(screen.getByLabelText('Contenido'), 'Qué tal');

    expect(screen.getByRole('button', { name: 'Enviar newsletter' })).toBeDisabled();
  });

  it('la vista previa pinta el HTML que se teclea', async () => {
    await monta();
    await userEvent.type(await screen.findByLabelText('Contenido'), '<b>Rebajas</b>');

    const negrita = await screen.findByText('Rebajas');
    expect(negrita.tagName).toBe('B');
  });

  /**
   * La vista previa pinta HTML tecleado a mano. Angular lo pasa por su saneador antes de escribirlo, y
   * ese saneador quita los manejadores de eventos: no hace falta ninguna librería de saneado encima.
   */
  it('la vista previa no deja pasar un manejador de eventos', async () => {
    await monta();
    await userEvent.type(
      await screen.findByLabelText('Contenido'),
      '<b onclick="x()">Rebajas</b>',
    );

    const negrita = await screen.findByText('Rebajas');
    expect(negrita.hasAttribute('onclick')).toBe(false);
  });

  it('enviar se confirma antes con la cifra delante, y si se dice que no, no sale nada', async () => {
    dialogo.confirma.mockResolvedValue(false);

    await monta();
    await userEvent.type(await screen.findByLabelText('Asunto'), 'Hola');
    await userEvent.type(screen.getByLabelText('Contenido'), 'Qué tal');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar newsletter' }));

    expect(dialogo.confirma).toHaveBeenCalledWith('¿Enviar esta newsletter a 120 suscriptores?');
    expect(puerto.envia).not.toHaveBeenCalled();
  });

  it('tras enviar, el formulario se vacía y se dice a cuántos llegó', async () => {
    dialogo.confirma.mockResolvedValue(true);
    puerto.envia.mockResolvedValue(exito(118));

    await monta();
    await userEvent.type(await screen.findByLabelText('Asunto'), 'Hola');
    await userEvent.type(screen.getByLabelText('Contenido'), 'Qué tal');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar newsletter' }));

    expect(puerto.envia).toHaveBeenCalledWith('Hola', 'Qué tal');
    expect(avisos.exito).toHaveBeenCalledWith('Newsletter encolada para 118 suscriptores.');
    expect(screen.getByLabelText('Asunto')).toHaveValue('');
  });

  it('si el envío falla, lo dice y NO borra lo escrito', async () => {
    dialogo.confirma.mockResolvedValue(true);
    puerto.envia.mockResolvedValue(fallo(creaError('demasiadas-peticiones', 'Cuota agotada')));

    await monta();
    await userEvent.type(await screen.findByLabelText('Asunto'), 'Hola');
    await userEvent.type(screen.getByLabelText('Contenido'), 'Qué tal');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar newsletter' }));

    expect(avisos.error).toHaveBeenCalledWith('Cuota agotada');
    expect(screen.getByLabelText('Asunto')).toHaveValue('Hola');
  });

  it('un fallo al leer el resumen se cuenta y deja el envío bloqueado', async () => {
    puerto.resumen.mockResolvedValue(fallo(creaError('sin-conexion', 'No hay red')));

    await monta();

    expect(await screen.findByRole('button', { name: 'Enviar newsletter' })).toBeDisabled();
    expect(avisos.error).toHaveBeenCalledWith('No hay red');
  });
});
