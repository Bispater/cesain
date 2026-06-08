import { Component, inject } from '@angular/core';
import { ConfirmService } from './confirm.service';

/** Diálogo global de confirmación. Se monta una vez (en el Shell). */
@Component({
  selector: 'app-confirm-dialog',
  template: `
    @if (svc.estado(); as c) {
      <div class="fixed inset-0 bg-black/40 grid place-items-center z-[60] p-4"
           (click)="svc.responder(false)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">
          <div class="flex items-start gap-3">
            <div class="h-10 w-10 rounded-full grid place-items-center shrink-0"
                 [class]="c.tono === 'peligro' ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600'">
              <span class="text-lg">{{ c.tono === 'peligro' ? '🗑' : '?' }}</span>
            </div>
            <div>
              <h2 class="text-base font-bold text-gray-800">{{ c.titulo }}</h2>
              <p class="text-sm text-gray-600 mt-1">{{ c.mensaje }}</p>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button (click)="svc.responder(false)"
                    class="rounded-lg border border-gray-200 text-gray-600 px-4 py-2 text-sm hover:bg-gray-50">
              {{ c.cancelar }}
            </button>
            <button (click)="svc.responder(true)"
                    class="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                    [class]="c.tono === 'peligro' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'">
              {{ c.confirmar }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialog {
  readonly svc = inject(ConfirmService);
}
