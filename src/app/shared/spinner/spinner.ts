import { Component, input } from '@angular/core';

/** Indicador de carga reutilizable. Uso: <app-spinner label="Cargando…" /> */
@Component({
  selector: 'app-spinner',
  template: `
    <span class="inline-flex items-center gap-2 text-gray-400 text-sm">
      <span class="h-4 w-4 rounded-full border-2 border-brand-300 border-t-brand-600 animate-spin"></span>
      {{ label() }}
    </span>
  `,
})
export class Spinner {
  readonly label = input('Cargando…');
}
