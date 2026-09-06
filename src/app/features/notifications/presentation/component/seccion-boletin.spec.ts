import { fireEvent, render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { BOLETIN_PORT, BoletinPort } from '../../domain/port/boletin.port';
import { SeccionBoletin } from './seccion-boletin';

describe('SeccionBoletin', () => {
  let puerto: BoletinPort;

  beforeEach(() => {
    puerto = {
      suscribe: vi.fn().mockResolvedValue(exito({ yaEstaba: false })),
      daDeBaja: vi.fn(),
    };
  });

  async function monta() {
    return render(SeccionBoletin, {
      providers: [{ provide: BOLETIN_PORT, useValue: puerto }],
    });
  }

  /**
   * Escribe el correo, envía y ESPERA a que la vista se asiente.
   *
   * <p>Hace falta porque el proyecto es sin zonas: lo que se escribe tras un `await` dentro del
   * manejador ocurre fuera del ciclo de detección que disparó el clic, así que hay que esperar al
   * siguiente antes de mirar el DOM.
   */
  async function escribeYEnvia(vista: Awaited<ReturnType<typeof monta>>, correo: string) {
    const campo = vista.container.querySelector('input') as HTMLInputElement;
    // Se escribe de una vez y no tecla a tecla: el valor del campo está ATADO a un signal, así que
    // cada pulsación provoca una detección de cambios que lo vuelve a escribir. Simular el tecleo
    // completo no aporta nada aquí y deja la prueba a merced de esa carrera.
    fireEvent.input(campo, { target: { value: correo } });
    fireEvent.click(screen.getByRole('button'));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  }

  it('suscribe con el correo escrito y da las gracias', async () => {
    const vista = await monta();

    await escribeYEnvia(vista, ' hola@ejemplo.com ');

    // Se recorta antes de mandarlo: un correo con espacios delante no existe.
    expect(puerto.suscribe).toHaveBeenCalledWith('hola@ejemplo.com');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('cuando ya estaba apuntado lo dice de otra manera', async () => {
    vi.mocked(puerto.suscribe).mockResolvedValue(exito({ yaEstaba: true }));
    const vista = await monta();

    await escribeYEnvia(vista, 'hola@ejemplo.com');

    const aviso = screen.getByRole('status');
    expect(aviso).toBeInTheDocument();
    expect(aviso.className).toContain('opacity-60');
  });

  /**
   * La respuesta del backend es NEUTRA a propósito. Distinguir aquí un fallo de red de un correo ya
   * apuntado daría justo la información que la neutralidad quiere ocultar.
   */
  it('tampoco cuenta nada cuando falla', async () => {
    vi.mocked(puerto.suscribe).mockResolvedValue(fallo(creaError('sin-conexion')));
    const vista = await monta();

    await escribeYEnvia(vista, 'hola@ejemplo.com');

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('un correo en blanco no llega al backend', async () => {
    const vista = await monta();

    fireEvent.click(screen.getByRole('button'));
    await vista.fixture.whenStable();

    expect(puerto.suscribe).not.toHaveBeenCalled();
  });
});
