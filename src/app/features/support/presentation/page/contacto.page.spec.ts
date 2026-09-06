import { TestBed } from '@angular/core/testing';
import { fireEvent, render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { CONTACTO_PORT, ContactoPort } from '../../domain/port/contacto.port';
import { QUIEN_ESCRIBE_PORT, QuienEscribePort } from '../../domain/port/quien-escribe.port';
import { ContactoPage } from './contacto.page';

describe('ContactoPage', () => {
  let contacto: ContactoPort;
  let quienEscribe: QuienEscribePort;

  beforeEach(() => {
    contacto = { envia: vi.fn().mockResolvedValue(exito(undefined)) };
    quienEscribe = { consulta: vi.fn().mockResolvedValue(exito(null)) };
  });

  async function monta() {
    return render(ContactoPage, {
      providers: [
        { provide: CONTACTO_PORT, useValue: contacto },
        { provide: QUIEN_ESCRIBE_PORT, useValue: quienEscribe },
      ],
    });
  }

  /**
   * Rellena lo mínimo y envía, esperando a que la vista se asiente: el proyecto es sin zonas, así que
   * lo que se escribe tras un `await` dentro del manejador ocurre fuera del ciclo que disparó el clic.
   */
  async function rellenaYEnvia(vista: Awaited<ReturnType<typeof monta>>) {
    fireEvent.input(vista.container.querySelector('#contacto-email') as HTMLInputElement, {
      target: { value: 'yo@ejemplo.com' },
    });
    fireEvent.input(vista.container.querySelector('#contacto-mensaje') as HTMLTextAreaElement, {
      target: { value: 'Hola' },
    });
    fireEvent.click(screen.getByRole('button'));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  }

  /**
   * Sin la atadura entre rótulo y campo, un lector de pantalla anuncia los cuatro como «texto» sin
   * decir cuál es cuál. No quitar los identificadores.
   */
  it('cada campo se puede encontrar por su rótulo', async () => {
    const vista = await monta();

    for (const id of ['contacto-nombre', 'contacto-email', 'contacto-asunto', 'contacto-mensaje']) {
      const campo = vista.container.querySelector(`#${id}`);
      expect(campo).not.toBeNull();
      expect(vista.container.querySelector(`label[for="${id}"]`)).not.toBeNull();
    }
  });

  it('manda el mensaje y lo confirma', async () => {
    const vista = await monta();

    await rellenaYEnvia(vista);

    expect(contacto.envia).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'yo@ejemplo.com', mensaje: 'Hola' }),
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('cuenta el fallo en vez de dar el mensaje por enviado', async () => {
    vi.mocked(contacto.envia).mockResolvedValue(fallo(creaError('error-del-servidor')));
    const vista = await monta();

    await rellenaYEnvia(vista);

    expect(screen.getByRole('alert').className).toContain('alert-error');
  });

  /** Con la sesión iniciada el nombre viene puesto y no se edita, igual que en las reseñas. */
  it('con sesión rellena y fija el nombre', async () => {
    vi.mocked(quienEscribe.consulta).mockResolvedValue(
      exito({ nombre: 'Ana', email: 'ana@ejemplo.com' }),
    );
    const vista = await monta();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();

    const nombre = vista.container.querySelector('#contacto-nombre') as HTMLInputElement;
    expect(nombre.value).toBe('Ana');
    expect(nombre.readOnly).toBe(true);
  });

  it('sin sesión el formulario funciona igual, solo que vacío', async () => {
    const vista = await monta();
    await vista.fixture.whenStable();

    const nombre = vista.container.querySelector('#contacto-nombre') as HTMLInputElement;
    expect(nombre.readOnly).toBe(false);
  });

  /**
   * Lo que aporta Signal Forms aquí: antes, quien se dejaba el correo veía el botón apagado y ninguna
   * explicación. El mensaje se calla hasta que el campo se ha TOCADO, para no acusar de vacío a quien
   * todavía no ha llegado a él.
   */
  it('un campo obligatorio que se deja vacío lo DICE debajo, en vez de callarse', async () => {
    const vista = await monta();
    await vista.fixture.whenStable();
    // El texto se pide al servicio de traducción y no se escribe a mano: el idioma con el que arranca
    // la aplicación en las pruebas no tiene por qué ser el mismo siempre.
    const obligatorio = TestBed.inject(TraduccionService).t('dialog.field.required');
    expect(screen.queryByText(obligatorio)).toBeNull();

    fireEvent.blur(vista.container.querySelector('#contacto-email') as HTMLInputElement);
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();

    expect(screen.getByText(obligatorio)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  /** Un correo mal escrito ya no viaja al servidor para volver rechazado. */
  it('con un correo sin forma de correo no se puede enviar', async () => {
    const vista = await monta();
    await vista.fixture.whenStable();

    fireEvent.input(vista.container.querySelector('#contacto-email') as HTMLInputElement, {
      target: { value: 'esto-no-es-un-correo' },
    });
    fireEvent.input(vista.container.querySelector('#contacto-mensaje') as HTMLTextAreaElement, {
      target: { value: 'Hola' },
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();

    expect(screen.getByRole('button')).toBeDisabled();
    expect(contacto.envia).not.toHaveBeenCalled();
  });
});
