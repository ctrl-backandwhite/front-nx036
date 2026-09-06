import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { COOKIE_IDIOMA } from '@core/preferences/preferencias';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import {
  ALMACENES_ADMIN_PORT,
  CUMPLIMIENTO_PORT,
  IMPUESTOS_PORT,
  LIMITES_DE_TRANSPORTISTA_PORT,
} from '../../../domain/logistica/port/configuracion-logistica.port';
import {
  MIS_GANANCIAS_PORT,
  REPORTE_DE_OPERADORES_PORT,
} from '../../../domain/logistica/port/operadores.port';
import { limiteEnBlanco } from '../../../domain/logistica/model/limite-transportista';
import { QuienMiraStore } from '../../../application/logistica/state/quien-mira.store';
import {
  AlternaLimiteDeTransportista,
  AplicaLoteDeAlmacenes,
  BorraAlmacen,
  BorraLimiteDeTransportista,
  ConsultaAlmacenes,
  ConsultaLimitesDeTransportista,
  GuardaAlmacen,
  GuardaLimiteDeTransportista,
} from '../../../application/logistica/use-case/configura-logistica.use-case';
import {
  AlternaImpuestoDePais,
  AlternaRegionFiscal,
  BorraImpuestoDePais,
  BorraRegionFiscal,
  ConsultaImpuestos,
  GuardaImpuestoDePais,
  GuardaRegionFiscal,
} from '../../../application/logistica/use-case/gestiona-impuestos.use-case';
import {
  ConsultaCumplimiento,
  GuardaOperadorEconomico,
} from '../../../application/logistica/use-case/gestiona-cumplimiento.use-case';
import {
  ConsultaMisGanancias,
  ConsultaReporteDeOperadores,
  ReindexaOperaciones,
} from '../../../application/logistica/use-case/consulta-ganancias.use-case';
import { LimitesDeTransportistaPage } from './limites-de-transportista.page';
import { AlmacenesPage } from './almacenes.page';
import { ImpuestosPage } from './impuestos.page';
import { CumplimientoPage } from './cumplimiento.page';
import { OperadoresPage } from './operadores.page';
import { GananciasDeOperadorPage } from './ganancias-de-operador.page';

/**
 * Montar la pantalla entera con su tabla y sus diálogos tarda más que el plazo por defecto, sobre todo
 * en la primera prueba del fichero, que además compila la plantilla. Se amplía para el fichero entero:
 * un plazo corto aquí solo produce fallos que no señalan ningún defecto.
 */
vi.setConfig({ testTimeout: 30_000 });

beforeEach(() => {
  document.cookie = `${COOKIE_IDIOMA}=es; Path=/`;
});

