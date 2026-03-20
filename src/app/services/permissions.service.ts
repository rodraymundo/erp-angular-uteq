import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private userPermissions = signal<string[]>([]);

  constructor() {
    // Al cargar la app, revisamos si ya había permisos guardados (sobrevive a F5)
    const savedPerms = localStorage.getItem('user_permissions');
    if (savedPerms) {
      this.userPermissions.set(JSON.parse(savedPerms));
    }
  }

  // Guardar permisos en memoria y en localStorage
  setPermissions(perms: string[]) {
    this.userPermissions.set(perms);
    localStorage.setItem('user_permissions', JSON.stringify(perms));
  }

  // Método para cuando el usuario cierra sesión
  clearPermissions() {
    this.userPermissions.set([]);
    localStorage.removeItem('user_permissions');
  }

  hasPermission(permiso: string): boolean {
    return this.userPermissions().includes(permiso);
  }

  hasAnyPermission(perms: string[]): boolean {
    return perms.some(p => this.hasPermission(p));
  }
}