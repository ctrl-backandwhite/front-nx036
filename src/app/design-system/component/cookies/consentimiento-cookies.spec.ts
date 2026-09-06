import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ConsentimientoCookies, DecisionCookies } from './consentimiento-cookies';

describe('ConsentimientoCookies', () => {
  it('una vez decidido no vuelve a ocupar la pantalla', async () => {
    await render(ConsentimientoCookies, {
      providers: [provideRouter([])],
      inputs: { decidido: true },
    });

    expect(screen.queryByRole('button')).toBeNull();
  });

  /**
   * Prometer lo que no aplica es tan incorrecto como callarse lo que sí: el régimen de consentimiento
   * previo y el de oposición no dicen lo mismo.
   */
  it('el texto se adapta al régimen del país', async () => {
    const { fixture } = await render(ConsentimientoCookies, {
      providers: [provideRouter([])],
      inputs: { regimen: 'gdpr' as const },
    });
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByText(new RegExp(t('cookies.banner.optin')))).toBeInTheDocument();

    fixture.componentRef.setInput('regimen', 'ccpa');
    fixture.detectChanges();
    expect(screen.getByText(new RegExp(t('cookies.banner.ccpa')))).toBeInTheDocument();
  });

  it('avisa de aceptar y de rechazar todo', async () => {
    const usuario = userEvent.setup({ delay: null });
    let aceptados = 0;
    let rechazados = 0;
    await render(ConsentimientoCookies, {
      providers: [provideRouter([])],
      on: { aceptaTodo: () => aceptados++, rechazaTodo: () => rechazados++ },
    });
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: t('cookies.accept_all') }));
    await usuario.click(screen.getByRole('button', { name: t('cookies.reject_all') }));

    expect(aceptados).toBe(1);
    expect(rechazados).toBe(1);
  });

  /** Las necesarias no se pueden apagar: por eso NO se pintan como un interruptor que no obedece. */
  it('al personalizar solo se pueden elegir las dos categorías opcionales', async () => {
    const usuario = userEvent.setup({ delay: null });
    const decisiones: DecisionCookies[] = [];
    await render(ConsentimientoCookies, {
      providers: [provideRouter([])],
      on: { guarda: (d: DecisionCookies) => decisiones.push(d) },
    });
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: t('cookies.customize') }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);

    await usuario.click(screen.getByRole('checkbox', { name: t('cookies.analytics') }));
    await usuario.click(screen.getByRole('button', { name: t('cookies.save') }));

    expect(decisiones).toEqual([{ analiticas: true, marketing: false }]);
  });
});