describe('LimitesDeTransportistaPage', () => {
  function puertoDeLimites() {
    return {
      lista: vi.fn().mockResolvedValue(
        exito([
          { ...limiteEnBlanco(), canal: 'FZZXR', pais: '*', pesoMaximoGramos: 2000 },
          { ...limiteEnBlanco(), canal: 'OTRO', pais: 'ES', activo: false },
        ]),
      ),
      guarda: vi.fn().mockResolvedValue(exito(undefined)),
      borra: vi.fn().mockResolvedValue(exito(undefined)),
    };
  }

  async function monta(puerto = puertoDeLimites()) {
    const vista = await render(LimitesDeTransportistaPage, {
      providers: [
        ConsultaLimitesDeTransportista,
        GuardaLimiteDeTransportista,
        AlternaLimiteDeTransportista,
        BorraLimiteDeTransportista,
        { provide: LIMITES_DE_TRANSPORTISTA_PORT, useValue: puerto },
      ],
    });
    await waitFor(() => expect(puerto.lista).toHaveBeenCalled());
    vista.fixture.detectChanges();
    return { ...vista, puerto };
  }

  it('pinta el peso máximo en kilos y nombra el comodín en vez de enseñar el asterisco', async () => {
    await monta();

    expect(await screen.findByText('2 kg')).toBeInTheDocument();
    expect(screen.queryByText('*')).toBeNull();
  });

  it('alternar la vigencia conserva el resto de la fila', async () => {
    const { puerto } = await monta();

    await userEvent.click(screen.getAllByRole('button', { name: /Desactivar|Activar/i })[0]);

    await waitFor(() =>
      expect(puerto.guarda).toHaveBeenCalledWith(
        expect.objectContaining({ canal: 'FZZXR', activo: false, pesoMaximoGramos: 2000 }),
      ),
    );
  });

  it('borrar se confirma antes', async () => {
    const { puerto } = await monta();
    vi.spyOn(TestBed.inject(DialogoStore), 'confirma').mockResolvedValue(true);

    await userEvent.click(screen.getAllByRole('button', { name: /Eliminar/i })[0]);

    await waitFor(() => expect(puerto.borra).toHaveBeenCalledWith('FZZXR', '*'));
  });

  it('cancelar la confirmación no borra nada', async () => {
    const { puerto } = await monta();
    vi.spyOn(TestBed.inject(DialogoStore), 'confirma').mockResolvedValue(false);

    await userEvent.click(screen.getAllByRole('button', { name: /Eliminar/i })[0]);

    await waitFor(() => expect(puerto.borra).not.toHaveBeenCalled());
  });

  it('el alta abre el formulario con el comodín ya marcado', async () => {
    await monta();

    await userEvent.click(screen.getByRole('button', { name: /Añadir|Nuevo|Nueva/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('un fallo al listar se avisa', async () => {
    const puerto = puertoDeLimites();
    puerto.lista.mockResolvedValue(fallo(creaError('sin-conexion', 'sin red')));
    await monta(puerto);

    await waitFor(() =>
      expect(TestBed.inject(AvisosStore).avisos().some((a) => a.tipo === 'error')).toBe(true),
    );
  });
});

describe('AlmacenesPage', () => {
  function puertoDeAlmacenes() {
    return {
      lista: vi
        .fn()
        .mockResolvedValue(exito([{ id: 'a1', codigo: 'ES-MAD', nombre: 'Madrid', activo: true }])),
      crea: vi.fn().mockResolvedValue(exito(undefined)),
      actualiza: vi.fn().mockResolvedValue(exito(undefined)),
      borra: vi.fn().mockResolvedValue(exito(undefined)),
    };
  }

  async function monta(puerto = puertoDeAlmacenes()) {
    const vista = await render(AlmacenesPage, {
      providers: [
        ConsultaAlmacenes,
        GuardaAlmacen,
        BorraAlmacen,
        AplicaLoteDeAlmacenes,
        { provide: ALMACENES_ADMIN_PORT, useValue: puerto },
      ],
    });
    await waitFor(() => expect(puerto.lista).toHaveBeenCalled());
    vista.fixture.detectChanges();
    return { ...vista, puerto };
  }

  it('pinta el código del almacén, que es el que se pega en la dirección del proveedor', async () => {
    await monta();

    expect(await screen.findByText('ES-MAD')).toBeInTheDocument();
  });

  it('sin nada marcado no ofrece acciones en lote', async () => {
    await monta();

    expect(screen.queryByRole('button', { name: /Eliminar/i })).not.toBeNull();
    expect(screen.queryByText(/seleccionad/i)).toBeNull();
  });

  it('el lote de desactivación escribe fila a fila y resume el parte', async () => {
    const { puerto } = await monta();

    await userEvent.click(await screen.findByRole('checkbox', { name: 'ES-MAD' }));
    await userEvent.click(screen.getAllByRole('button', { name: /Inactivo/i })[0]);

    await waitFor(() =>
      expect(puerto.actualiza).toHaveBeenCalledWith('a1', expect.objectContaining({ activo: false })),
    );
    await waitFor(() =>
      expect(TestBed.inject(AvisosStore).avisos().length).toBeGreaterThan(0),
    );
  });

  it('el borrado en lote se confirma antes', async () => {
    const { puerto } = await monta();
    vi.spyOn(TestBed.inject(DialogoStore), 'confirma').mockResolvedValue(false);

    await userEvent.click(await screen.findByRole('checkbox', { name: 'ES-MAD' }));
    await userEvent.click(screen.getAllByRole('button', { name: /Eliminar/i })[0]);

    await waitFor(() => expect(puerto.borra).not.toHaveBeenCalled());
  });

  it('editar abre el formulario relleno con lo guardado', async () => {
    await monta();

    await userEvent.click(await screen.findByRole('button', { name: /Editar/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ES-MAD')).toBeInTheDocument();
  });
});

describe('ImpuestosPage', () => {
  function puertoDeImpuestos() {
    return {
      lista: vi.fn().mockResolvedValue(
        exito([{ pais: 'ES', etiqueta: 'IVA', puntosBasicos: 2100, porcentaje: 21, activo: true }]),
      ),
      guarda: vi.fn().mockResolvedValue(exito(undefined)),
      borra: vi.fn().mockResolvedValue(exito(undefined)),
      regiones: vi.fn().mockResolvedValue(exito([])),
      guardaRegion: vi.fn().mockResolvedValue(exito(undefined)),
      borraRegion: vi.fn().mockResolvedValue(exito(undefined)),
    };
  }

  async function monta(puerto = puertoDeImpuestos()) {
    const vista = await render(ImpuestosPage, {
      providers: [
        ConsultaImpuestos,
        GuardaImpuestoDePais,
        AlternaImpuestoDePais,
        BorraImpuestoDePais,
        GuardaRegionFiscal,
        AlternaRegionFiscal,
        BorraRegionFiscal,
        { provide: IMPUESTOS_PORT, useValue: puerto },
      ],
    });
    await waitFor(() => expect(puerto.lista).toHaveBeenCalled());
    vista.fixture.detectChanges();
    return { ...vista, puerto };
  }

  it('pinta la tasa del país', async () => {
    await monta();

    expect(await screen.findByText('21%')).toBeInTheDocument();
  });

  /** Apagar el IVA de un país y que falle en silencio no se descubre hasta la liquidación. */
  it('un rechazo al alternar el impuesto se enseña', async () => {
    const { puerto } = await monta();
    puerto.guarda.mockResolvedValue(fallo(creaError('conflicto', 'no se puede apagar')));

    await userEvent.click(await screen.findByRole('button', { name: /Activo/i }));

    await waitFor(() =>
      expect(
        TestBed.inject(AvisosStore).avisos().some((a) => a.mensaje.includes('no se puede apagar')),
      ).toBe(true),
    );
  });

  /** Sin país no hay clave que guardar: el botón se apaga solo en vez de gastar la petición. */
  it('sin país elegido no deja guardar', async () => {
    await monta();

    expect(screen.getByRole('button', { name: /^Guardar/i })).toBeDisabled();
  });

  /**
   * De aquí sale lo que el backend COBRA en el checkout de ese país: un 250 % no es una configuración
   * exótica, es un dedo de más, y descubrirlo en la liquidación sale caro.
   */
  it('una tasa por encima del 100 % no se puede guardar', async () => {
    await monta();

    await userEvent.selectOptions(screen.getByLabelText(/País/i), 'ES');
    const tasa = screen.getByLabelText(/Tasa/i);
    await userEvent.clear(tasa);
    await userEvent.type(tasa, '250');

    expect(screen.getByRole('button', { name: /^Guardar/i })).toBeDisabled();
  });

  it('con país y tasa razonable ya se puede guardar', async () => {
    await monta();

    await userEvent.selectOptions(screen.getByLabelText(/País/i), 'FR');
    const tasa = screen.getByLabelText(/Tasa/i);
    await userEvent.clear(tasa);
    await userEvent.type(tasa, '20');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Guardar/i })).toBeEnabled(),
    );
  });

  it('abrir las regiones de un país las pide al backend', async () => {
    const { puerto } = await monta();

    await userEvent.click(await screen.findByRole('button', { name: /Regiones/i }));

    await waitFor(() => expect(puerto.regiones).toHaveBeenCalledWith('ES'));
  });

  it('sin regiones lo dice en vez de dejar la tabla muda', async () => {
    await monta();

    await userEvent.click(await screen.findByRole('button', { name: /Regiones/i }));

    expect(await screen.findByText(/no tiene regiones/i)).toBeInTheDocument();
  });
});

describe('CumplimientoPage', () => {
  function puertoDeCumplimiento() {
    return {
      operador: vi.fn().mockResolvedValue(exito(null)),
      guardaOperador: vi.fn().mockResolvedValue(exito(undefined)),
      papeles: vi
        .fn()
        .mockResolvedValue(exito([{ codigo: 'IMPORTER', etiqueta: 'Importador' }])),
      estado: vi.fn().mockResolvedValue(
        exito({ operadorPublicado: false, productosActivos: 12, sinFabricante: 3 }),
      ),
    };
  }

  async function monta(puerto = puertoDeCumplimiento()) {
    const vista = await render(CumplimientoPage, {
      providers: [
        provideRouter([]),
        ConsultaCumplimiento,
        GuardaOperadorEconomico,
        { provide: CUMPLIMIENTO_PORT, useValue: puerto },
      ],
    });
    await waitFor(() => expect(puerto.estado).toHaveBeenCalled());
    vista.fixture.detectChanges();
    return { ...vista, puerto };
  }

  it('enseña el estado del catálogo antes que el formulario', async () => {
    await monta();

    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  /** Publicar un bloque a medias incumple el artículo 19. */
  it('sin los datos del artículo 16.3 no se puede marcar «publicar»', async () => {
    await monta();

    const publicar = await screen.findByRole('checkbox');
    expect(publicar).toBeDisabled();
  });

  it('al completar los campos obligatorios se habilita publicar', async () => {
    await monta();

    await userEvent.type(await screen.findByLabelText(/Nombre \*/), 'NX036 SL');
    await userEvent.type(screen.getByLabelText(/Dirección \*/), 'C/ Mayor 1');
    await userEvent.type(screen.getByLabelText(/postal \*/i), '28001');
    await userEvent.type(screen.getByLabelText(/Ciudad \*/), 'Madrid');
    await userEvent.type(screen.getByLabelText(/electrónico \*/i), 'legal@nx036.test');

    await waitFor(() => expect(screen.getByRole('checkbox')).toBeEnabled());
  });

  it('guardar sin publicar sí se permite a medias', async () => {
    const { puerto } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => expect(puerto.guardaOperador).toHaveBeenCalled());
  });
});

describe('OperadoresPage', () => {
  async function monta(reporte: ReturnType<typeof vi.fn>) {
    const puerto = { reporte, reindexa: vi.fn() };
    const vista = await render(OperadoresPage, {
      providers: [
        ConsultaReporteDeOperadores,
        { provide: REPORTE_DE_OPERADORES_PORT, useValue: puerto },
      ],
    });
    await waitFor(() => expect(reporte).toHaveBeenCalled());
    vista.fixture.detectChanges();
    return vista;
  }

  it('suma los totales de todos los operadores', async () => {
    await monta(
      vi.fn().mockResolvedValue(
        exito([
          { operador: 's1', nombre: 'Ana', operaciones: 3, comisionCentimosCny: 1000 },
          { operador: 's2', email: 'b@x.test', operaciones: 2, comisionCentimosCny: 500 },
        ]),
      ),
    );

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    // Sin nombre se cae al correo, que al menos identifica a alguien.
    expect(screen.getAllByText('b@x.test').length).toBeGreaterThan(0);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  /** «Sin operaciones» y «no se pudo consultar» son cosas distintas. */
  it('un fallo se avisa en vez de pintarse como una tabla vacía', async () => {
    await monta(vi.fn().mockResolvedValue(fallo(creaError('sin-conexion', 'sin red'))));

    await waitFor(() =>
      expect(TestBed.inject(AvisosStore).avisos().some((a) => a.tipo === 'error')).toBe(true),
    );
  });
});

describe('GananciasDeOperadorPage', () => {
  function puertoDeGanancias() {
    return {
      resumen: vi.fn().mockResolvedValue(
        exito({
          operador: 's1',
          operaciones: 4,
          comisionCentimosCny: 1500,
          desde: 'a',
          hasta: 'b',
        }),
      ),
      historico: vi.fn().mockResolvedValue(
        exito({
          operaciones: [
            {
              operador: 's1',
              pedidoId: 'p1',
              numeroDePedido: 'NX-1',
              comisionCentimosCny: 300,
              articulos: 2,
              procesadoEl: '2026-09-01',
            },
          ],
          total: 1,
          pagina: 0,
          tamano: 20,
        }),
      ),
    };
  }

  async function monta(puerto = puertoDeGanancias(), esAdmin = false) {
    const quienMira = new QuienMiraStore();
    quienMira.fija(
      esAdmin
        ? {
            id: 'u1',
            email: 'a@x.test',
            rol: 'ADMIN',
            activo: true,
            creadoEl: '2026-01-01',
            permisos: [],
          }
        : null,
    );
    const vista = await render(GananciasDeOperadorPage, {
      providers: [
        ConsultaMisGanancias,
        ReindexaOperaciones,
        { provide: MIS_GANANCIAS_PORT, useValue: puerto },
        { provide: REPORTE_DE_OPERADORES_PORT, useValue: { reporte: vi.fn(), reindexa: vi.fn() } },
        { provide: QuienMiraStore, useValue: quienMira },
      ],
    });
    await waitFor(() => expect(puerto.resumen).toHaveBeenCalled());
    vista.fixture.detectChanges();
    return { ...vista, puerto };
  }

  it('enseña la comisión acumulada y las órdenes entregadas', async () => {
    await monta();

    expect(await screen.findByText(/15,00/)).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('NX-1')).toBeInTheDocument();
  });

  /**
   * Para quien cobra por producción, «¥ 0,00» significa «no has ganado nada», que es lo contrario de
   * «no se ha podido consultar».
   */
  it('cuando la consulta falla enseña guiones y ofrece reintentar, NUNCA ceros', async () => {
    const puerto = puertoDeGanancias();
    puerto.resumen.mockResolvedValue(fallo(creaError('sin-conexion')));
    await monta(puerto);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.queryByText(/¥ 0,00/)).toBeNull();
  });

  it('reintentar vuelve a pedir', async () => {
    const puerto = puertoDeGanancias();
    puerto.resumen.mockResolvedValue(fallo(creaError('sin-conexion')));
    await monta(puerto);

    await userEvent.click(await screen.findByRole('button', { name: /Reintentar/i }));

    await waitFor(() => expect(puerto.resumen).toHaveBeenCalledTimes(2));
  });

  /** El reindexado es mantenimiento: solo lo ofrece quien administra. */
  it('quien no administra no ve el reindexado', async () => {
    await monta(puertoDeGanancias(), false);

    expect(screen.queryByRole('button', { name: /Reindexar/i })).toBeNull();
  });

  it('quien administra sí lo ve', async () => {
    await monta(puertoDeGanancias(), true);

    expect(await screen.findByRole('button', { name: /Reindexar/i })).toBeInTheDocument();
  });

  it('cambiar el rango vuelve a la primera página', async () => {
    const { puerto, fixture } = await monta();

    fixture.componentInstance['pagina'].set(2);
    await userEvent.clear(screen.getByLabelText(/Desde/i));
    await userEvent.type(screen.getByLabelText(/Desde/i), '2026-01-01');

    await waitFor(() => expect(puerto.historico).toHaveBeenCalled());
  });
});
