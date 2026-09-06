import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { BusquedaGlobal } from './busqueda-global';

/**
 * Las pruebas que MONTAN un componente tardan más de lo que Vitest espera por defecto (5 s) cuando hay
 * varios equipos compilando a la vez: el arranque de Angular compite por la máquina. El plazo se sube
 * aquí para que un fallo signifique lo que tiene que significar —que la lógica está mal— y no que el
 * ordenador iba cargado.
 */
vi.setConfig({ testTimeout: 30_000 });

/**
 * El idioma sale de la cookie de preferencias, igual que en el resto de las pruebas del área.
 *
 * <p>Sin ponerla aquí, estas comprobaciones pasaban solo cuando OTRO fichero de pruebas la había dejado
 * escrita antes en el mismo entorno: en solitario el panel se pintaba en inglés y el rótulo del
 * disparador no casaba. Dependía del orden de la pasada, que no es algo que deba decidir si una prueba
 * pasa.
 */
function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

async function monta() {
  enEspanol();
  return render(BusquedaGlobal, { providers: [provideRouter([])] });
}

describe('BusquedaGlobal', () => {
  it('empieza cerrada, con solo el disparador a la vista', async () => {
    await monta();

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('se abre al pulsar el disparador y enseña el mapa entero del panel', async () => {
    await monta();

    await userEvent.click(screen.getByRole('button', { name: /admin.search.placeholder|buscar/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('/admin/users')).toBeInTheDocument();
    expect(screen.getByText('/admin/wallets')).toBeInTheDocument();
  });

  /** El atajo se escucha en el documento: tiene que funcionar esté donde esté el foco. */
  it('el atajo del teclado abre y vuelve a cerrar', async () => {
    await monta();

    await userEvent.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Control>}k{/Control}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape la cierra', async () => {
    await monta();
    await userEvent.keyboard('{Control>}k{/Control}');

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('filtra por lo tecleado y avisa cuando no hay nada', async () => {
    await monta();
    await userEvent.click(screen.getByRole('button', { name: /admin.search.placeholder|buscar/i }));

    const campo = screen.getAllByRole('searchbox')[0];
    await userEvent.type(campo, 'zzzz');

    expect(screen.getByText(/filters.no_results|Ningún resultado/i)).toBeInTheDocument();
  });
});
