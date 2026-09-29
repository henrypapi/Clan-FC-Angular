
import { Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../core/services/auth.service';
const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.currentUser() && allowedRoles.includes(auth.currentUser()!.rol)) {
      return true;
    }
    return router.parseUrl('/login');
  };
};
export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home.page').then(m => m.HomePage) },
  { path: 'login', loadComponent: () => import('./pages/login.page').then(m => m.LoginPage) },
  { path: 'catalogo', loadComponent: () => import('./pages/catalog.page').then(m => m.CatalogPage) },
  { path: 'carrito', loadComponent: () => import('./pages/cart.page').then(m => m.CartPage) },
  { path: 'registro', redirectTo: 'login' },
  {
    path: 'pos',
    loadComponent: () => import('./pages/pos.page').then(m => m.PosPage),
    canActivate: [roleGuard(['CAJERO', 'ADMIN'])]
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin.page').then(m => m.AdminPage),
    canActivate: [roleGuard(['ADMIN'])]
  },
  { path: '**', redirectTo: '' }
];
