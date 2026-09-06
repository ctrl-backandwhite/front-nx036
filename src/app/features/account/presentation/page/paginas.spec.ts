import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { USUARIO_ACTUAL_PORT } from '@features/auth/domain/port/autenticacion.port';
import { Usuario } from '@features/auth/domain/model/usuario';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { Direccion } from '../../domain/model/direccion';
import { Plan } from '../../domain/model/plan';
import { AYUDA_DE_DIRECCION_PORT, DIRECCIONES_PORT } from '../../domain/port/direcciones.port';
import { FACTURAS_PORT, PLANES_PORT } from '../../domain/port/planes.port';
import { METODOS_DE_PAGO_PORT, PASARELA_DE_TARJETA_PORT } from '../../domain/port/cobros.port';
import {
  BAJA_DE_CUENTA_PORT,
  FIN_DE_SESION_PORT,
  PERFIL_PORT,
  PORTABILIDAD_PORT,
} from '../../domain/port/perfil.port';
import { DESCARGA_PORT } from '../../domain/port/descarga.port';
import {
  CODIGO_QR_PORT,
  DOBLE_FACTOR_PORT,
  SESIONES_ACTIVAS_PORT,
} from '../../domain/port/seguridad.port';
import { CuentaStore } from '../../application/state/cuenta.store';
import { PerfilPage } from './perfil.page';
import { DireccionesPage } from './direcciones.page';
import { PlanesPage } from './planes.page';

@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

const TITULAR: Usuario = {
  id: 'u-1',
  email: 'ana@nx036.test',
  rol: 'USER',
  activo: true,
  nombre: 'Ana',
  pais: 'ES',
  idioma: 'es',
  creadoEl: '2026-01-01T00:00:00Z',
  permisos: [],
};

const CASA: Direccion = {
  id: 'dir-1',
  etiqueta: 'Casa',
  nombreCompleto: 'Ana Pérez',
  linea1: 'Calle Mayor 1',
  ciudad: 'Madrid',
  pais: 'ES',
  porDefecto: true,
  creadaEl: '2026-01-01T00:00:00Z',
};

const PRO: Plan = {
  id: 'plan-pro',
  codigo: 'PRO',
  nombre: 'Pro',
  descripcion: 'Para vender en serio',
  centimosMensuales: 2900,
  centimosAnuales: 29000,
  precioMensualFormateado: '29,00 €',
  precioAnualFormateado: '290,00 €',
  posicion: 3,
  limites: { products: 1000 },
};

