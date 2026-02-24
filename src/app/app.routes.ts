import { Routes } from '@angular/router';

export const routes: Routes = [
    // Ruta por defecto (cuando entras a localhost:4200)
    {
        path: '',
        redirectTo: 'landing',
        pathMatch: 'full'
    },
    // Landing Page
    {
        path: 'landing',
        loadComponent: () => import('./pages/landing-page/landing-page.component').then(m => m.LandingPageComponent)
    },
    // Login con validaciones
    {
        path: 'login',
        loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent)
    },
    // Registro con validaciones
    {
        path: 'registro',
        loadComponent: () => import('./pages/auth/registro/registro.component').then(m => m.RegistroComponent)
    }
];