import { Component, inject } from '@angular/core';
import { VersionService } from '../../core/services/version.service';

/** Aviso fijo arriba cuando hay una versión nueva publicada. */
@Component({
  selector: 'app-update-banner',
  template: `
    @if (version.hayActualizacion()) {
      <div class="fixed top-0 inset-x-0 z-[80] bg-amber-500 text-amber-950 text-sm
                  px-4 py-2.5 flex items-center justify-center gap-3 shadow">
        <span>⚠ Hay una versión nueva. Actualiza la página para continuar.</span>
        <button (click)="version.recargar()"
                class="rounded-lg bg-amber-950 text-white font-semibold px-3 py-1 hover:bg-black">
          Actualizar ahora
        </button>
      </div>
    }
  `,
})
export class UpdateBanner {
  readonly version = inject(VersionService);
}
