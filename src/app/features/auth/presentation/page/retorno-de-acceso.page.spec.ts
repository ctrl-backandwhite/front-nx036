import { Router } from '@angular/router';
import { render } from '@testing-library/angular';
import { CompletaAccesoSocial } from '../../application/use-case/completa-acceso-social.use-case';
import { RetornoDeAccesoPage } from './retorno-de-acceso.page';

/**
 * La pantalla a la que devuelve Google o GitHub.
 *
 * <p>Los testigos llegan en el FRAGMENTO de la dirección, que no viaja al servidor pero SÍ se queda en
 * la barra, en el historial y en lo que se copia al compartir el enlace. Lo que se certifica aquí es que
 * se borran ANTES de nada —incluso si después todo lo demás falla— y que un retorno roto acaba en la
 * pantalla de acceso en vez de dejar a alguien mirando un girador para siempre.
 */
async function monta(fragmento: string, destino: string | null = '/catalog') {
  window.history.replaceState(null, '', `/auth/callback${fragmento}`);
  const completa = { ejecuta: vi.fn(async (_fragmento: string) => destino) };
  /* Un doble del enrutador y no un espía puesto después: la pantalla navega desde su propio
   * constructor, así que cuando `render` devuelve el viaje ya ha ocurrido y no habría nada que espiar. */
  const navegaciones: { destino: string; opciones: unknown }[] = [];
  const router = {
    navigateByUrl: (destinoUrl: string, opciones?: unknown) => {
      navegaciones.push({ destino: destinoUrl, opciones });
      return Promise.resolve(true);
    },
  };

  const vista = await render(RetornoDeAccesoPage, {
    providers: [
      { provide: Router, useValue: router },
      { provide: CompletaAccesoSocial, useValue: completa },
    ],
  });
  await vista.fixture.whenStable();

  return { vista, completa, navegaciones };
}

describe('RetornoDeAccesoPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('entrega el fragmento sin el almohadilla, que es lo que espera quien lo lee', async () => {
    const { completa } = await monta('#token=abc&refresh=def');

    expect(completa.ejecuta).toHaveBeenCalledWith('token=abc&refresh=def');
  });

  /**
   * Se limpia antes de llamar a nadie: si se limpiara al final, un fallo por el camino dejaría los
   * testigos escritos en la barra y en el historial del navegador.
   */
  it('borra los testigos de la barra de direcciones', async () => {
    await monta('#token=abc&refresh=def');

    expect(location.hash).toBe('');
    expect(location.pathname).toBe('/auth/callback');
  });

  it('lleva adonde diga el caso de uso', async () => {
    const { navegaciones } = await monta('#token=abc', '/admin');

    expect(navegaciones).toEqual([{ destino: '/admin', opciones: { replaceUrl: true } }]);
  });

  it('un retorno sin testigos acaba en el acceso, no en un girador eterno', async () => {
    const { navegaciones } = await monta('', null);

    expect(navegaciones).toEqual([
      { destino: '/login?error=google', opciones: { replaceUrl: true } },
    ]);
  });

  it('se atiende UNA vez: hidratar no vuelve a intentarlo sobre un fragmento ya borrado', async () => {
    const { vista, completa } = await monta('#token=abc');

    vista.fixture.detectChanges();
    await vista.fixture.whenStable();

    expect(completa.ejecuta).toHaveBeenCalledTimes(1);
  });
});
