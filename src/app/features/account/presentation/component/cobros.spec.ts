import { TestBed } from '@angular/core/testing';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { CampoDeTarjeta, METODOS_DE_PAGO_PORT, PASARELA_DE_TARJETA_PORT } from '../../domain/port/cobros.port';
import { AltaDeTarjeta } from './alta-de-tarjeta';
import { AltaDePaypal } from './alta-de-paypal';
import { BajaDeMetodo } from './baja-de-metodo';
import { MetodosDePago } from './metodos-de-pago';

const ACTIVA = { clavePublicable: 'pk_test', activo: true, pruebaGratisGastada: false };

const VISA = {
  referencia: 'pm_1',
  tipo: 'TARJETA' as const,
  marca: 'visa',
  ultimosCuatro: '4242',
  mesDeCaducidad: 7,
  anioDeCaducidad: 2028,
  porDefecto: true,
};

const PAYPAL = {
  referencia: 'paypal:1',
  tipo: 'PAYPAL' as const,
  correoPaypal: 'a***@nx036.test',
  porDefecto: false,
};

function metodosDoble(sobrescribe: Record<string, unknown> = {}) {
  return {
    configuracion: vi.fn().mockResolvedValue(exito(ACTIVA)),
    lista: vi.fn().mockResolvedValue(exito([VISA, PAYPAL])),
    marcaPorDefecto: vi.fn().mockResolvedValue(exito(undefined)),
    guardaPaypal: vi.fn().mockResolvedValue(exito(undefined)),
    pideCodigoDeBaja: vi.fn().mockResolvedValue(exito(undefined)),
    elimina: vi.fn().mockResolvedValue(exito(undefined)),
    abreAltaDeTarjeta: vi.fn().mockResolvedValue(exito('seti_1')),
    ...sobrescribe,
  };
}

function campoDoble(): CampoDeTarjeta {
  return {
    confirmaAlta: vi.fn().mockResolvedValue(exito(undefined)),
    limpia: vi.fn(),
    destruye: vi.fn(),
  };
}

