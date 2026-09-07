import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { AvanceDeHoja, CompraAProveedor } from '../../../domain/logistica/model/compra';
import {
  AnulaCompra,
  ConsultaCompras,
  CopiaDireccionDeAlmacen,
  DescargaHojaDeEmpaquetado,
  MarcaCompraHecha,
  MarcaEnvioDelProveedor,
  MarcaRecepcionEnAlmacen,
  MarcaReempaquetado,
  ReexportaCompra,
} from '../../../application/logistica/use-case/gestiona-compras.use-case';
import { ComprasPage } from './compras.page';

/**
 * El tablero de compras a proveedor.
 *
 * <p>Cada paso del flujo pide ANTES los datos que necesita —la referencia y el coste al comprar, el
 * seguimiento al enviar, el motivo al anular—, y todo eso ocurre en un diálogo. La regla que sostiene la
 * pantalla es que **cancelar el diálogo no avanza nada**: si avanzara, cerrar una ventana por error
 * movería una compra de columna y no habría forma de deshacerlo.
 *
 * <p>Y el 404 se cuenta aparte: significa que la fila ya no existe. Es lo único accionable —recargar—,
 * y decir el mensaje genérico del servidor invitaría a reintentar sobre algo que no está.
 */
function compra(parcial: Partial<CompraAProveedor> = {}): CompraAProveedor {
  return {
    id: 'cp1',
    pedidoId: 'o1',
    numeroDePedido: 'NX-1024',
    estado: 'PENDING',
    proveedor: 'Yiwu Textiles',
    direccionDeAlmacen: '浙江省义乌市...',
    lineas: [],
    ...parcial,
  };
}

const AVANCE: AvanceDeHoja = { exportables: 3, incidencias: [] };

interface Opciones {
  compras?: readonly CompraAProveedor[];
  avanzar?: 'falla' | 'desaparecida';
  descargar?: 'falla';
}

