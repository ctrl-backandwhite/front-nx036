import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { SugerenciaParaLaCesta } from '../../domain/model/cesta';
import { GloboDeSugerencias } from './globo-de-sugerencias';

const POR_ARANCEL: SugerenciaParaLaCesta = {
  id: 'p1',
  slug: 'calcetines',
  titulo: 'Calcetines de lana',
  motivo: 'DUTY',
  envioExtra: '0,60 €',
};

const POR_ENVIO: SugerenciaParaLaCesta = {
  id: 'p2',
  slug: 'gorra',
  titulo: 'Gorra',
  motivo: 'SHIPPING',
  envioExtra: '0,80 €',
  envioSuelto: '4,20 €',
};

async function monta(sugerencias: SugerenciaParaLaCesta[], hueco = null) {
  return render(GloboDeSugerencias, {
    providers: [provideRouter([])],
    inputs: { sugerencias, hueco },
  });
}

describe('GloboDeSugerencias', () => {
  it('enseña lo que conviene añadir', async () => {
    await monta([POR_ARANCEL]);

    expect(screen.getByText('Calcetines de lana')).toBeInTheDocument();
  });

  /**
   * Anunciar «sin arancel extra» cuando la razón es el envío sería prometer un ahorro que la aduana no
   * da, y quien está a punto de pagar comprueba la cifra.
   */
  it('cuando el ahorro es del envío, no habla de aduana', async () => {
    await monta([POR_ENVIO]);

    expect(screen.getByText(/4,20 €/)).toBeInTheDocument();
    // Y desaparece el enlace al catálogo por partidas arancelarias, que aquí no vendría a cuento.
    expect(screen.queryByText(/arancel/i)).toBeNull();
  });

  it('cuando el ahorro es de aduana, ofrece ver todo lo que tampoco suma', async () => {
    await monta([POR_ARANCEL]);

    const enlace = screen.getAllByRole('link').at(-1);
    expect(enlace).toHaveAttribute('href', '/catalog?grupo=carrito');
  });

  it('dice cuánto sitio queda en el paquete, que es el dato que cambia la decisión', async () => {
    await monta([POR_ARANCEL], { gramos: 340, otroBulto: '3,00 €' } as never);

    expect(screen.getByText('340 g')).toBeInTheDocument();
  });

  it('el que se está añadiendo tiene su botón apagado, y solo ese', async () => {
    const vista = await render(GloboDeSugerencias, {
      providers: [provideRouter([])],
      inputs: { sugerencias: [POR_ARANCEL, POR_ENVIO], anadiendo: 'calcetines' },
    });

    const botones = vista.container.querySelectorAll('button.btn');
    expect(botones[0]).toBeDisabled();
    expect(botones[1]).not.toBeDisabled();
  });
});
