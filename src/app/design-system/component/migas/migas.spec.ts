import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { Migas } from './migas';

@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

/** Monta las migas y deja la aplicación en la dirección pedida. */
async function migasEn(direccion: string) {
  const vista = await render(Migas, {
    providers: [provideRouter([{ path: '**', component: Vacia }])],
  });
  await TestBed.inject(Router).navigateByUrl(direccion);
  vista.fixture.detectChanges();
  return vista;
}

describe('Migas', () => {
  it('deduce el rastro de la dirección cuando no se le dan migas', async () => {
    await migasEn('/legal/cookies');

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Legal' })).toHaveAttribute('href', '/legal');
    // El último paso no es un enlace: ya estás ahí.
    expect(screen.queryByRole('link', { name: 'Cookies' })).toBeNull();
    expect(screen.getByText('Cookies')).toBeInTheDocument();
  });

  /** Filtrar o abrir una pestaña no es navegar: no añade un paso al rastro. */
  it('ignora la parte de consulta y el ancla', async () => {
    await migasEn('/legal?orden=fecha#cookies');

    expect(screen.getByText('Legal')).toBeInTheDocument();
    expect(screen.queryByText(/orden/)).toBeNull();
  });

  it('las migas explícitas ganan a las deducidas', async () => {
    await render(Migas, {
      providers: [provideRouter([])],
      inputs: { migas: [{ etiqueta: 'Gorro de lana', destino: '/catalog/gorro' }] },
    });

    expect(screen.getByText('Gorro de lana')).toBeInTheDocument();
  });

  /**
   * Un identificador de treinta y seis caracteres no le dice nada a nadie: ocupa toda la línea y tapa
   * los pasos que sí se entienden.
   */
  it('sustituye un identificador por puntos suspensivos', async () => {
    await migasEn('/catalog/3f2504e0-4f89-11d3-9a0c-0305e82c3301');

    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('sin migas y sin inicio no pinta nada, para no dejar una franja vacía', async () => {
    await render(Migas, {
      providers: [provideRouter([])],
      inputs: { migas: [], ocultaInicio: true },
    });

    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
