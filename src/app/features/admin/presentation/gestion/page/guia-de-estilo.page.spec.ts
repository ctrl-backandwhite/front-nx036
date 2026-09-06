import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen, waitFor } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { GuiaDeEstiloPage } from './guia-de-estilo.page';
import { instalaObservadorDeVisibilidad } from '../pruebas/visibilidad';

/**
 * El DOM simulado de las pruebas NO trae `IntersectionObserver`, que es lo que usa `@defer (on
 * viewport)` para saber cuándo se llega a un bloque. Sin el doble, montar la pantalla revienta con
 * «IntersectionObserver is not defined» y el fallo parece del componente cuando es del entorno.
 */
instalaObservadorDeVisibilidad();

/**
 * El tema activo sale de la cookie de preferencias, igual que en la aplicación. Se fija aquí en vez de
 * doblar el servicio para comprobar lo que de verdad importa de esta cabecera: que lo que se enseña es
 * el tema REAL, el mismo que acaba en `data-theme`, y no una etiqueta escrita a mano.
 */
function conTema(tema: string): void {
  document.cookie = `nx036-theme=${tema}`;
}

/**
 * Plazo ampliado: la guía monta la paleta, los botones, las alertas y la tabla de golpe, y las consultas
 * de Testing Library recorren ese árbol entero. Con varias suites corriendo a la vez, los cinco segundos
 * por defecto se agotan sin que nada esté mal.
 */
const PLAZO_MS = 20000;

describe('GuiaDeEstiloPage', () => {

  beforeEach(() => {
    conTema('nx036-pastel-dark');
  });

  it('dice qué tema está activo', async () => {
    await render(GuiaDeEstiloPage, { deferBlockBehavior: DeferBlockBehavior.Playthrough });

    expect(screen.getByText('nx036-pastel-dark')).toBeInTheDocument();
  }, PLAZO_MS);

  it('documenta cada color del tema con su token, que es lo que se busca al depurar un estilo', async () => {
    await render(GuiaDeEstiloPage, { deferBlockBehavior: DeferBlockBehavior.Playthrough });

    expect(screen.getByText('--color-primary')).toBeInTheDocument();
    expect(screen.getByText('--color-base-300')).toBeInTheDocument();
    expect(screen.getByText('--color-error')).toBeInTheDocument();
  }, PLAZO_MS);

  /**
   * Los cuadrados de color llevan la clase ENTERA (`bg-primary`), no compuesta a partir del nombre.
   * Tailwind lee las clases del código como texto: una construida al vuelo no se genera y la paleta
   * saldría transparente. Es un fallo que no rompe nada y por eso pasa desapercibido: se vigila aquí.
   */
  it('pinta las muestras con clases que Tailwind puede encontrar en el código', async () => {
    const { container } = await render(GuiaDeEstiloPage, { deferBlockBehavior: DeferBlockBehavior.Playthrough });

    expect(container.querySelector('.bg-primary')).not.toBeNull();
    expect(container.querySelector('.bg-success')).not.toBeNull();
  }, PLAZO_MS);

  it('los botones de solo icono tienen nombre accesible, que es el ejemplo que se copiará', async () => {
    await render(GuiaDeEstiloPage, { deferBlockBehavior: DeferBlockBehavior.Playthrough });

    // Se busca por el NOMBRE accesible (`getByLabelText`): si el `aria-label` desapareciera, estos
    // botones no tendrían forma de nombrarse y la consulta no encontraría nada.
    expect(screen.getByLabelText('add')).toBeInTheDocument();
    expect(screen.getByLabelText('edit')).toBeInTheDocument();
    expect(screen.getByLabelText('delete')).toBeInTheDocument();
  }, PLAZO_MS);

  it('los cuatro avisos se anuncian como tales', async () => {
    await render(GuiaDeEstiloPage, { deferBlockBehavior: DeferBlockBehavior.Playthrough });

    expect(screen.getAllByRole('alert')).toHaveLength(4);
  }, PLAZO_MS);

  it('los indicadores usan la minigráfica del panel y no una copia', async () => {
    const { container } = await render(GuiaDeEstiloPage, { deferBlockBehavior: DeferBlockBehavior.Playthrough });

    // Se ESPERA: el bloque diferido se resuelve una microtarea después de montar, así que afirmar sin
    // más mide el instante anterior a que llegue.
    await waitFor(() => expect(container.querySelectorAll('nx-minigrafica')).toHaveLength(3));
    // Decorativa: la cifra ya está escrita al lado y anunciarla dos veces estorba.
    expect(container.querySelector('nx-minigrafica svg')?.getAttribute('aria-hidden')).toBe('true');
  }, PLAZO_MS);

  it('la tabla de ejemplo se desplaza dentro de su recuadro, no arrastrando la página', async () => {
    const { container } = await render(GuiaDeEstiloPage, { deferBlockBehavior: DeferBlockBehavior.Playthrough });

    expect(container.querySelector('.overflow-x-auto table')).not.toBeNull();
  }, PLAZO_MS);
});
