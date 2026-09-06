import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { PanelDeAfiliado, PerfilDeCobro } from '../../domain/model/afiliado';
import { ConsultaPanelDeAfiliado } from '../../application/use-case/consulta-panel-de-afiliado.use-case';
import { GestionaCobro } from '../../application/use-case/gestiona-cobro.use-case';
import { AfiliadoPage } from './afiliado.page';

function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

const panel = (parcial: Partial<PanelDeAfiliado> = {}): PanelDeAfiliado => ({
  estado: 'ACTIVE',
  porcentajeDeComision: 10,
  inscrito: true,
  puedePedirCobro: true,
  minimoDeCobroFormateado: '50,00 €',
  cobroSolicitado: false,
  codigos: [{ id: 'k1', codigo: 'ANA', clics: 12, camino: '/?ref=ANA' }],
  estadisticas: {
    clics: 12,
    conversiones: 2,
    pendienteFormateado: '12,50 €',
    aprobadoFormateado: '5,00 €',
    pagadoFormateado: '0,00 €',
  },
  comisiones: [],
  ...parcial,
});

const PERFIL: PerfilDeCobro = {
  metodoPreferido: 'WALLET',
  tieneBanco: false,
  tienePaypal: false,
};

describe('AfiliadoPage', () => {
  const consulta = { ejecuta: vi.fn(), inscribe: vi.fn(), creaCodigo: vi.fn() };
  const cobro = { consultaPerfil: vi.fn(), guardaPerfil: vi.fn(), solicita: vi.fn() };
  const avisos = { exito: vi.fn(), error: vi.fn() };

  const monta = () =>
    render(AfiliadoPage, {
      providers: [
        { provide: ConsultaPanelDeAfiliado, useValue: consulta },
        { provide: GestionaCobro, useValue: cobro },
        { provide: AvisosStore, useValue: avisos },
      ],
    });

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
    cobro.consultaPerfil.mockResolvedValue(exito(PERFIL));
  });

  /** Sin el alta explícita no hay panel: hay una invitación con lo que se gana y lo que se acepta. */
  it('sin inscribir enseña la invitación con el alta apagada hasta aceptar', async () => {
    consulta.ejecuta.mockResolvedValue(exito(panel({ inscrito: false })));

    await monta();

    const alta = await screen.findByRole('button', { name: /Solicitar acceso/ });
    expect(alta).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    expect(alta).toBeEnabled();
  });

  it('al aceptar y pulsar, se inscribe', async () => {
    consulta.ejecuta.mockResolvedValue(exito(panel({ inscrito: false })));
    consulta.inscribe.mockResolvedValue(exito(panel()));

    await monta();
    await userEvent.click(await screen.findByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /Solicitar acceso/ }));

    expect(consulta.inscribe).toHaveBeenCalled();
  });

  it('una solicitud aún sin aprobar dice que está en revisión', async () => {
    consulta.ejecuta.mockResolvedValue(exito(panel({ estado: 'PENDING' })));

    await monta();

    expect(await screen.findByText('Solicitud pendiente de aprobación')).toBeInTheDocument();
  });

  it('una cuenta suspendida lo dice y no enseña el panel', async () => {
    consulta.ejecuta.mockResolvedValue(exito(panel({ estado: 'SUSPENDED' })));

    await monta();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Tus enlaces de referido')).toBeNull();
  });

  it('el panel enseña los indicadores y el enlace de referido', async () => {
    consulta.ejecuta.mockResolvedValue(exito(panel()));

    await monta();

    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText(/\/\?ref=ANA/)).toBeInTheDocument();
  });

  /**
   * Sin aviso, un rechazo dejaba la pantalla exactamente igual y el afiliado volvía a pulsar creyendo
   * que no había hecho bien el clic.
   */
  it('avisa cuando el servidor rechaza crear un enlace', async () => {
    consulta.ejecuta.mockResolvedValue(exito(panel()));
    consulta.creaCodigo.mockResolvedValue(fallo(creaError('conflicto', 'Demasiados enlaces')));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: /Nuevo enlace/ }));

    expect(avisos.error).toHaveBeenCalledWith('Demasiados enlaces');
  });

  it('tras crear un enlace vuelve a leer el panel, que trae los recuentos', async () => {
    consulta.ejecuta.mockResolvedValue(exito(panel()));
    consulta.creaCodigo.mockResolvedValue(exito({ id: 'k2', codigo: 'B', clics: 0, camino: '/' }));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: /Nuevo enlace/ }));

    expect(consulta.ejecuta).toHaveBeenCalledTimes(2);
  });

  /** Solicitar NO paga: el cobro lo ejecuta un administrador fuera de la aplicación. */
  it('solicitar el cobro solo deja constancia y lo confirma', async () => {
    consulta.ejecuta.mockResolvedValue(exito(panel()));
    cobro.solicita.mockResolvedValue(exito(undefined));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: /Solicitar pago/ }));

    expect(cobro.solicita).toHaveBeenCalledWith('WALLET');
    expect(avisos.exito).toHaveBeenCalled();
  });

  it('sin llegar al mínimo no se puede solicitar', async () => {
    consulta.ejecuta.mockResolvedValue(exito(panel({ puedePedirCobro: false })));

    await monta();

    expect(await screen.findByRole('button', { name: /Solicitar pago/ })).toBeDisabled();
  });

  it('con el cobro ya pedido se dice, en vez de dejar pedirlo otra vez', async () => {
    consulta.ejecuta.mockResolvedValue(exito(panel({ cobroSolicitado: true })));

    await monta();
    await screen.findByText(/\/\?ref=ANA/);

    expect(screen.queryByRole('button', { name: /Solicitar pago/ })).toBeNull();
  });

  it('una contraseña incorrecta se explica con su propio mensaje', async () => {
    consulta.ejecuta.mockResolvedValue(exito(panel()));
    cobro.guardaPerfil.mockResolvedValue(fallo(creaError('peticion-invalida', 'no', { codigo: 'INVALID_PASSWORD' })));

    await monta();
    await userEvent.type(await screen.findByLabelText(/Contraseña/), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar datos de cobro' }));

    expect(avisos.error).toHaveBeenCalledWith('Contraseña incorrecta');
  });

  it('un IBAN inválido también', async () => {
    consulta.ejecuta.mockResolvedValue(exito(panel()));
    cobro.guardaPerfil.mockResolvedValue(fallo(creaError('peticion-invalida', 'no', { codigo: 'INVALID_IBAN' })));

    await monta();
    await userEvent.type(await screen.findByLabelText(/Contraseña/), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar datos de cobro' }));

    expect(avisos.error).toHaveBeenCalledWith('IBAN no válido');
  });

  it('al guardar bien lo confirma y olvida la contraseña tecleada', async () => {
    consulta.ejecuta.mockResolvedValue(exito(panel()));
    cobro.guardaPerfil.mockResolvedValue(exito(PERFIL));

    await monta();
    const clave = await screen.findByLabelText(/Contraseña/);
    await userEvent.type(clave, 'secreta');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar datos de cobro' }));

    expect(avisos.exito).toHaveBeenCalled();
    expect(clave).toHaveValue('');
  });

  /** El perfil es opcional: sin él se pinta el panel igual. */
  it('un fallo al leer el perfil de cobro no impide ver el panel', async () => {
    consulta.ejecuta.mockResolvedValue(exito(panel()));
    cobro.consultaPerfil.mockResolvedValue(fallo(creaError('sin-conexion')));

    await monta();

    expect(await screen.findByText(/\/\?ref=ANA/)).toBeInTheDocument();
    expect(screen.queryByText('Datos de cobro')).toBeNull();
  });
});
