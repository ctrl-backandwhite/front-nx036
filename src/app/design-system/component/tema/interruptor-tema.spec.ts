import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { PreferenciasService } from '@core/preferences/preferencias';
import { InterruptorTema } from './interruptor-tema';

describe('InterruptorTema', () => {
  it('alterna entre el tema claro y el oscuro', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { fixture } = await render(InterruptorTema);
    const preferencias = TestBed.inject(PreferenciasService);
    preferencias.cambiaTema('nx036-pastel');
    fixture.detectChanges();

    await usuario.click(screen.getByRole('button'));
    expect(preferencias.tema()).toBe('nx036-pastel-dark');

    await usuario.click(screen.getByRole('button'));
    expect(preferencias.tema()).toBe('nx036-pastel');
  });

  /** El rótulo anuncia a dónde LLEVA el botón, que es lo que hace falta saber antes de pulsarlo. */
  it('el rótulo cambia con el tema activo', async () => {
    const { fixture } = await render(InterruptorTema);
    const preferencias = TestBed.inject(PreferenciasService);

    preferencias.cambiaTema('nx036-pastel');
    fixture.detectChanges();
    const rotuloEnClaro = screen.getByRole('button').getAttribute('aria-label');

    preferencias.cambiaTema('nx036-pastel-dark');
    fixture.detectChanges();
    expect(screen.getByRole('button').getAttribute('aria-label')).not.toBe(rotuloEnClaro);
  });
});