describe('AltaDeTarjeta', () => {
  async function monta(pasarela: unknown, metodos = metodosDoble()) {
    const vista = await render(AltaDeTarjeta, {
      inputs: { clavePublicable: 'pk_test' },
      providers: [
        { provide: METODOS_DE_PAGO_PORT, useValue: metodos },
        { provide: PASARELA_DE_TARJETA_PORT, useValue: pasarela },
      ],
    });
    vista.fixture.detectChanges();
    return vista;
  }

  /** La pantalla pide un hueco y recibe un manejador: no sabe qué pasarela hay detrás. */
  it('monta el campo de la pasarela en su hueco al aparecer', async () => {
    const monta_ = vi.fn().mockResolvedValue(exito(campoDoble()));

    await monta({ monta: monta_ });

    await waitFor(() => expect(monta_).toHaveBeenCalled());
    expect(monta_.mock.calls[0][1]).toBe('pk_test');
  });

  it('sin titular el botón no se puede pulsar', async () => {
    await monta({ monta: vi.fn().mockResolvedValue(exito(campoDoble())) });
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByRole('button', { name: new RegExp(t('profile.billing.save_card')) })).toBeDisabled();
  });

  it('al escribir el titular y guardar, confirma el alta con el secreto del servidor', async () => {
    const usuario = userEvent.setup({ delay: null });
    const campo = campoDoble();
    const metodos = metodosDoble();
    const vista = await monta({ monta: vi.fn().mockResolvedValue(exito(campo)) }, metodos);
    const t = TestBed.inject(TraduccionService).t;
    await waitFor(() => expect(screen.getByRole('button', { name: new RegExp(t('profile.billing.save_card')) })).toBeInTheDocument());

    await usuario.type(screen.getByLabelText(new RegExp(t('profile.billing.card_name'))), 'Ana Pérez');
    vista.fixture.detectChanges();
    await usuario.click(screen.getByRole('button', { name: new RegExp(t('profile.billing.save_card')) }));

    await waitFor(() => expect(campo.confirmaAlta).toHaveBeenCalledWith('seti_1', 'Ana Pérez'));
    expect(metodos.lista).toHaveBeenCalled();
  });

  /** El mensaje de la pasarela ya viene redactado y dice qué corregir: no se sustituye por uno genérico. */
  it('enseña el motivo con el que la pasarela rechaza la tarjeta', async () => {
    const usuario = userEvent.setup({ delay: null });
    const campo = campoDoble();
    (campo.confirmaAlta as ReturnType<typeof vi.fn>).mockResolvedValue(
      fallo(creaError('peticion-invalida', 'Tarjeta caducada')),
    );
    const vista = await monta({ monta: vi.fn().mockResolvedValue(exito(campo)) });
    const t = TestBed.inject(TraduccionService).t;

    await usuario.type(screen.getByLabelText(new RegExp(t('profile.billing.card_name'))), 'Ana');
    vista.fixture.detectChanges();
    await usuario.click(screen.getByRole('button', { name: new RegExp(t('profile.billing.save_card')) }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Tarjeta caducada'));
  });

  /** Un bloqueador de scripts deja la sección sin campo; el resto del perfil sigue siendo utilizable. */
  it('si el campo no se puede montar, avisa y no rompe la pantalla', async () => {
    const vista = await monta({ monta: vi.fn().mockResolvedValue(fallo(creaError('sin-conexion'))) });
    const t = TestBed.inject(TraduccionService).t;

    await waitFor(() => vista.fixture.detectChanges());
    expect(screen.getByRole('alert')).toHaveTextContent(t('profile.billing.error'));
  });
});

describe('AltaDePaypal', () => {
  it('el botón espera a que haya un correo escrito', async () => {
    const usuario = userEvent.setup({ delay: null });
    const metodos = metodosDoble();
    await render(AltaDePaypal, {
      providers: [{ provide: METODOS_DE_PAGO_PORT, useValue: metodos }],
    });
    const t = TestBed.inject(TraduccionService).t;

    const guardar = screen.getByRole('button', { name: new RegExp(t('profile.billing.save_paypal')) });
    expect(guardar).toBeDisabled();

    await usuario.type(screen.getByLabelText(new RegExp(t('profile.billing.add_paypal'))), 'ana@nx036.test');
    expect(guardar).toBeEnabled();

    await usuario.click(guardar);
    await waitFor(() => expect(metodos.guardaPaypal).toHaveBeenCalledWith('ana@nx036.test'));
  });

  it('si el servidor rechaza el correo, se avisa sin vaciar lo escrito', async () => {
    const usuario = userEvent.setup({ delay: null });
    const metodos = metodosDoble({
      guardaPaypal: vi.fn().mockResolvedValue(fallo(creaError('peticion-invalida', 'Correo no válido'))),
    });
    await render(AltaDePaypal, {
      providers: [{ provide: METODOS_DE_PAGO_PORT, useValue: metodos }],
    });
    const t = TestBed.inject(TraduccionService).t;

    await usuario.type(screen.getByLabelText(new RegExp(t('profile.billing.add_paypal'))), 'x@y.z');
    await usuario.click(screen.getByRole('button', { name: new RegExp(t('profile.billing.save_paypal')) }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Correo no válido'));
    expect(screen.getByLabelText(new RegExp(t('profile.billing.add_paypal')))).toHaveValue('x@y.z');
  });
});

describe('BajaDeMetodo', () => {
  async function monta(metodos = metodosDoble()) {
    const vista = await render(BajaDeMetodo, {
      inputs: { referencia: 'pm_1' },
      providers: [{ provide: METODOS_DE_PAGO_PORT, useValue: metodos }],
    });
    vista.fixture.detectChanges();
    return vista;
  }

  it('no deja confirmar hasta que hay seis dígitos', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    const confirmar = screen.getByRole('button', { name: t('common.confirm') });
    expect(confirmar).toBeDisabled();

    await usuario.type(screen.getByLabelText(t('profile.billing.code_placeholder')), '12345');
    expect(confirmar).toBeDisabled();

    await usuario.type(screen.getByLabelText(t('profile.billing.code_placeholder')), '6');
    expect(confirmar).toBeEnabled();
  });

  /** El código es numérico: filtrar mientras se escribe evita un rechazo por un guion que ni se ve. */
  it('descarta lo que no sea un dígito mientras se teclea', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    await usuario.type(screen.getByLabelText(t('profile.billing.code_placeholder')), '12-34');

    expect(screen.getByLabelText(t('profile.billing.code_placeholder'))).toHaveValue('1234');
  });

  it('un código rechazado se cuenta con el mensaje del servidor', async () => {
    const usuario = userEvent.setup({ delay: null });
    const metodos = metodosDoble({
      elimina: vi.fn().mockResolvedValue(fallo(creaError('peticion-invalida', 'Código caducado'))),
    });
    await monta(metodos);
    const t = TestBed.inject(TraduccionService).t;

    await usuario.type(screen.getByLabelText(t('profile.billing.code_placeholder')), '123456');
    await usuario.click(screen.getByRole('button', { name: t('common.confirm') }));

    await waitFor(() => expect(screen.getByText('Código caducado')).toBeInTheDocument());
  });
});

describe('MetodosDePago', () => {
  async function monta(metodos = metodosDoble()) {
    const vista = await render(MetodosDePago, {
      providers: [
        { provide: METODOS_DE_PAGO_PORT, useValue: metodos },
        { provide: PASARELA_DE_TARJETA_PORT, useValue: { monta: vi.fn().mockResolvedValue(exito(campoDoble())) } },
      ],
    });
    await waitFor(() => expect(metodos.configuracion).toHaveBeenCalled());
    vista.fixture.detectChanges();
    return vista;
  }

  /** Un rótulo de sección vacía solo sirve para que alguien pregunte por qué no funciona. */
  it('sin pasarela activa no pinta nada', async () => {
    const metodos = metodosDoble({
      configuracion: vi.fn().mockResolvedValue(exito({ ...ACTIVA, activo: false })),
    });
    const vista = await monta(metodos);
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.queryByText(t('profile.section.billing'))).toBeNull();
    expect(vista.container.textContent?.trim()).toBe('');
  });

  it('enseña la tarjeta con su marca y sus cuatro últimos, y PayPal con su correo', async () => {
    await monta();

    expect(screen.getByText('visa')).toBeInTheDocument();
    expect(screen.getByText('•••• 4242')).toBeInTheDocument();
    expect(screen.getByText('· 07/2028')).toBeInTheDocument();
    expect(screen.getByText('· a***@nx036.test')).toBeInTheDocument();
  });

  it('solo ofrece marcar por defecto el que no lo es', async () => {
    const usuario = userEvent.setup({ delay: null });
    const metodos = metodosDoble();
    await monta(metodos);
    const t = TestBed.inject(TraduccionService).t;

    const botones = screen.getAllByRole('button', { name: t('profile.billing.set_default') });
    expect(botones).toHaveLength(1);

    await usuario.click(botones[0]);
    await waitFor(() => expect(metodos.marcaPorDefecto).toHaveBeenCalledWith('paypal:1'));
  });

  it('borrar es en dos pasos: primero se pide el código por correo', async () => {
    const usuario = userEvent.setup({ delay: null });
    const metodos = metodosDoble();
    const vista = await monta(metodos);
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getAllByRole('button', { name: t('profile.billing.delete') })[0]);

    await waitFor(() => expect(metodos.pideCodigoDeBaja).toHaveBeenCalledWith('pm_1'));
    expect(metodos.elimina).not.toHaveBeenCalled();
    vista.fixture.detectChanges();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  /**
   * Sin este aviso, un rechazo del servidor dejaba la pantalla igual que antes de pulsar: se volvía a
   * pulsar, otra vez sin efecto, y se acababa sin saber qué método está puesto.
   */
  it('si marcar por defecto falla, se avisa', async () => {
    const usuario = userEvent.setup({ delay: null });
    const metodos = metodosDoble({
      marcaPorDefecto: vi.fn().mockResolvedValue(fallo(creaError('conflicto', 'No se pudo'))),
    });
    await monta(metodos);
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: t('profile.billing.set_default') }));

    await waitFor(() => expect(TestBed.inject(DialogoStore).actual()?.mensaje).toBe('No se pudo'));
  });

  it('sin ningún método guardado lo dice', async () => {
    const metodos = metodosDoble({ lista: vi.fn().mockResolvedValue(exito([])) });
    await monta(metodos);
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByText(t('profile.billing.empty'))).toBeInTheDocument();
  });
});
