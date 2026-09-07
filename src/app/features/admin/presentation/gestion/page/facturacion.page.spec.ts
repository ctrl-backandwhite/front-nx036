import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import {
  ActualizaElPlan,
  ConsultaPlanes,
  ConsultaSuscripciones,
} from '../../../application/gestion/use-case/facturacion.use-case';
import { Plan, Suscripcion } from '../../../domain/gestion/model/facturacion';
import { FACTURACION_PORT } from '../../../domain/gestion/port/facturacion.port';
import { TIPOS_DE_CAMBIO_PORT } from '../../../domain/gestion/port/tipos-de-cambio.port';
import { FacturacionPage } from './facturacion.page';
import { instalaObservadorDeVisibilidad } from '../pruebas/visibilidad';

/**
 * El DOM simulado de las pruebas NO trae `IntersectionObserver`, que es lo que usa `@defer (on
 * viewport)` para saber cuándo se llega a un bloque. Sin el doble, montar la pantalla revienta con
 * «IntersectionObserver is not defined» y el fallo parece del componente cuando es del entorno.
 */
instalaObservadorDeVisibilidad();

const plan = (parcial: Partial<Plan> = {}): Plan => ({
  id: '1',
  codigo: 'PRO',
  nombre: 'Profesional',
  mensualCentimos: 2900,
  anualCentimos: 29000,
  divisa: 'USD',
  activo: true,
  posicion: 1,
  ...parcial,
});

const suscripcion = (parcial: Partial<Suscripcion> = {}): Suscripcion => ({
  id: 's1',
  idUsuario: 'u1',
  emailUsuario: 'ana@ejemplo.com',
  plan: 'PRO',
  estado: 'ACTIVE',
  periodo: 'MONTHLY',
  inicioDelPeriodo: '2026-01-01T00:00:00Z',
  finDelPeriodo: '2026-02-01T00:00:00Z',
  ...parcial,
});

/**
 * Las pruebas van en español y en dólares: el idioma y la divisa salen de las cookies de preferencias y,
 * sin fijarlas, el navegador de las pruebas decide por su cuenta y las comprobaciones sobre los textos
 * reales dejarían de valer.
 */
function enEspanolYEnDolares(): void {
  document.cookie = 'nx036-locale=es';
  document.cookie = 'nx036-currency=USD';
}

/**
 * Plazo generoso por prueba.
 *
 * <p>Montar la pantalla arranca el diccionario de la interfaz y los iconos, y estas pruebas se ejecutan
 * en una máquina compartida con las demás pasadas. Con los cinco segundos de serie, bajo carga fallaba
 * por tiempo agotado una prueba distinta en cada pasada, sin que nada estuviera roto. Un fallo de verdad
 * sigue saliendo al instante, porque es una comprobación que no casa, no una espera.
 */
const PLAZO = 20_000;

/**
 * `Playthrough` pinta los bloques `@defer` como si ya se hubiera llegado a ellos. Sin esto, lo que va
 * bajo el pliegue se queda en su hueco reservado —en una prueba nadie se desplaza por la página— y las
 * aserciones fallarían con «no se encuentra el elemento».
 */
