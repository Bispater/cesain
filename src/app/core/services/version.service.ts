import { Injectable, signal } from '@angular/core';
import { APP_VERSION } from '../version';

/**
 * Detecta cuando se publicó una versión nueva (comparando la versión del bundle
 * en ejecución con `version.json` del hosting) y avisa al usuario para recargar.
 * Evita el "freeze" de clientes con una versión vieja en caché.
 */
@Injectable({ providedIn: 'root' })
export class VersionService {
  readonly hayActualizacion = signal(false);
  private readonly actual = APP_VERSION;

  /** Arranca el chequeo periódico (al inicio, cada 3 min y al volver a la pestaña). */
  iniciar() {
    this.chequear();
    setInterval(() => this.chequear(), 3 * 60 * 1000);
    window.addEventListener('focus', () => this.chequear());
  }

  /** Marca que hay actualización (lo usa también el manejador de errores de chunk). */
  marcarActualizacion() {
    this.hayActualizacion.set(true);
  }

  recargar() {
    location.reload();
  }

  private async chequear() {
    if (this.actual === 'dev' || this.hayActualizacion()) return; // dev o ya avisado
    try {
      const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) return;
      const data = (await r.json()) as { version?: string };
      if (data.version && data.version !== this.actual) {
        this.hayActualizacion.set(true);
      }
    } catch {
      /* sin conexión: ignorar */
    }
  }
}
