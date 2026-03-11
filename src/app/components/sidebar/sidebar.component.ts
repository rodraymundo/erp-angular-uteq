import { Component, OnInit, inject } from '@angular/core';
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

  ngOnInit() {
    this.items = [
      { label: 'Panel Principal', icon: 'pi pi-home', routerLink: '/home' },

      // Solo insertamos este botón en el arreglo si el usuario tiene 'group:admin'
      ...(this.permsSvc.hasPermission('group:view')
        ? [{ label: 'Grupos', icon: 'pi pi-sitemap', routerLink: '/home/group' }]
        : []),

      // Solo insertamos este botón si el usuario tiene permiso 's:view'
      ...(this.permsSvc.hasPermission('users:view')
        ? [{ label: 'Gestión Usuarios', icon: 'pi pi-users', routerLink: '/home/users' }]
        : []),

      { label: 'Mi Perfil', icon: 'pi pi-user', routerLink: '/home/user' },
      { separator: true },
      { label: 'Cerrar Sesión', icon: 'pi pi-sign-out', routerLink: '/login' }
    ];
  }
}