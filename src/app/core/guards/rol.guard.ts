import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Área de gestión (todo menos APSORAD): admin y superadmin. */
export const soloAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo();
  return auth.puedeAdmin() ? true : router.createUrlTree(['/apsorad']);
};

/** Módulo APSORAD: superadmin y apsorad. */
export const apsoradGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo();
  return auth.puedeApsorad() ? true : router.createUrlTree(['/']);
};
