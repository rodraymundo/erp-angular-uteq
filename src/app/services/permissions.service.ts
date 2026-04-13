import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private userPermissions = signal<string[]>([]);

  constructor() {
    this.loadPermissionsFromToken();
  }

  setPermissions(permissions: string[]) {
    this.userPermissions.set(permissions);
  }

  // Verifica si tiene UN permiso en específico
  hasPermission(permission: string): boolean {
    return this.userPermissions().includes(permission);
  }

  // NUEVO: Verifica si tiene AL MENOS UNO de los permisos en un arreglo
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(perm => this.userPermissions().includes(perm));
  }

  private loadPermissionsFromToken() {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = decodeURIComponent(escape(atob(payloadBase64)));
        const payloadJson = JSON.parse(decodedPayload);
        const perms = payloadJson.permissions || [];
        this.userPermissions.set(perms);
      } catch (error) {
        console.error('Token inválido en localStorage', error);
        this.userPermissions.set([]);
      }
    }
  }
}