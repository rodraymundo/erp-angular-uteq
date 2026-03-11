import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  // Lista simple de permisos del usuario (simulando los que vienen del JWT)
  private userPermissions = signal<string[]>([]);

  // Cargar permisos al login
  setPermissions(perms: string[]) {
    this.userPermissions.set(perms);
  }

  // ¿TIENE permiso? SIMPLE
  hasPermission(permiso: string): boolean {
    return this.userPermissions().includes(permiso);
  }

  // Múltiples permisos (cualquiera)
  hasAnyPermission(perms: string[]): boolean {
    return perms.some(p => this.hasPermission(p));
  }
}