async function monta(opciones: Opciones = {}) {
  const respuesta = (): Result<void, AppError> => {
    if (opciones.avanzar === 'falla') {
      return fallo(creaError('conflicto', 'El almacén ya la movió'));
    }
    if (opciones.avanzar === 'desaparecida') {
      return fallo(creaError('no-encontrado'));
    }
    return exito(undefined);
  };

  const consulta = {
    cola: vi.fn(
      async (): Promise<Result<readonly CompraAProveedor[], AppError>> =>
        exito(opciones.compras ?? [compra()]),
    ),
    avanceDeLaHoja: vi.fn(async (): Promise<Result<AvanceDeHoja, AppError>> => exito(AVANCE)),
  };
  const pasos = {
    comprada: vi.fn(async (_id: string, _datos: unknown) => respuesta()),
    enviada: vi.fn(async (_id: string, _datos: unknown) => respuesta()),
    recibida: vi.fn(async (_id: string) => respuesta()),
    reempaquetada: vi.fn(async (_id: string, _datos: unknown) => respuesta()),
    anulada: vi.fn(async (_id: string, _motivo?: string) => respuesta()),
    reexportada: vi.fn(async (_id: string) => respuesta()),
  };
  const hoja = {
    ejecuta: vi.fn(
      async (): Promise<Result<void, AppError>> =>
        opciones.descargar === 'falla'
          ? fallo(creaError('error-del-servidor', 'No se pudo generar'))
          : exito(undefined),
    ),
  };
  const portapapeles = { ejecuta: vi.fn(async (_texto?: string) => true) };

  const vista = await render(ComprasPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      AvisosStore,
      DialogoStore,
      { provide: ConsultaCompras, useValue: consulta },
      { provide: MarcaCompraHecha, useValue: { ejecuta: pasos.comprada } },
      { provide: MarcaEnvioDelProveedor, useValue: { ejecuta: pasos.enviada } },
      { provide: MarcaRecepcionEnAlmacen, useValue: { ejecuta: pasos.recibida } },
      { provide: MarcaReempaquetado, useValue: { ejecuta: pasos.reempaquetada } },
      { provide: AnulaCompra, useValue: { ejecuta: pasos.anulada } },
      { provide: ReexportaCompra, useValue: { ejecuta: pasos.reexportada } },
      { provide: DescargaHojaDeEmpaquetado, useValue: hoja },
      { provide: CopiaDireccionDeAlmacen, useValue: portapapeles },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    await new Promise((sigue) => setTimeout(sigue, 0));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  const pantalla = vista.fixture.componentInstance as unknown as Record<
    string,
    (...args: never[]) => Promise<void> | void
  >;

  return {
    vista,
    asienta,
    pantalla,
    consulta,
    pasos,
    hoja,
    portapapeles,
    avisos: vista.fixture.debugElement.injector.get(AvisosStore),
    dialogo: vista.fixture.debugElement.injector.get(DialogoStore),
  };
}

describe('ComprasPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('carga la cola y el avance de la hoja al entrar', async () => {
    const { consulta } = await monta();

    expect(consulta.cola).toHaveBeenCalled();
    expect(consulta.avanceDeLaHoja).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Descargar fichero/ })).toBeInTheDocument();
  });

  describe('avanzar un paso', () => {
    /** Cerrar una ventana por error no puede mover una compra de columna. */
    it('cancelar el diálogo NO avanza nada', async () => {
      const { pantalla, pasos, dialogo, asienta } = await monta();

      const enCurso = pantalla['avanza'](compra() as never, 'bought' as never);
      await asienta();
      dialogo.cierra(null);
      await enCurso;

      expect(pasos.comprada).not.toHaveBeenCalled();
    });

    it('con los datos puestos, se marca comprada y se recarga', async () => {
      const { pantalla, pasos, consulta, dialogo, asienta } = await monta();
      consulta.cola.mockClear();

      const enCurso = pantalla['avanza'](compra() as never, 'bought' as never);
      await asienta();
      dialogo.cierra({ ref: 'REF-9', coste: '120', envio: '10' });
      await enCurso;
      await asienta();

      expect(pasos.comprada).toHaveBeenCalledWith('cp1', {
        referencia: 'REF-9',
        costeCny: 120,
        envioCny: 10,
      });
      expect(consulta.cola).toHaveBeenCalled();
    });

    it('los campos que se dejan vacíos NO viajan como cadena vacía', async () => {
      const { pantalla, pasos, dialogo, asienta } = await monta();

      const enCurso = pantalla['avanza'](compra() as never, 'bought' as never);
      await asienta();
      dialogo.cierra({ ref: '', coste: '', envio: '' });
      await enCurso;

      /* Un coste «» convertido a número sería cero, y cero es un dato: significaría que costó nada. */
      expect(pasos.comprada).toHaveBeenCalledWith('cp1', {
        referencia: undefined,
        costeCny: undefined,
        envioCny: undefined,
      });
    });

    it('recibir en almacén no pide nada: se marca directamente', async () => {
      const { pantalla, pasos, asienta } = await monta();

      await pantalla['avanza'](compra({ estado: 'IN_TRANSIT' }) as never, 'received' as never);
      await asienta();

      expect(pasos.recibida).toHaveBeenCalledWith('cp1');
    });

    it('reexportar tampoco', async () => {
      const { pantalla, pasos, asienta } = await monta();

      await pantalla['avanza'](compra() as never, 'reexport' as never);
      await asienta();

      expect(pasos.reexportada).toHaveBeenCalledWith('cp1');
    });

    it('anular pide el motivo en la MISMA ventana que confirma', async () => {
      const { pantalla, pasos, dialogo, asienta } = await monta();

      const enCurso = pantalla['avanza'](compra() as never, 'cancel' as never);
      await asienta();

      /* Preguntar y luego pedir el motivo aparte obligaba a decidir dos veces lo mismo. */
      expect(dialogo.actual()).not.toBeNull();
      dialogo.cierra({ motivo: 'El proveedor no tiene stock' });
      await enCurso;

      expect(pasos.anulada).toHaveBeenCalledWith('cp1', 'El proveedor no tiene stock');
    });

    it('un rechazo del servidor se enseña con SU mensaje', async () => {
      const { pantalla, avisos, dialogo, asienta } = await monta({ avanzar: 'falla' });

      const enCurso = pantalla['avanza'](compra() as never, 'bought' as never);
      await asienta();
      dialogo.cierra({ ref: 'x', coste: '', envio: '' });
      await enCurso;
      await asienta();

      expect(avisos.avisos().at(-1)).toMatchObject({
        tipo: 'error',
        mensaje: 'El almacén ya la movió',
      });
    });

    /** Un 404 significa que la fila ya no existe: reintentar sobre ella no lleva a ninguna parte. */
    it('una compra que ya no existe se dice como tal, no con el error genérico', async () => {
      const { pantalla, avisos, dialogo, asienta } = await monta({ avanzar: 'desaparecida' });

      const enCurso = pantalla['avanza'](compra() as never, 'bought' as never);
      await asienta();
      dialogo.cierra({ ref: 'x', coste: '', envio: '' });
      await enCurso;
      await asienta();

      expect(avisos.avisos().at(-1)?.tipo).toBe('error');
      expect(avisos.avisos().at(-1)?.mensaje).not.toBe('');
    });
  });

  describe('la hoja de empaquetado', () => {
    /** La descarga MARCA las compras como exportadas: sin recargar, la cola seguiría enseñándolas. */
    it('al descargarla se recarga la cola', async () => {
      const { pantalla, hoja, consulta, asienta } = await monta();
      consulta.cola.mockClear();

      await pantalla['descarga']();
      await asienta();

      expect(hoja.ejecuta).toHaveBeenCalled();
      expect(consulta.cola).toHaveBeenCalled();
    });

    it('si falla, se dice y NO se recarga', async () => {
      const { pantalla, consulta, avisos, asienta } = await monta({ descargar: 'falla' });
      consulta.cola.mockClear();

      await pantalla['descarga']();
      await asienta();

      expect(avisos.avisos().at(-1)?.mensaje).toBe('No se pudo generar');
      expect(consulta.cola).not.toHaveBeenCalled();
    });
  });

  it('copiar la dirección del almacén avisa de que se copió', async () => {
    const { pantalla, portapapeles, avisos, asienta } = await monta();

    await pantalla['copiaDireccion'](compra() as never);
    await asienta();

    expect(portapapeles.ejecuta).toHaveBeenCalledWith('浙江省义乌市...');
    expect(avisos.avisos().at(-1)?.tipo).toBe('success');
  });

  /** Sin portapapeles no se canta un «copiado» que no ocurrió. */
  it('si el navegador deniega el portapapeles, no se dice que se copió', async () => {
    const { pantalla, portapapeles, avisos, asienta } = await monta();
    portapapeles.ejecuta.mockResolvedValueOnce(false);

    await pantalla['copiaDireccion'](compra() as never);
    await asienta();

    expect(avisos.avisos()).toEqual([]);
  });
});
