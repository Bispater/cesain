import { Injectable, signal } from '@angular/core';

export type ToastTipo = 'exito' | 'error' | 'info';
export interface Toast {
  mensaje: string;
  tipo: ToastTipo;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toast = signal<Toast | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  show(mensaje: string, tipo: ToastTipo = 'exito', ms = 3000) {
    this.toast.set({ mensaje, tipo });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.toast.set(null), ms);
  }

  exito(mensaje: string) { this.show(mensaje, 'exito'); }
  error(mensaje: string) { this.show(mensaje, 'error'); }
}
