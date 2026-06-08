import { Injectable, signal } from '@angular/core';

export interface ConfirmOpts {
  titulo?: string;
  mensaje: string;
  confirmar?: string;
  cancelar?: string;
  /** 'peligro' pinta el botón de confirmar en rojo (para eliminar). */
  tono?: 'peligro' | 'normal';
}

interface ConfirmState extends Required<ConfirmOpts> {}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly estado = signal<ConfirmState | null>(null);
  private resolver?: (v: boolean) => void;

  /** Abre el diálogo y resuelve true (aceptar) / false (cancelar). */
  ask(opts: ConfirmOpts): Promise<boolean> {
    this.estado.set({
      titulo: opts.titulo ?? 'Confirmar',
      mensaje: opts.mensaje,
      confirmar: opts.confirmar ?? 'Aceptar',
      cancelar: opts.cancelar ?? 'Cancelar',
      tono: opts.tono ?? 'normal',
    });
    return new Promise<boolean>((resolve) => (this.resolver = resolve));
  }

  responder(valor: boolean) {
    this.estado.set(null);
    this.resolver?.(valor);
    this.resolver = undefined;
  }
}
