import { render, screen } from '@testing-library/angular';
import { CotizacionDeEnvio } from '../../domain/model/cotizacion-de-envio';
import { DesgloseDelPedido } from './desglose-del-pedido';

function cotizacion(parcial: Partial<CotizacionDeEnvio> = {}): CotizacionDeEnvio {
  return { cubierto: true, ...parcial };
}

async function monta(
  entradas: Partial<{
    cotizacion: CotizacionDeEnvio | undefined;
    subtotal: string;
    hayPais: boolean;
  }> = {},
) {
  return render(DesgloseDelPedido, {
    inputs: {
      cotizacion: entradas.cotizacion,
      subtotal: entradas.subtotal ?? '100,00 €',
      hayPais: entradas.hayPais ?? true,
    },
  });
}

describe('DesgloseDelPedido', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  /**
   * Enseñar el subtotal como total dice un precio final que no es: en un pedido de prueba pasó de 6,20 €
   * a 14,06 € al elegir España.
   */
  it('sin país no finge un total: pide el país', async () => {
    await monta({ hayPais: false, cotizacion: undefined });

    expect(screen.getByText(/país|country/i)).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('con la cotización puesta pinta el total que escribe el servidor', async () => {
    await monta({ cotizacion: cotizacion({ totalFormateado: '129,72 €' }) });

    expect(screen.getByText('129,72 €')).toBeInTheDocument();
  });

  /**
   * El resumen enseñaba la tarifa y el descuento por separado y dejaba la resta a quien compra: «Envío
   * 13,30 €» y «Subsidio −12,37 €» sin decir en ninguna línea que pagaba 0,93 €.
   */
  it('enseña la tarifa, lo que cubrimos y LO QUE SE PAGA, en tres líneas', async () => {
    await monta({
      cotizacion: cotizacion({
        envioBaseFormateado: '13,30 €',
        subvencionDeEnvioFormateada: '12,37 €',
        subvencionDeEnvioPorciento: 93,
        envioNetoFormateado: '0,93 €',
      }),
    });

    expect(screen.getByText('13,30 €')).toBeInTheDocument();
    expect(screen.getByText('−12,37 €')).toBeInTheDocument();
    expect(screen.getByText('0,93 €')).toBeInTheDocument();
  });

  /** Al cien por cien se dice «gratis», que es lo que se entiende, en vez de obligar a restar. */
  it('con la subvención al completo dice que el envío es gratis', async () => {
    const vista = await monta({
      cotizacion: cotizacion({
        subvencionDeEnvioPorciento: 100,
        subvencionDeEnvioFormateada: '13,30 €',
        envioGratis: true,
      }),
    });

    expect(vista.fixture.nativeElement.textContent).toMatch(/gratis|free/i);
  });

  it('el arancel solo aparece cuando lo hay', async () => {
    await monta({ cotizacion: cotizacion({ recargoDeAduanaCentimos: 0 }) });
    expect(screen.queryByText(/arancel|customs/i)).toBeNull();
  });

  it('con arancel, se explica detrás de un icono y se dice lo que se paga', async () => {
    await monta({
      cotizacion: cotizacion({
        recargoDeAduanaCentimos: 300,
        recargoDeAduanaFormateado: '3,00 €',
        aranceLNetoFormateado: '1,50 €',
        subvencionDeArancelPorciento: 50,
        subvencionDeAranceLFormateada: '1,50 €',
      }),
    });

    expect(screen.getByText('3,00 €')).toBeInTheDocument();
    expect(screen.getAllByText('1,50 €').length).toBeGreaterThan(0);
    // El icono que abre la explicación tiene nombre accesible.
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('el impuesto solo se pinta cuando el destino lo tiene', async () => {
    const vista = await monta({
      cotizacion: cotizacion({ impuestoPuntosBasicos: 0, impuestoFormateado: '0,00 €' }),
    });
    expect(screen.queryByText('0,00 €')).toBeNull();

    // Montar por segunda vez en la misma prueba revienta: el TestBed ya está instanciado. Se cambia la
    // cotización sobre el mismo montaje, que es además lo que pasa de verdad al elegir otro destino.
    await vista.rerender({
      inputs: {
        cotizacion: cotizacion({ impuestoPuntosBasicos: 2100, impuestoFormateado: '2,95 €' }),
        subtotal: '100,00 €',
        hayPais: true,
      },
    });
    expect(screen.getByText('2,95 €')).toBeInTheDocument();
  });

  it('un destino sin cobertura lo dice en la línea de envío', async () => {
    const vista = await monta({ cotizacion: cotizacion({ cubierto: false }) });

    expect(vista.fixture.nativeElement.textContent).not.toContain('—');
  });

  it('mientras la cotización viaja, el envío se queda en espera', async () => {
    await monta({ cotizacion: undefined, hayPais: true });

    expect(screen.getByText('…')).toBeInTheDocument();
  });
});