/** Todos los puertos del contexto, doblados. Cada prueba sobrescribe los que le importan. */
function puertos(sobrescribe: Record<string, unknown> = {}) {
  const doble = {
    perfil: { actualiza: vi.fn().mockResolvedValue(exito(undefined)), cambiaContrasena: vi.fn() },
    direcciones: {
      lista: vi.fn().mockResolvedValue(exito([CASA])),
      crea: vi.fn().mockResolvedValue(exito(CASA)),
      actualiza: vi.fn().mockResolvedValue(exito(CASA)),
      elimina: vi.fn().mockResolvedValue(exito(undefined)),
    },
    ayuda: {
      provincias: vi.fn().mockResolvedValue(exito([])),
      formatoPostal: vi.fn().mockResolvedValue(fallo(creaError('no-encontrado'))),
    },
    metodos: {
      configuracion: vi.fn().mockResolvedValue(exito({ clavePublicable: '', activo: false, pruebaGratisGastada: false })),
      lista: vi.fn().mockResolvedValue(exito([])),
      marcaPorDefecto: vi.fn(),
      guardaPaypal: vi.fn(),
      pideCodigoDeBaja: vi.fn(),
      elimina: vi.fn(),
      abreAltaDeTarjeta: vi.fn(),
    },
    planes: {
      lista: vi.fn().mockResolvedValue(exito([PRO])),
      suscripcionActual: vi.fn().mockResolvedValue(exito(null)),
      contrata: vi.fn(),
      cancela: vi.fn(),
    },
    facturas: { lista: vi.fn().mockResolvedValue(exito([])), descarga: vi.fn() },
    seguridad: {
      estaActivo: vi.fn().mockResolvedValue(exito(false)),
      inicia: vi.fn(),
      verifica: vi.fn(),
      desactiva: vi.fn(),
      lista: vi.fn().mockResolvedValue(exito([])),
      revoca: vi.fn(),
    },
    ...sobrescribe,
  };
  return {
    doble,
    providers: [
      { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
      { provide: PERFIL_PORT, useValue: doble.perfil },
      { provide: USUARIO_ACTUAL_PORT, useValue: { consulta: vi.fn().mockResolvedValue(exito(TITULAR)), actualiza: vi.fn() } },
      { provide: BAJA_DE_CUENTA_PORT, useValue: { solicita: vi.fn(), confirma: vi.fn() } },
      { provide: PORTABILIDAD_PORT, useValue: { exporta: vi.fn() } },
      { provide: FIN_DE_SESION_PORT, useValue: { termina: vi.fn() } },
      { provide: DESCARGA_PORT, useValue: { entrega: vi.fn() } },
      { provide: DIRECCIONES_PORT, useValue: doble.direcciones },
      { provide: AYUDA_DE_DIRECCION_PORT, useValue: doble.ayuda },
      { provide: METODOS_DE_PAGO_PORT, useValue: doble.metodos },
      { provide: PASARELA_DE_TARJETA_PORT, useValue: { monta: vi.fn() } },
      { provide: PLANES_PORT, useValue: doble.planes },
      { provide: FACTURAS_PORT, useValue: doble.facturas },
      { provide: DOBLE_FACTOR_PORT, useValue: doble.seguridad },
      { provide: SESIONES_ACTIVAS_PORT, useValue: doble.seguridad },
      { provide: CODIGO_QR_PORT, useValue: { dibuja: vi.fn().mockResolvedValue(null) } },
    ],
  };
}

describe('PerfilPage', () => {
  async function monta(seccion?: string) {
    const { providers } = puertos();
    const vista = await render(PerfilPage, {
      providers: [provideRouter([{ path: '**', component: Vacia }]), ...providers],
      inputs: seccion ? { section: seccion } : {},
    });
    TestBed.inject(CuentaStore).fija(TITULAR);
    vista.fixture.detectChanges();
    return vista;
  }

  /** Sin saber quién mira no se pinta el perfil de nadie. */
  it('mientras no se sabe quién mira, solo se anuncia que está cargando', async () => {
    const { providers } = puertos();
    const vista = await render(PerfilPage, {
      providers: [provideRouter([{ path: '**', component: Vacia }]), ...providers],
    });
    const t = TestBed.inject(TraduccionService).t;
    vista.fixture.detectChanges();

    expect(screen.getByText(t('common.loading'))).toBeInTheDocument();
  });

  it('empieza en los datos personales', async () => {
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByLabelText(t('profile.first_name'))).toBeInTheDocument();
  });

  /** La sección vive en la dirección: al recargar se mantiene la misma vista. */
  it('abre la sección que pida la dirección', async () => {
    await monta('addresses');
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByRole('button', { name: new RegExp(t('profile.addresses.add')) })).toBeInTheDocument();
  });

  it('una sección inventada cae en la primera, no en una pantalla en blanco', async () => {
    await monta('lo-que-sea');
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByLabelText(t('profile.first_name'))).toBeInTheDocument();
  });

  it('al elegir otra sección la escribe en la dirección', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('profile.section.security')) }));

    await waitFor(() => expect(TestBed.inject(Router).url).toContain('section=security'));
  });

  it('la zona de peligro se marca aparte del resto del menú', async () => {
    await monta('danger');
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByText(t('profile.export.title'))).toBeInTheDocument();
  });
});

