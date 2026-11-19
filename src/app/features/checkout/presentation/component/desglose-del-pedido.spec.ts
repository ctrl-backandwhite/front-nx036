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

  /**
   * Sin línea de impuesto, quien compra da por hecho que va incluido. En un envío DDU no lo va: lo
   * reclama la aduana al entregar. Medido en Serbia con 4PX el 11-nov-2026: el resumen no decía nada.
   */
  it('cuando los impuestos se pagan al recibir, lo avisa', async () => {
    await monta({
      cotizacion: cotizacion({ totalFormateado: '21,74 €', impuestosAlRecibir: true }),
    });

    expect(screen.getByTestId('desglose-impuestos-al-recibir')).toBeInTheDocument();
    expect(screen.queryByTestId('desglose-iva')).toBeNull();
  });

  it('con el impuesto incluido NO sale ese aviso', async () => {
    // El caso normal, y el de la UE entera: avisar aquí sería asustar a quien ya lo ha pagado.
    await monta({
      cotizacion: cotizacion({
        totalFormateado: '129,72 €',
        impuestoPuntosBasicos: 2100,
        impuestoFormateado: '20,10 €',
      }),
    });

    expect(screen.queryByTestId('desglose-impuestos-al-recibir')).toBeNull();
    expect(screen.getByTestId('desglose-iva')).toBeInTheDocument();
  });

  it('con la cotización puesta pinta el total que escribe el servidor', async () => {
    await monta({ cotizacion: cotizacion({ totalFormateado: '129,72 €' }) });

    expect(screen.getByText('129,72 €')).toBeInTheDocument();
  });

  /**
   * Decisión del titular (19-nov-2026): un solo precio de envío, el que se paga. El resumen enseñaba
   * «Envío 5,61 €», «Subsidio −3,27 €» y «A pagar 2,34 €», y la tarjeta de la opción «5,61 €»: dos
   * precios para el mismo envío.
   */
  it('el envío se enseña en UNA línea, con lo que se paga', async () => {
    const vista = await monta({
      cotizacion: cotizacion({ envioFormateado: '10,61 €', envioNetoFormateado: '2,34 €' }),
    });

    expect(screen.getByTestId('desglose-envio')).toHaveTextContent('2,34 €');
    expect(screen.getAllByText('2,34 €')).toHaveLength(1);
    expect(vista.fixture.nativeElement.textContent).not.toMatch(/subsid|a pagar por|to pay/i);
  });

  it('con el envío cubierto entero la línea dice cero, igual que la tarjeta de la opción', async () => {
    await monta({ cotizacion: cotizacion({ envioNetoFormateado: '0,00 €' }) });

    expect(screen.getByTestId('desglose-envio')).toHaveTextContent('0,00 €');
  });

  it('si el servidor no manda el neto, pinta el envío que sí manda', async () => {
    // Un servidor anterior: mejor el importe que hay que un hueco en la línea del envío.
    await monta({ cotizacion: cotizacion({ envioFormateado: '13,30 €' }) });

    expect(screen.getByTestId('desglose-envio')).toHaveTextContent('13,30 €');
  });

  it('el arancel solo aparece cuando lo hay', async () => {
    await monta({ cotizacion: cotizacion({ recargoDeAduanaCentimos: 0 }) });
    expect(screen.queryByText(/arancel|customs/i)).toBeNull();
  });

  it('el arancel también va en UNA línea con lo que se paga, y se explica detrás de un icono', async () => {
    const vista = await monta({
      cotizacion: cotizacion({
        recargoDeAduanaCentimos: 300,
        recargoDeAduanaFormateado: '3,00 €',
        aranceLNetoFormateado: '1,50 €',
      }),
    });

    expect(screen.getByTestId('desglose-aranceles')).toHaveTextContent('1,50 €');
    expect(screen.queryByText('3,00 €')).toBeNull();
    expect(vista.fixture.nativeElement.textContent).not.toMatch(/subsid|a pagar por|to pay/i);
    // El icono que abre la explicación tiene nombre accesible.
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('sin el neto del arancel pinta el íntegro', async () => {
    await monta({
      cotizacion: cotizacion({ recargoDeAduanaCentimos: 300, recargoDeAduanaFormateado: '3,00 €' }),
    });

    expect(screen.getByTestId('desglose-aranceles')).toHaveTextContent('3,00 €');
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

  it('la linea de envio dice la clase de linea y el transportista de la opcion cotizada', async () => {
    const vista = await render(DesgloseDelPedido, {
      inputs: {
        cotizacion: cotizacion(),
        subtotal: '100,00 €',
        hayPais: true,
        opcionCotizada: {
          codigo: 'S1427',
          importeParaComparar: 900,
          importeFormateado: '9 €',
          transportista: '4PX',
          tipoDeLinea: 'general',
          diasMinimos: 6,
          diasMaximos: 12,
        },
      },
    });

    const envio = vista.container.querySelector('[data-testid="desglose-envio"]')?.textContent ?? '';
    expect(envio).toContain('Mercancía general · 4PX');
    expect(envio).not.toMatch(/estándar/i);
  });

  it('sin datos de canal conserva el rotulo generico de envio', async () => {
    const vista = await monta({ cotizacion: cotizacion() });

    expect(vista.container.querySelector('[data-testid="desglose-envio"]')?.textContent).toMatch(
      /estándar/i,
    );
  });

  it('un destino sin cobertura lo dice en la línea de envío', async () => {
    const vista = await monta({ cotizacion: cotizacion({ cubierto: false }) });

    expect(vista.fixture.nativeElement.textContent).not.toContain('—');
  });

  it('mientras la cotización viaja, el envío se queda en espera', async () => {
    await monta({ cotizacion: undefined, hayPais: true });

    expect(screen.getByText('…')).toBeInTheDocument();
  });

  /**
   * Con el país ya puesto y la cotización en camino, el total enseñaba el SUBTOTAL. Al recargar el
   * checkout se veía «Total 23,31 €» durante dos segundos y luego saltaba a 51,27 €: un importe que
   * no era el que se iba a cobrar, en la casilla que todo el mundo mira.
   */
  it('mientras se cotiza, el total NO enseña el subtotal', async () => {
    const vista = await monta({ cotizacion: undefined, hayPais: true, subtotal: '23,31 €' });

    const total = vista.fixture.nativeElement.querySelector('[data-testid="desglose-total"]');
    expect(total.textContent).not.toContain('23,31');
  });

  it('mientras se cotiza, se reservan las líneas que van a venir', async () => {
    const vista = await monta({ cotizacion: undefined, hayPais: true });

    // Sin reservarlas, el resumen crece de golpe al llegar la respuesta y lo que estabas mirando se
    // desplaza hacia abajo.
    expect(
      vista.fixture.nativeElement.querySelector('[data-testid="desglose-en-espera"]'),
    ).not.toBeNull();
  });

  it('con la cotización ya puesta no queda ninguna línea en espera', async () => {
    const vista = await monta({ cotizacion: cotizacion({ totalFormateado: '51,27 €' }) });

    expect(
      vista.fixture.nativeElement.querySelector('[data-testid="desglose-en-espera"]'),
    ).toBeNull();
    expect(screen.getByText('51,27 €')).toBeInTheDocument();
  });
});
