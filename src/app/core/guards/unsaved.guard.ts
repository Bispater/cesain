import { CanDeactivateFn } from '@angular/router';

/** Componentes que pueden bloquear la navegación si tienen cambios sin guardar. */
export interface PuedeSalir {
  puedeSalir: () => boolean | Promise<boolean>;
}

export const unsavedGuard: CanDeactivateFn<PuedeSalir> = (cmp) =>
  cmp.puedeSalir ? cmp.puedeSalir() : true;
