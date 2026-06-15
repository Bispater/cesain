import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Permite solo a administradores; el rol 'apsorad' se redirige a su módulo. */
export const soloAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo();
  return auth.esAdmin() ? true : router.createUrlTree(['/apsorad']);
};