describe('FacturacionPage', () => {

  const puerto = {
    planes: vi.fn(),
    actualizaPlan: vi.fn(),
    suscripciones: vi.fn(),
  };
  const dialogo = { alerta: vi.fn(), confirma: vi.fn() };

  const monta = () =>
    render(FacturacionPage, {
      // SIN `Playthrough`, y es a propósito. Esta pantalla no tiene ningún bloque diferido: su
      // contenido se pinta al montar. Si alguien vuelve a esconderlo tras un `@defer`, estas pruebas
      // se ponen en rojo, que es justo lo que NO pasó en /admin/partners —allí el `Playthrough` los
      // pintaba a la fuerza y el defecto solo se vio midiendo en el navegador—.
      providers: [
        { provide: FACTURACION_PORT, useValue: puerto },
        { provide: TIPOS_DE_CAMBIO_PORT, useValue: { vigentes: async () => exito([]) } },
        { provide: DialogoStore, useValue: dialogo },
        ConsultaPlanes,
        ActualizaElPlan,
        ConsultaSuscripciones,
        ImportesStore,
      ],
    });

  beforeEach(() => {
    enEspanolYEnDolares();
    vi.resetAllMocks();
    puerto.planes.mockResolvedValue(exito([plan()]));
    puerto.suscripciones.mockResolvedValue(exito([suscripcion()]));
    puerto.actualizaPlan.mockResolvedValue(exito(undefined));
  }, PLAZO);

  it('escribe los precios del plan ya formateados y dice que ofrece los dos ciclos', async () => {
    await monta();

    expect(await screen.findByText('Profesional')).toBeInTheDocument();
    // Los céntimos son la unidad del backend; lo que se lee es el importe con su divisa.
    expect(screen.getByText('$29.00')).toBeInTheDocument();
    expect(screen.getByText('$290.00')).toBeInTheDocument();
    expect(screen.getByText('Mensual / Anual')).toBeInTheDocument();
  }, PLAZO);

  /** Un ciclo que el plan no vende no es «gratis»: solo el plan de verdad gratuito puede decirlo. */
  it('el plan gratuito se anuncia como gratuito y el de precio a medida remite a ventas', async () => {
    puerto.planes.mockResolvedValue(
      exito([
        plan({ id: '2', codigo: 'FREE', nombre: 'Inicial', mensualCentimos: 0, anualCentimos: 0 }),
        plan({
          id: '3',
          codigo: 'ENTERPRISE',
          nombre: 'Corporativo',
          mensualCentimos: 0,
          anualCentimos: 0,
        }),
      ]),
    );

    await monta();

    expect(await screen.findByText('Inicial')).toBeInTheDocument();
    expect(screen.getAllByText('Gratuito').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Contactar ventas').length).toBeGreaterThanOrEqual(2);
  }, PLAZO);

  /** El plan gratuito no tiene ciclo de cobro: pintarlo haría creer que se eligió una periodicidad. */
  it('la suscripción gratuita no enseña ciclo de cobro', async () => {
    puerto.suscripciones.mockResolvedValue(
      exito([suscripcion({ plan: 'FREE', estado: 'TRIALING' })]),
    );

    await monta();

    expect(await screen.findByText('ana@ejemplo.com')).toBeInTheDocument();
    // Además, un plan gratuito jamás figura «en prueba»: se cuenta como activa.
    expect(screen.getByText('Activa')).toBeInTheDocument();
  }, PLAZO);

  it('el buscador deja solo las suscripciones que casan', async () => {
    puerto.suscripciones.mockResolvedValue(
      exito([suscripcion(), suscripcion({ id: 's2', emailUsuario: 'luis@ejemplo.com' })]),
    );

    const vista = await monta();
    await screen.findByText('luis@ejemplo.com');

    await userEvent.type(screen.getByRole('searchbox'), 'ana@');

    // El buscador tiene freno: publica lo tecleado tras una pausa, así que se espera al repintado.
    await waitFor(() => {
      vista.fixture.detectChanges();
      expect(screen.queryByText('luis@ejemplo.com')).toBeNull();
    });
    expect(screen.getByText('ana@ejemplo.com')).toBeInTheDocument();
  }, PLAZO);

  it('si la lectura falla la pantalla sigue en pie con su rótulo de vacío', async () => {
    puerto.planes.mockResolvedValue(fallo(creaError('sin-conexion')));
    puerto.suscripciones.mockResolvedValue(fallo(creaError('error-del-servidor')));

    await monta();

    expect(await screen.findByText('Aún no hay suscripciones.')).toBeInTheDocument();
  }, PLAZO);

  /**
   * Sin esto, un rechazo del backend dejaba el editor abierto sin explicación y quien administra se iba
   * creyendo que el precio estaba cambiado.
   */
  it('un rechazo al guardar el plan se enseña y el editor no se cierra', async () => {
    puerto.actualizaPlan.mockResolvedValue(
      fallo(creaError('peticion-invalida', 'El precio anual no puede ser menor que el mensual')),
    );

    const vista = await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    vista.fixture.detectChanges();
    await userEvent.click(await screen.findByRole('button', { name: 'Guardar' }));
    vista.fixture.detectChanges();

    expect(dialogo.alerta).toHaveBeenCalledWith(
      'El precio anual no puede ser menor que el mensual',
      undefined,
      'error',
    );
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  }, PLAZO);

  it('al guardar bien se cierra el editor y se vuelve a leer', async () => {
    const vista = await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    vista.fixture.detectChanges();
    await userEvent.click(await screen.findByRole('button', { name: 'Guardar' }));
    vista.fixture.detectChanges();

    expect(puerto.actualizaPlan).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
  }, PLAZO);
});
