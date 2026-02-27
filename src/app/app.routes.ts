import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: 'landing', pathMatch: 'full' },
    {
        path: 'landing',
        loadComponent: () => import('./pages/landing-page/landing-page.component').then(m => m.LandingPageComponent)
    },
    {
        path: 'login',
        loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'registro',
        loadComponent: () => import('./pages/auth/registro/registro.component').then(m => m.RegistroComponent)
    },
    // NUEVA SECCIÓN DE LAYOUT
    {
        path: 'home',
        loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
        children: [
            {
                // Ruta vacía significa que al entrar a '/home' cargará esto por defecto en el <router-outlet> del MainLayout
                path: '',
                loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
            }
        ]
    }
];