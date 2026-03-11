import { Directive, Input, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { PermissionsService } from '../services/permissions.service';

@Directive({
  selector: '[ifHasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit {
  // Recibe un string o un arreglo de strings
  @Input('ifHasPermission') permisos: string | string[] = '';

  private permissionsSvc = inject(PermissionsService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  ngOnInit() {
    // Convierte a arreglo si solo enviaron un string
    const permisosArray = Array.isArray(this.permisos) ? this.permisos : [this.permisos];

    // Verifica si tiene el permiso
    if (this.permissionsSvc.hasAnyPermission(permisosArray)) {
      this.viewContainer.createEmbeddedView(this.templateRef); // Muestra el elemento
    } else {
      this.viewContainer.clear(); // Oculta/Destruye el elemento
    }
  }
}