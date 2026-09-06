import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { CURSOS_PORT } from '../../../domain/gestion/port/contenido.port';
import { Curso } from '../../../domain/gestion/model/contenido';
import {
  BorraElCurso, ConsultaCursos, GuardaElCurso,
} from '../../../application/gestion/use-case/contenido.use-case';
import { AcademiaPage } from './academia.page';

const curso = (parcial: Partial<Curso> = {}): Curso => ({
  id: 'k1',
  titulo: 'Primeros pasos',
  descripcion: 'Cómo empezar',
  instructor: 'Marta',
  duracionMinutos: 45,
  portadaUrl: 'https://ejemplo/portada.jpg',
  videoUrl: 'https://ejemplo/video.mp4',
  idioma: 'es',
  nivel: 'BEGINNER',
  publicado: true,
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

describe('AcademiaPage', () => {
  const puerto = { lista: vi.fn(), crea: vi.fn(), actualiza: vi.fn(), borra: vi.fn() };
  const dialogo = { confirma: vi.fn(), alerta: vi.fn(), pregunta: vi.fn() };
  const avisos = { exito: vi.fn(), error: vi.fn(), muestra: vi.fn() };

  const monta = () =>
    render(AcademiaPage, {
      providers: [
        { provide: CURSOS_PORT, useValue: puerto },
        { provide: DialogoStore, useValue: dialogo },
        { provide: AvisosStore, useValue: avisos },
        ConsultaCursos, GuardaElCurso, BorraElCurso,
      ],
    });

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
    puerto.lista.mockResolvedValue(exito([curso()]));
  });

  it('enseña cada curso con su instructor y su nivel', async () => {
    await monta();

    expect(await screen.findByText('Primeros pasos')).toBeInTheDocument();
    expect(screen.getByText('Marta')).toBeInTheDocument();
    expect(screen.getByText('Principiante')).toBeInTheDocument();
  });

  it('sin cursos lo dice en vez de dejar la tabla en blanco', async () => {
    puerto.lista.mockResolvedValue(exito([]));

    await monta();

    expect(await screen.findByText('Aún no hay cursos.')).toBeInTheDocument();
  });

  it('un fallo al leer deja la tabla vacía y lo cuenta', async () => {
    puerto.lista.mockResolvedValue(fallo(creaError('sin-conexion', 'No hay red')));

    await monta();

    expect(await screen.findByText('Aún no hay cursos.')).toBeInTheDocument();
    expect(avisos.error).toHaveBeenCalledWith('No hay red');
  });

  it('un curso sin título no se guarda y se dice por qué', async () => {
    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo curso' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(avisos.error).toHaveBeenCalledWith('El título es obligatorio.');
    expect(puerto.crea).not.toHaveBeenCalled();
  });

  it('un curso nuevo se crea con lo tecleado', async () => {
    puerto.crea.mockResolvedValue(exito(undefined));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo curso' }));
    await userEvent.type(screen.getByLabelText('Título *'), 'Anuncios');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(puerto.crea).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Anuncios', nivel: 'BEGINNER' }),
    );
    expect(puerto.lista).toHaveBeenCalledTimes(2);
  });

  it('editar un curso ya creado lo actualiza en vez de duplicarlo', async () => {
    puerto.actualiza.mockResolvedValue(exito(undefined));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(puerto.actualiza).toHaveBeenCalledWith('k1', expect.objectContaining({ id: 'k1' }));
    expect(puerto.crea).not.toHaveBeenCalled();
  });

  it('si se arrepiente del borrado, el curso se queda', async () => {
    dialogo.confirma.mockResolvedValue(false);

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));

    expect(dialogo.confirma).toHaveBeenCalledWith('¿Eliminar este curso?');
    expect(puerto.borra).not.toHaveBeenCalled();
  });

  /**
   * Un curso con ALUMNOS MATRICULADOS no se borra: el backend se niega. Esa negativa hay que enseñarla,
   * o la fila se queda en pantalla y quien administra la vuelve a pulsar sin saber por qué.
   */
  it('la negativa del backend a borrar un curso con alumnos se enseña', async () => {
    dialogo.confirma.mockResolvedValue(true);
    puerto.borra.mockResolvedValue(
      fallo(creaError('conflicto', 'El curso tiene alumnos matriculados')),
    );

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));

    expect(avisos.error).toHaveBeenCalledWith('El curso tiene alumnos matriculados');
    expect(screen.getByText('Primeros pasos')).toBeInTheDocument();
  });

  it('borrar un curso sin alumnos vuelve a leer el listado', async () => {
    dialogo.confirma.mockResolvedValue(true);
    puerto.borra.mockResolvedValue(exito(undefined));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));

    expect(puerto.borra).toHaveBeenCalledWith('k1');
    expect(puerto.lista).toHaveBeenCalledTimes(2);
  });
});
