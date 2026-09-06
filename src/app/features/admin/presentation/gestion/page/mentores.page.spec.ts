import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { MENTORES_PORT } from '../../../domain/gestion/port/contenido.port';
import { TIPOS_DE_CAMBIO_PORT } from '../../../domain/gestion/port/tipos-de-cambio.port';
import { Mentor } from '../../../domain/gestion/model/contenido';
import {
  BorraElMentor, ConsultaMentores, GuardaElMentor,
} from '../../../application/gestion/use-case/contenido.use-case';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import { MentoresPage } from './mentores.page';

const mentor = (parcial: Partial<Mentor> = {}): Mentor => ({
  id: 'm1',
  emailUsuario: 'luis@nx036.local',
  nombre: 'Luis Vega',
  titular: 'Escalando con anuncios',
  biografia: 'Diez años vendiendo',
  zonaHoraria: 'Europe/Madrid',
  tarifaUsdHora: 50,
  especialidades: ['paid-ads', 'branding'],
  idiomas: ['es', 'en'],
  activo: true,
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

describe('MentoresPage', () => {
  const puerto = { lista: vi.fn(), crea: vi.fn(), actualiza: vi.fn(), borra: vi.fn() };
  const dialogo = { confirma: vi.fn(), alerta: vi.fn(), pregunta: vi.fn() };
  const avisos = { exito: vi.fn(), error: vi.fn(), muestra: vi.fn() };

  const monta = () =>
    render(MentoresPage, {
      providers: [
        { provide: MENTORES_PORT, useValue: puerto },
        // Sin tasas se formatea en dólares sin convertir, que es el comportamiento declarado del almacén.
        { provide: TIPOS_DE_CAMBIO_PORT, useValue: { vigentes: async () => exito([]) } },
        { provide: DialogoStore, useValue: dialogo },
        { provide: AvisosStore, useValue: avisos },
        ImportesStore,
        ConsultaMentores, GuardaElMentor, BorraElMentor,
      ],
    });

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
    puerto.lista.mockResolvedValue(exito([mentor()]));
  });

  it('enseña cada mentor con su cuenta y su tarifa ya escrita', async () => {
    await monta();

    expect(await screen.findByText('Luis Vega')).toBeInTheDocument();
    expect(screen.getByText('luis@nx036.local')).toBeInTheDocument();
    expect(screen.getByText('$50.00/h')).toBeInTheDocument();
  });

  it('sin mentores lo dice en vez de dejar la tabla en blanco', async () => {
    puerto.lista.mockResolvedValue(exito([]));

    await monta();

    expect(await screen.findByText('Aún no hay mentores.')).toBeInTheDocument();
  });

  it('un fallo al leer deja la tabla vacía y lo cuenta', async () => {
    puerto.lista.mockResolvedValue(fallo(creaError('sin-conexion', 'No hay red')));

    await monta();

    expect(await screen.findByText('Aún no hay mentores.')).toBeInTheDocument();
    expect(avisos.error).toHaveBeenCalledWith('No hay red');
  });

  /** Un mentor nuevo va atado a una cuenta: sin correo y sin titular no se crea. */
  it('un mentor nuevo sin cuenta ni titular no se guarda y se dice por qué', async () => {
    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo mentor' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(avisos.error).toHaveBeenCalledWith(
      'El email del usuario y el titular son obligatorios.',
    );
    expect(puerto.crea).not.toHaveBeenCalled();
  });

  /** Especialidades e idiomas se teclean separados por comas y viajan ya partidos. */
  it('al crear, las listas escritas con comas llegan partidas', async () => {
    puerto.crea.mockResolvedValue(exito(undefined));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo mentor' }));
    await userEvent.type(screen.getByLabelText('Email del usuario *'), 'a@nx.io');
    await userEvent.type(screen.getByLabelText('Titular *'), 'Marca');
    await userEvent.type(screen.getByLabelText('Tema'), 'ads, marca');
    await userEvent.type(screen.getByLabelText('Idiomas'), 'es, en');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(puerto.crea).toHaveBeenCalledWith(
      expect.objectContaining({
        emailUsuario: 'a@nx.io',
        titular: 'Marca',
        especialidades: ['ads', 'marca'],
        idiomas: ['es', 'en'],
      }),
    );
  });

  /** Cambiar la cuenta de un mentor ya creado sería crear otro mentor: el correo no se vuelve a pedir. */
  it('al editar no se pide otra vez la cuenta', async () => {
    puerto.actualiza.mockResolvedValue(exito(undefined));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    expect(screen.queryByLabelText('Email del usuario *')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(puerto.actualiza).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({ titular: 'Escalando con anuncios', tarifaUsdHora: 50 }),
    );
  });

  it('si se arrepiente del borrado, el mentor se queda', async () => {
    dialogo.confirma.mockResolvedValue(false);

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));

    expect(dialogo.confirma).toHaveBeenCalledWith('¿Eliminar este mentor?');
    expect(puerto.borra).not.toHaveBeenCalled();
  });

  /**
   * El backend se NIEGA a borrar un mentor con sesiones reservadas. Esa negativa hay que enseñarla, o la
   * fila se queda en la tabla y el borrado parece no hacer nada.
   */
  it('la negativa del backend a borrar un mentor con sesiones se enseña', async () => {
    dialogo.confirma.mockResolvedValue(true);
    puerto.borra.mockResolvedValue(
      fallo(creaError('conflicto', 'El mentor tiene sesiones reservadas')),
    );

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));

    expect(avisos.error).toHaveBeenCalledWith('El mentor tiene sesiones reservadas');
    expect(screen.getByText('Luis Vega')).toBeInTheDocument();
  });

  it('borrar un mentor sin sesiones vuelve a leer el listado', async () => {
    dialogo.confirma.mockResolvedValue(true);
    puerto.borra.mockResolvedValue(exito(undefined));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));

    expect(puerto.borra).toHaveBeenCalledWith('m1');
    expect(puerto.lista).toHaveBeenCalledTimes(2);
  });
});
