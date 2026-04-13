import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { PermissionsService } from '../services/permissions.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private permissionsService = inject(PermissionsService);

  private hasView = false;
  private requiredPermission = '';

  constructor() {
    // Effect escucha cambios en el Signal del servicio y actualiza la vista dinámicamente
    effect(() => {
      this.updateView();
    });
  }

  @Input() set appHasPermission(permission: string) {
    this.requiredPermission = permission;
    this.updateView();
  }

  private updateView() {
    // Verificamos en el servicio si el usuario tiene el permiso
    const hasPerm = this.permissionsService.hasPermission(this.requiredPermission);

    if (hasPerm && !this.hasView) {
      // Si TIENE permiso y la vista NO existe -> La creamos
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPerm && this.hasView) {
      // Si NO tiene permiso y la vista EXISTE -> La destruimos (desaparece del HTML)
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}