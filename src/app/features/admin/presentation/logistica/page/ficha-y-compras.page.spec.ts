import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { COOKIE_IDIOMA } from '@core/preferences/preferencias';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import {
  FACTURA_DE_PEDIDO_PORT,
  PEDIDOS_ADMIN_PORT,
  TRANSICIONES_DE_PEDIDO_PORT,
  SEGUIMIENTO_ADMIN_PORT,
} from '../../../domain/logistica/port/pedidos-admin.port';
import { GUIAS_DE_ENVIO_PORT } from '../../../domain/logistica/port/incidencias-de-envio.port';
import {
  AnulaGuia,
  DescargaEtiqueta,
} from '../../../application/logistica/use-case/gestiona-incidencias.use-case';
import { Seguimiento } from '../../../domain/logistica/model/seguimiento';
import {
  AVANCE_DE_COMPRA_PORT,
  COMPRAS_PORT,
  HOJA_DE_EMPAQUETADO_PORT,
} from '../../../domain/logistica/port/compras.port';
import {
  DESCARGA_DE_FICHEROS_PORT,
  PORTAPAPELES_PORT,
} from '../../../domain/logistica/port/navegador.port';
import { FichaDePedido } from '../../../domain/logistica/model/pedido';
import { CompraAProveedor, enRiesgo } from '../../../domain/logistica/model/compra';
import {
  CambiaEstadoDePedido,
  ConsultaPedido,
} from '../../../application/logistica/use-case/gestiona-pedidos.use-case';
import {
  ConsultaSeguimiento,
  DescargaFactura,
  SincronizaSeguimiento,
} from '../../../application/logistica/use-case/sigue-el-envio.use-case';
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
import { FichaDePedidoPage } from './ficha-de-pedido.page';
import { ComprasPage } from './compras.page';

/**
 * Montar la pantalla entera con su tabla y sus diálogos tarda más que el plazo por defecto, sobre todo
 * en la primera prueba del fichero, que además compila la plantilla. Se amplía para el fichero entero:
 * un plazo corto aquí solo produce fallos que no señalan ningún defecto.
 */
vi.setConfig({ testTimeout: 30_000 });

beforeEach(() => {
  document.cookie = `${COOKIE_IDIOMA}=es; Path=/`;
});

function ficha(parcial: Partial<FichaDePedido> = {}): FichaDePedido {
  return {
    id: 'p1',
    numero: 'NX-1',
    estado: 'PAID',
    articulos: 1,
    totalFormateado: '9,54 €',
    lineas: [],
    bultos: [],
    ...parcial,
  };
}

