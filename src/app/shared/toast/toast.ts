import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/** Snackbar global. Se monta una vez (en el Shell). */
@Component({
  selector: 'app-toast',
  template: `
    @if (svc.toast(); as t) {
      <div class="fixed bottom-5 right-5 z-[70] toast-anim
                  flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl text-white max-w-sm"
           [class]="t.tipo === 'error' ? 'bg-red-600' : t.tipo === 'info' ? 'bg-brand-600' : 'bg-green-600'">
        <span class="grid place-items-center h-6 w-6 rounded-full bg-white/20 text-sm shrink-0">
          {{ t.tipo === 'error' ? '✕' : t.tipo === 'info' ? 'i' : '✓' }}
        </span>
        <span class="text-sm font-medium">{{ t.mensaje }}</span>
      </div>
    }
  `,
})
export class Toast {
  readonly svc = inject(ToastService);
}
