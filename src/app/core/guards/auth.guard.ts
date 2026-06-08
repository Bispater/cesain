import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo(); // espera el primer estado de sesión de Firebase
  return auth.autenticado() ? true : router.createUrlTree(['/login']);
};