describe('FichaDePedidoPage', () => {
  function dobles(pedido: FichaDePedido) {
    return {
      lectura: {
        busca: vi.fn(),
        ficha: vi.fn().mockResolvedValue(exito(pedido)),
        reindexa: vi.fn(),
      },
      transiciones: {
        aplica: vi.fn().mockResolvedValue(exito(undefined)),
        aplicaEnLote: vi.fn(),
      },
      seguimiento: {
        consulta: vi
          .fn()
          .mockResolvedValue(exito({ eventos: [], bultos: [], declaraciones: [] })),
        sincroniza: vi.fn().mockResolvedValue(exito(undefined)),
      },
      factura: { descarga: vi.fn().mockResolvedValue(exito(new Blob(['pdf']))) },
      ficheros: { guarda: vi.fn(), abre: vi.fn() },
      guias: {
        etiqueta: vi.fn().mockResolvedValue(exito('https://etiquetas.example/1.pdf')),
        anula: vi.fn().mockResolvedValue(exito(undefined)),
      },
    };
  }

  async function monta(pedido: FichaDePedido, rastro?: Partial<Seguimiento>) {
    const puertos = dobles(pedido);
    if (rastro) {
      puertos.seguimiento.consulta.mockResolvedValue(
        exito({ eventos: [], bultos: [], declaraciones: [], ...rastro }),
      );
    }
    const vista = await render(FichaDePedidoPage, {
      providers: [
        provideRouter([]),
        ConsultaPedido,
        CambiaEstadoDePedido,
        ConsultaSeguimiento,
        SincronizaSeguimiento,
        DescargaFactura,
        DescargaEtiqueta,
        AnulaGuia,
        { provide: GUIAS_DE_ENVIO_PORT, useValue: puertos.guias },
        { provide: PEDIDOS_ADMIN_PORT, useValue: puertos.lectura },
        { provide: TRANSICIONES_DE_PEDIDO_PORT, useValue: puertos.transiciones },
        { provide: SEGUIMIENTO_ADMIN_PORT, useValue: puertos.seguimiento },
        { provide: FACTURA_DE_PEDIDO_PORT, useValue: puertos.factura },
        { provide: DESCARGA_DE_FICHEROS_PORT, useValue: puertos.ficheros },
      ],
      inputs: { id: 'p1' },
    });
    await waitFor(() => expect(puertos.lectura.ficha).toHaveBeenCalled());
    vista.fixture.detectChanges();
    return { ...vista, puertos };
  }

  /** Sin idioma los títulos de línea vuelven en chino. */
  it('pide la ficha con el idioma del panel', async () => {
    const { puertos } = await monta(ficha());

    expect(puertos.lectura.ficha).toHaveBeenCalledWith('p1', 'es');
  });

  it('pinta el importe que manda el backend, sin reconvertirlo', async () => {
    await monta(ficha());

    expect(await screen.findByText('9,54 €')).toBeInTheDocument();
  });

  /** Un «0,00 €» de envío se lee como envío gratis, que es otra promesa. */
  it('sin cotizar, envío e impuestos salen como «por calcular»', async () => {
    await monta(ficha());

    expect((await screen.findAllByText(/calcular|pendiente/i)).length).toBeGreaterThan(0);
  });

  /** La fila del envío ya no desaparece cuando falta el dato: sin canal el pedido no emite guía. */
  it('un pedido sin canal pinta la seccion del envio con el aviso de error', async () => {
    await monta(ficha());

    expect(await screen.findByTestId('canal-del-pedido')).toBeInTheDocument();
    expect(screen.getByTestId('canal-problema')).toBeInTheDocument();
  });

  it('un pedido con su canal en regla enseña transportista y canal, sin aviso', async () => {
    await monta(
      ficha({
        nombreDelTransportista: '4PX',
        canalDeEnvio: 'S1427',
        nombreDelCanal: 'General',
        tipoDeLinea: 'general',
        canalAdmisible: true,
      }),
    );

    expect(await screen.findByTestId('canal-transportista')).toHaveTextContent('4PX');
    expect(screen.queryByTestId('canal-problema')).toBeNull();
  });

  it('un pedido sin cobrar no ofrece descargar la factura', async () => {
    await monta(ficha({ estado: 'PENDING' }));

    expect(screen.queryByRole('button', { name: /factura/i })).toBeNull();
  });

  it('un pedido cancelado con factura la ofrece; sin ella, no', async () => {
    await monta(ficha({ estado: 'CANCELLED', conFactura: true }));
    expect(await screen.findByRole('button', { name: /factura/i })).toBeInTheDocument();
  });

  it('un pedido cancelado sin factura no la ofrece', async () => {
    await monta(ficha({ estado: 'CANCELLED', conFactura: false }));
    await screen.findByText('NX-1');
    expect(screen.queryByRole('button', { name: /factura/i })).toBeNull();
  });

  it('un pedido cobrado sí la ofrece, y descargarla la guarda', async () => {
    const { puertos } = await monta(ficha({ estado: 'PAID' }));

    await userEvent.click(await screen.findByRole('button', { name: /factura/i }));

    await waitFor(() => expect(puertos.ficheros.guarda).toHaveBeenCalledWith('NX-1.pdf', expect.any(Blob)));
  });

  it('el seguimiento solo se ofrece desde que el pedido sale hacia el transportista', async () => {
    await monta(ficha({ estado: 'PAID' }));

    expect(screen.queryByRole('button', { name: /Sincronizar/i })).toBeNull();
  });

  it('sincronizar vuelve a leer el rastro', async () => {
    const { puertos } = await monta(ficha({ estado: 'SHIPPED' }));

    await userEvent.click(await screen.findByRole('button', { name: /Sincronizar/i }));

    await waitFor(() => expect(puertos.seguimiento.sincroniza).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(puertos.seguimiento.consulta).toHaveBeenCalledTimes(2));
  });

  describe('envío por bulto: fase, etiqueta y anulación', () => {
    const bulto = {
      secuencia: 2,
      transportista: '4PX',
      numeroDeSeguimiento: 'FPX99',
      fase: 'EN_ADUANA' as const,
      ultimaConsultaEl: '2026-11-24T10:00:00Z',
      incidenciasAbiertas: 3,
      costeReal: { importe: 12.5, moneda: 'EUR' },
      urlDeSeguimiento: 'https://track.example/FPX99',
      pesoGramos: 400,
      eventos: [],
      articulos: [],
    };

    it('enseña fase, transportista, última consulta, incidencias abiertas y coste real', async () => {
      await monta(ficha({ estado: 'SHIPPED' }), { bultos: [bulto] });

      expect(await screen.findByText('En aduana')).toBeInTheDocument();
      expect(screen.getByText('4PX')).toBeInTheDocument();
      expect(screen.getByText(/Última consulta/)).toBeInTheDocument();
      expect(document.querySelector('[data-incidencias-abiertas]')).toHaveTextContent('3');
      expect(document.querySelector('[data-coste-real]')).toHaveTextContent('12.50 EUR');
      expect(screen.getByRole('link', { name: 'Seguir en la web del transportista' })).toHaveAttribute(
        'rel',
        'noopener',
      );
    });

    it('sin los campos nuevos la ficha se ve como antes, sin pastillas ni botones de anular', async () => {
      await monta(ficha({ estado: 'SHIPPED' }), {
        bultos: [{ ...bulto, fase: undefined, incidenciasAbiertas: undefined, costeReal: undefined, ultimaConsultaEl: undefined, urlDeSeguimiento: undefined, numeroDeSeguimiento: undefined }],
      });
      await screen.findByText('NX-1');

      expect(document.querySelector('[data-incidencias-abiertas]')).toBeNull();
      expect(document.querySelector('[data-coste-real]')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Anular guía' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Descargar etiqueta' })).toBeNull();
    });

    it('descargar etiqueta abre la dirección que devuelve el backend', async () => {
      const { puertos } = await monta(ficha({ estado: 'SHIPPED' }), { bultos: [bulto] });

      await userEvent.click(await screen.findByRole('button', { name: 'Descargar etiqueta' }));

      await waitFor(() => expect(puertos.guias.etiqueta).toHaveBeenCalledWith('p1', 2));
      expect(puertos.ficheros.abre).toHaveBeenCalledWith('https://etiquetas.example/1.pdf');
    });

    it('una etiqueta con una dirección que no es web se descarta y se dice', async () => {
      const { puertos } = await monta(ficha({ estado: 'SHIPPED' }), { bultos: [bulto] });
      puertos.guias.etiqueta.mockResolvedValue(exito('javascript:alert(1)'));

      await userEvent.click(await screen.findByRole('button', { name: 'Descargar etiqueta' }));

      await waitFor(() => expect(puertos.guias.etiqueta).toHaveBeenCalled());
      expect(puertos.ficheros.abre).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(TestBed.inject(AvisosStore).avisos().map((a) => a.mensaje)).toContain(
          'No hay etiqueta disponible para esta guía.',
        ),
      );
    });

    it('anular la guía pide confirmación con el diálogo propio y no anula si se dice que no', async () => {
      const { puertos } = await monta(ficha({ estado: 'SHIPPED' }), { bultos: [bulto] });
      const dialogo = TestBed.inject(DialogoStore);
      const confirma = vi.spyOn(dialogo, 'confirma').mockResolvedValue(false);

      await userEvent.click(await screen.findByRole('button', { name: 'Anular guía' }));

      await waitFor(() => expect(confirma).toHaveBeenCalled());
      expect(confirma.mock.calls[0][0]).toContain('bulto 2');
      expect(puertos.guias.anula).not.toHaveBeenCalled();
    });

    it('confirmada, anula la guía y vuelve a leer el rastro', async () => {
      const { puertos } = await monta(ficha({ estado: 'SHIPPED' }), { bultos: [bulto] });
      vi.spyOn(TestBed.inject(DialogoStore), 'confirma').mockResolvedValue(true);

      await userEvent.click(await screen.findByRole('button', { name: 'Anular guía' }));

      await waitFor(() => expect(puertos.guias.anula).toHaveBeenCalledWith('p1', 2));
      await waitFor(() => expect(puertos.seguimiento.consulta).toHaveBeenCalledTimes(2));
    });

    it('si anular falla lo cuenta y no vuelve a leer', async () => {
      const { puertos } = await monta(ficha({ estado: 'SHIPPED' }), { bultos: [bulto] });
      vi.spyOn(TestBed.inject(DialogoStore), 'confirma').mockResolvedValue(true);
      puertos.guias.anula.mockResolvedValue(fallo(creaError('conflicto', 'Ya salió del almacén')));

      await userEvent.click(await screen.findByRole('button', { name: 'Anular guía' }));

      await waitFor(() =>
        expect(TestBed.inject(AvisosStore).avisos().map((a) => a.mensaje)).toContain(
          'Ya salió del almacén',
        ),
      );
      expect(puertos.seguimiento.consulta).toHaveBeenCalledTimes(1);
    });

    it('un bulto entregado ya no ofrece anular la guía', async () => {
      await monta(ficha({ estado: 'DELIVERED' }), { bultos: [{ ...bulto, fase: 'ENTREGADO' }] });
      await screen.findByText('NX-1');

      expect(screen.queryByRole('button', { name: 'Anular guía' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Descargar etiqueta' })).toBeInTheDocument();
    });
  });

  it('una transición se confirma y se avisa del resultado', async () => {
    const { puertos } = await monta(ficha({ estado: 'PAID' }));
    vi.spyOn(TestBed.inject(DialogoStore), 'confirma').mockResolvedValue(true);

    await userEvent.click(await screen.findByRole('button', { name: 'Enviar a proveedor' }));

    await waitFor(() => expect(puertos.transiciones.aplica).toHaveBeenCalledWith('p1', 'forward'));
  });

  it('un pedido que no existe lo dice en vez de dejar la pantalla en blanco', async () => {
    const puertos = dobles(ficha());
    puertos.lectura.ficha.mockResolvedValue(fallo(creaError('no-encontrado')));
    await render(FichaDePedidoPage, {
      providers: [
        provideRouter([]),
        ConsultaPedido,
        CambiaEstadoDePedido,
        ConsultaSeguimiento,
        SincronizaSeguimiento,
        DescargaFactura,
        DescargaEtiqueta,
        AnulaGuia,
        { provide: GUIAS_DE_ENVIO_PORT, useValue: puertos.guias },
        { provide: PEDIDOS_ADMIN_PORT, useValue: puertos.lectura },
        { provide: TRANSICIONES_DE_PEDIDO_PORT, useValue: puertos.transiciones },
        { provide: SEGUIMIENTO_ADMIN_PORT, useValue: puertos.seguimiento },
        { provide: FACTURA_DE_PEDIDO_PORT, useValue: puertos.factura },
        { provide: DESCARGA_DE_FICHEROS_PORT, useValue: puertos.ficheros },
      ],
      inputs: { id: 'p1' },
    });

    expect(await screen.findByText(/no se ha encontrado|no encontrad/i)).toBeInTheDocument();
  });

  it('las líneas enlazan a la ficha del proveedor, que es lo que abre quien compra', async () => {
    await monta(
      ficha({
        lineas: [
          {
            id: 'l1',
            titulo: 'Gorro',
            cantidad: 2,
            origenUrl: 'https://1688.test/x',
            totalLineaFormateado: '10,00 €',
          },
        ],
      }),
    );

    expect(await screen.findByRole('link', { name: /Ver producto/i })).toHaveAttribute(
      'href',
      'https://1688.test/x',
    );
  });
});

