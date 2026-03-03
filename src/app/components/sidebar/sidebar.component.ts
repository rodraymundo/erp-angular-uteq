import { Component } from '@angular/core';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [MenuModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  items: MenuItem[] = [
    { label: 'Panel Principal', icon: 'pi pi-home', routerLink: '/home' },
    { label: 'Grupos', icon: 'pi pi-sitemap', routerLink: '/home/group' },
    { label: 'Usuarios', icon: 'pi pi-user', routerLink: '/home/user' },
    { separator: true },
    { label: 'Cerrar Sesión', icon: 'pi pi-sign-out', routerLink: '/login' }
  ];
}