describe('DireccionesPage', () => {
  async function monta(sobrescribe: Record<string, unknown> = {}) {
    const { doble, providers } = puertos(sobrescribe);
    const vista = await render(DireccionesPage, {
      providers: [provideRouter([{ path: '**', component: Vacia }]), ...providers],
    });
    await waitFor(() => expect(doble.direcciones.lista).toHaveBeenCalled());
    vista.fixture.detectChanges();
    return { vista, doble };
  }

  it('enseña las direcciones guardadas', async () => {
    await monta();

    expect(screen.getByText('Casa')).toBeInTheDocument();
  });

  it('sin ninguna, invita a crear la primera', async () => {
    await monta({
      direcciones: {
        lista: vi.fn().mockResolvedValue(exito([])),
        crea: vi.fn(),
        actualiza: vi.fn(),
        elimina: vi.fn(),
      },
    });
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByText(t('addresses.empty_title'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(t('addresses.add_first')) })).toBeInTheDocument();
  });

  it('abrir el formulario esconde la lista y el botón de añadir', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('addresses.add_new')) }));

    expect(screen.getByText(t('addresses.new_title'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: new RegExp(t('addresses.add_new')) })).toBeNull();
  });

  it('editar parte de los datos guardados', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('common.edit')) }));

    expect(screen.getByText(t('addresses.edit_title'))).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: t('checkout.full_name') })).toHaveValue('Ana Pérez');
  });

  /** Cerrarlo obligaría a escribir la dirección entera otra vez solo por un dato que no cuadraba. */
  it('si el servidor rechaza, el formulario sigue abierto con lo tecleado', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { doble } = await monta();
    doble.direcciones.actualiza.mockResolvedValue(fallo(creaError('peticion-invalida', 'Falta el código postal')));
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('common.edit')) }));
    await usuario.click(screen.getByRole('button', { name: t('profile.update') }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Falta el código postal'));
    expect(screen.getByRole('textbox', { name: t('checkout.full_name') })).toHaveValue('Ana Pérez');
  });

  it('borrar pide confirmación y avisa si el servidor dice que no', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { doble } = await monta();
    doble.direcciones.elimina.mockResolvedValue(fallo(creaError('conflicto', 'Está en uso')));
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('common.delete')) }));
    TestBed.inject(DialogoStore).cierra(true);

    await waitFor(() => expect(TestBed.inject(DialogoStore).actual()?.mensaje).toBe('Está en uso'));
  });
});

describe('PlanesPage', () => {
  async function monta(conSesion: boolean) {
    const { doble, providers } = puertos();
    // La credencial tiene que estar ANTES de montar: la pantalla la lee al construirse para decidir a
    // dónde lleva el botón. Se siembra en el almacén, que es de donde la saca el testigo de sesión.
    const almacen = {
      lee: (clave: string) => (conSesion && clave === 'nx-access-token' ? 'testigo' : null),
      guarda: vi.fn(),
      borra: vi.fn(),
    };
    const vista = await render(PlanesPage, {
      providers: [
        provideRouter([{ path: '**', component: Vacia }]),
        ...providers,
        { provide: ALMACEN_LOCAL, useValue: almacen },
      ],
    });
    await waitFor(() => expect(doble.planes.lista).toHaveBeenCalled());
    vista.fixture.detectChanges();
    return { vista, doble };
  }

  it('la tarifa se ve sin haber entrado', async () => {
    await monta(false);

    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('29,00 €')).toBeInTheDocument();
  });

  /** El catálogo es público; la suscripción no. Sin sesión ni se pregunta. */
  it('sin sesión no pregunta por la suscripción e invita a entrar', async () => {
    const { doble } = await monta(false);
    const t = TestBed.inject(TraduccionService).t;

    expect(doble.planes.suscripcionActual).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: t('plans.login_to_subscribe') })).toHaveAttribute('href', '/login');
  });

  it('con sesión lleva al perfil, que es donde se contrata', async () => {
    await monta(true);
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByRole('link', { name: t('plans.go_contract') })).toHaveAttribute('href', '/profile');
  });

  it('enseña los límites del plan', async () => {
    await monta(false);
    // El separador de miles depende del idioma activo: se compara contra el mismo formato, no contra
    // una cadena fija, para que la prueba no dependa del entorno donde corre.
    const idioma = TestBed.inject(TraduccionService).idioma();

    expect(screen.getByText((1000).toLocaleString(idioma))).toBeInTheDocument();
  });
});