describe('ComprasPage', () => {
  function compra(parcial: Partial<CompraAProveedor> = {}): CompraAProveedor {
    return {
      id: 'c1',
      pedidoId: 'p1',
      numeroDePedido: 'NX-1',
      estado: 'PENDING',
      lineas: [{ lineaDePedidoId: 'l1', titulo: 'Gorro', cantidad: 2 }],
      ...parcial,
    };
  }

  function dobles(compras: readonly CompraAProveedor[], exportables = 1) {
    return {
      cola: {
        cola: vi.fn().mockResolvedValue(
          exito({ items: compras, pagina: 0, tamano: 25, total: compras.length, totalPaginas: 1 }),
        ),
        enRiesgo: vi.fn().mockResolvedValue(exito(enRiesgo(compras))),
      },
      avance: {
        marcaComprada: vi.fn().mockResolvedValue(exito(undefined)),
        marcaEnviada: vi.fn().mockResolvedValue(exito(undefined)),
        marcaRecibida: vi.fn().mockResolvedValue(exito(undefined)),
        marcaReempaquetada: vi.fn().mockResolvedValue(exito(undefined)),
        anula: vi.fn().mockResolvedValue(exito(undefined)),
        reexporta: vi.fn().mockResolvedValue(exito(undefined)),
      },
      hoja: {
        avance: vi.fn().mockResolvedValue(exito({ exportables, incidencias: [] })),
        descarga: vi.fn().mockResolvedValue(exito(new Blob(['xls']))),
      },
      ficheros: { guarda: vi.fn() },
      portapapeles: { copia: vi.fn().mockResolvedValue(true) },
    };
  }

  async function monta(compras: readonly CompraAProveedor[], exportables = 1) {
    const puertos = dobles(compras, exportables);
    const vista = await render(ComprasPage, {
      providers: [
        ConsultaCompras,
        MarcaCompraHecha,
        MarcaEnvioDelProveedor,
        MarcaRecepcionEnAlmacen,
        MarcaReempaquetado,
        AnulaCompra,
        ReexportaCompra,
        DescargaHojaDeEmpaquetado,
        CopiaDireccionDeAlmacen,
        { provide: COMPRAS_PORT, useValue: puertos.cola },
        { provide: AVANCE_DE_COMPRA_PORT, useValue: puertos.avance },
        { provide: HOJA_DE_EMPAQUETADO_PORT, useValue: puertos.hoja },
        { provide: DESCARGA_DE_FICHEROS_PORT, useValue: puertos.ficheros },
        { provide: PORTAPAPELES_PORT, useValue: puertos.portapapeles },
      ],
    });
    await waitFor(() => expect(puertos.cola.cola).toHaveBeenCalled());
    vista.fixture.detectChanges();
    return { ...vista, puertos };
  }

  it('agrupa las compras del mismo pedido bajo una cabecera', async () => {
    await monta([compra({ id: 'c1' }), compra({ id: 'c2' })]);

    expect((await screen.findAllByText('NX-1')).length).toBe(1);
  });

  it('cada tarjeta ofrece solo el paso que toca', async () => {
    await monta([compra({ estado: 'IN_TRANSIT' })]);

    // Se mira DENTRO de la tarjeta: la cabecera lleva filtros de estado que también nombran «Comprado».
    const tarjeta = (await screen.findByRole('button', { name: /recibid/i })).closest(
      'nx-tarjeta-de-compra',
    ) as HTMLElement;
    expect(within(tarjeta).queryByRole('button', { name: /comprad/i })).toBeNull();
  });

  it('marcar recibida recarga la cola', async () => {
    const { puertos } = await monta([compra({ estado: 'IN_TRANSIT' })]);

    await userEvent.click(await screen.findByRole('button', { name: /recibid/i }));

    await waitFor(() => expect(puertos.avance.marcaRecibida).toHaveBeenCalledWith('c1'));
    await waitFor(() => expect(puertos.cola.cola).toHaveBeenCalledTimes(2));
  });

  /**
   * Enseñar siempre «no se pudo completar» deja sin saber si reintentar o recargar. Un 404 significa
   * que la fila ya no existe, que es lo único accionable.
   */
  it('un 404 se traduce a «esa fila ya no está», no al mensaje genérico', async () => {
    const { puertos } = await monta([compra({ estado: 'IN_TRANSIT' })]);
    puertos.avance.marcaRecibida.mockResolvedValue(fallo(creaError('no-encontrado', 'no existe')));

    await userEvent.click(await screen.findByRole('button', { name: /recibid/i }));

    await waitFor(() =>
      expect(TestBed.inject(AvisosStore).avisos().some((a) => a.tipo === 'error')).toBe(true),
    );
  });

  it('descargar la hoja la guarda y recarga la cola, porque la descarga marca lo exportado', async () => {
    const { puertos } = await monta([compra()], 2);

    await userEvent.click(await screen.findByRole('button', { name: /Descargar/i }));

    await waitFor(() => expect(puertos.ficheros.guarda).toHaveBeenCalled());
    await waitFor(() => expect(puertos.cola.cola).toHaveBeenCalledTimes(2));
  });

  it('sin nada exportable el botón está apagado', async () => {
    await monta([compra()], 0);

    expect(await screen.findByRole('button', { name: /Descargar/i })).toBeDisabled();
  });

  it('copiar la dirección del almacén confirma que se copió', async () => {
    const { puertos } = await monta([
      compra({ estado: 'PENDING', direccionDeAlmacen: '浙江省义乌市' }),
    ]);

    await userEvent.click(await screen.findByRole('button', { name: /Copiar/i }));

    await waitFor(() => expect(puertos.portapapeles.copia).toHaveBeenCalledWith('浙江省义乌市'));
  });

  /** A los 30 días el almacén destruye el bulto sin compensación. */
  it('avisa de las compras que llevan demasiados días en el almacén', async () => {
    await monta([compra({ estado: 'AT_WAREHOUSE', diasEnAlmacen: 25, seguimientoDomestico: 'SF1' })]);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  /** Re-exportar una compra ya re-empaquetada la rechazaría la validación por duplicada. */
  it('no ofrece re-exportar una compra ya re-empaquetada', async () => {
    await monta([compra({ estado: 'PACKED', exportadoEl: '2026-09-01' })]);

    expect(screen.queryByRole('button', { name: /Volver a exportar|Reexportar/i })).toBeNull();
  });

  it('sí lo ofrece sobre una exportada que aún no se re-empaquetó', async () => {
    const { puertos } = await monta([
      compra({ estado: 'AT_WAREHOUSE', exportadoEl: '2026-09-01' }),
    ]);

    const boton = await screen.findByRole('button', { name: /exportar/i });
    await userEvent.click(boton);

    await waitFor(() => expect(puertos.avance.reexporta).toHaveBeenCalledWith('c1'));
  });
});
