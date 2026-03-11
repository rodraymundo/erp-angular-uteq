import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PermissionsService } from './services/permissions.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'ERP';
  private permsSvc = inject(PermissionsService);

  ngOnInit() {
    const jwtPerms = [

      // PERMISOS SUPER ADMIN

      //----- GRUPOS -----
      'group:view', // VER CRUD 
      'group:add', // CREAR
      'group:edit', //EDITAR
      'group:delete', // ELIMINAR
      'group-user:add', // AGREGAR USUARIOS A UN GRUPO
      'group-user:delete', // ELIMINAR USUARIOS DE UN GRUPO

      //----- USUARIOS -----
      'users:view',  // VER CRUD
      'users:create', // CREAR
      'users:edit',   // EDITAR 
      'user:delete', // ELIMINAR

      //----- TICKETS -----
      'ticket:create', // CREAR  
      'ticket:edit', // EDITAR 
      'ticket:delete' // ELIMINAR  
    ];

    this.permsSvc.setPermissions(jwtPerms);
  }
}