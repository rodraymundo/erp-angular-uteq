import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { PermissionsService } from '../../services/permissions.service'; // <-- NUEVO

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [MenuModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  items: MenuItem[] = [];
  private permsSvc = inject(PermissionsService); // <-- Inyectamos el servicio
  private router = inject(Router);

  ngOnInit() {
    this.items = [
      { label: 'Panel Principal', icon: 'pi pi-home', routerLink: '/home' },

      // Solo lo ve quien tiene group:manage
      ...(this.permsSvc.hasPermission('group:manage')
        ? [{ label: 'Gestión de Grupos', icon: 'pi pi-sitemap', routerLink: '/home/group' }]
        : []),

      // Solo lo ve quien tiene user:manage
      ...(this.permsSvc.hasPermission('user:manage')
        ? [{ label: 'Gestión de Usuarios', icon: 'pi pi-users', routerLink: '/home/users' }]
        : []),

      // Solo lo ve quien tiene user:view
      ...(this.permsSvc.hasPermission('user:view')
        ? [{ label: 'Mi Perfil', icon: 'pi pi-user', routerLink: '/home/user' }]
        : []),

      { separator: true },
      { label: 'Cerrar Sesión', icon: 'pi pi-sign-out', command: () => this.cerrarSesion() }
    ];
  }
  cerrarSesion() {
    localStorage.removeItem('auth_token');
    this.router.navigate(['/login']); // Lo mandamos al login
  }
}