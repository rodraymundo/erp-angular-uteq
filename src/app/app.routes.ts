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
            },
            {
                // Ruta para ver la tabla con todos los grupos (CRUD)
                path: 'group',
                loadComponent: () => import('./pages/group/group.component').then(m => m.GroupComponent)
            },
            {
                // Ruta para abrir automáticamente el Kanban de un grupo específico
                path: 'group/:id',
                loadComponent: () => import('./pages/group/group.component').then(m => m.GroupComponent)
            },
            {
                // Ruta de Usuarios (/home/user)
                path: 'user',
                loadComponent: () => import('./pages/user/user.component').then(m => m.UserComponent)
            },
            {
                // Ruta para la Gestión de Usuarios (Admin)
                path: 'users',
                loadComponent: () => import('./pages/user-management/user-management.component').then(m => m.UserManagementComponent)
            }
        ]
    }
];