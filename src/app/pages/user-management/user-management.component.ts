import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/dropdown';
import { AccordionModule } from 'primeng/accordion';
import { ConfirmationService, MessageService } from 'primeng/api';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { ListboxModule } from 'primeng/listbox';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, TableModule, ButtonModule, DialogModule, InputTextModule, MultiSelectModule, TagModule, ToolbarModule, ConfirmDialogModule, ToastModule, HasPermissionDirective, DropdownModule, AccordionModule, ListboxModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit {
  users: any[] = [];
  gruposTotales: any[] = [];
  userDialog: boolean = false;
  userForm!: FormGroup;
  isEdit: boolean = false;
  currentUserId: string | null = null;
  resumenPermisos: any = null;

  // 1. Separamos las listas según tu instrucción
  // PERMISOS GLOBALES
  // ==========================================
  // PERMISOS GLOBALES (Todo el sistema)
  // ==========================================
  globalPermsList = [
    {
      label: 'Privilegios de Usuarios',
      items: [
        { label: 'Ver perfil de usuario', value: 'user:view' },
        { label: 'Editar tu propio perfil', value: 'user:edit:profile' },
        { label: 'Administrar usuarios (Sidebar)', value: 'user:manage' },
        { label: 'Crear nuevos usuarios', value: 'user:add' },
        { label: 'Editar otros usuarios', value: 'user:edit' },
        { label: 'Eliminar usuarios', value: 'user:delete' }
      ]
    },
    {
      label: 'Privilegios de Grupos',
      items: [
        { label: 'Ver grupos en dashboard (Tablero)', value: 'group:view' },
        { label: 'Administrar grupos (Sidebar)', value: 'group:manage' },
        { label: 'Crear nuevos grupos', value: 'group:add' },
        { label: 'Editar detalles de grupos', value: 'group:edit' },
        { label: 'Eliminar grupos', value: 'group:delete' }
      ]
    },
    {
      label: 'Privilegios de Tickets',
      items: [
        { label: 'Admin. Total de Tickets (Para acciones)', value: 'ticket:manage' }
      ]
    }
  ];

  // ==========================================
  // PERMISOS DE GRUPO (Ámbito local)
  // ==========================================
  groupPermsList = [
    {
      label: 'Módulo de Tickets y Kanban',
      items: [
        { label: 'Ver tickets (Tablero)', value: 'ticket:view' },
        { label: 'Crear tickets', value: 'ticket:add' },
        { label: 'Editar tickets', value: 'ticket:edit' },
        //{ label: 'Mover estado en Kanban', value: 'ticket:edit:state' },
        { label: 'Comentar en tickets', value: 'ticket:edit:comment' },
        { label: 'Eliminar tickets', value: 'ticket:delete' }
      ]
    }
  ];

  // Esta variable es la que se pinta en la pantalla, y cambiará dinámicamente
  currentPermsList = this.globalPermsList;

  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private http = inject(HttpClient);

  ngOnInit() {
    this.userForm = this.fb.group({
      nombre_completo: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', Validators.required],
      direccion: ['', Validators.required],
      password: [''],
      grupo_id: [''],
      permisos_nombres: [[]],
      grupos_asignados: [[]] //  NUEVO
    });

    this.cargarUsuarios();
    this.cargarGrupos();

    // 2. MAGIA UX: Escuchamos el cambio del dropdown de grupos
    this.userForm.get('grupo_id')?.valueChanges.subscribe(val => {
      if (val) {
        // Seleccionaron un grupo: Mostramos los permisos de grupo
        this.currentPermsList = this.groupPermsList;
        // Si estamos editando, rellenamos con lo que el usuario ya tenía en ESE grupo
        if (this.resumenPermisos && this.isEdit) {
          const grupoExistente = this.resumenPermisos.por_grupo.find((g: any) => g.id === val);
          this.userForm.get('permisos_nombres')?.setValue(grupoExistente ? grupoExistente.permisos : []);
        }
      } else {
        // Modo global
        this.currentPermsList = this.globalPermsList;
        if (this.resumenPermisos && this.isEdit) {
          this.userForm.get('permisos_nombres')?.setValue(this.resumenPermisos.globales);
        } else {
          this.userForm.get('permisos_nombres')?.setValue([]);
        }
      }
    });
  }

  cargarUsuarios() {
    this.http.get<any>('http://localhost:3000/api/users').subscribe(res => this.users = res.data || []);
  }

  cargarGrupos() {
    this.http.get<any>('http://localhost:3000/api/groups').subscribe(res => this.gruposTotales = res.data || []);
  }

  openNew() {
    this.isEdit = false;
    this.currentUserId = null;
    this.userForm.reset({
      grupos_asignados: [],
      permisos_nombres: []
    });
    this.resumenPermisos = null;
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.currentPermsList = this.globalPermsList;
    this.userDialog = true;
  }

  editUser(user: any) {
    this.isEdit = true;
    this.currentUserId = user.id;
    this.resumenPermisos = null;
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();

    // 1. Obtener el resumen de permisos del backend
    this.http.get<any>(`http://localhost:3000/api/users/${user.id}/permissions-summary`).subscribe({
      next: (res) => {
        this.resumenPermisos = res.data;

        // 🔴 2. NUEVO: Obtener a qué grupos pertenece y rellenar el formulario
        this.http.get<any>(`http://localhost:3000/api/users/${user.id}/grupos`).subscribe({
          next: (gruposRes) => {
            this.userForm.patchValue({
              nombre_completo: user.nombre_completo,
              username: user.username,
              email: user.email,
              telefono: user.telefono,
              direccion: user.direccion,
              password: '',
              grupo_id: '',
              grupos_asignados: gruposRes.data || [] // <-- Ahora sí se llena el selector con los grupos
            });
            this.userDialog = true;
          }
        });
      }
    });
  }

  deleteUser(user: any) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar a ${user.nombre_completo}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete(`http://localhost:3000/api/users/${user.id}`).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario eliminado' });
            this.cargarUsuarios();
          }
        });
      }
    });
  }

  hideDialog() { this.userDialog = false; }

  saveUser() {
    if (this.userForm.invalid) return;

    const payload = { ...this.userForm.value };

    // Extraemos las variables
    const grupoSeleccionado = payload.grupo_id;
    delete payload.grupo_id;

    const gruposSeleccionados = payload.grupos_asignados;
    delete payload.grupos_asignados;

    let permisosParaGrupo: any[] = [];
    if (grupoSeleccionado) {
      permisosParaGrupo = payload.permisos_nombres;
      delete payload.permisos_nombres;
    }

    if (this.isEdit && !payload.password) delete payload.password;

    const requestUrl = this.isEdit ? `http://localhost:3000/api/users/${this.currentUserId}` : `http://localhost:3000/api/users/register`;
    const requestMethod = this.isEdit ? this.http.put : this.http.post;

    requestMethod.call(this.http, requestUrl, payload).subscribe({
      next: (res: any) => {
        const usuarioCreadoId = this.isEdit ? this.currentUserId : (res.data[0]?.id || res.data?.id);

        // 🔴 ESTO AHORA ESTÁ AFUERA: Siempre guardará los grupos seleccionados (aunque esté vacío)
        this.http.put(`http://localhost:3000/api/users/${usuarioCreadoId}/grupos`, { grupos: gruposSeleccionados }).subscribe();

        if (grupoSeleccionado) {
          this.http.post(`http://localhost:3000/api/groups/${grupoSeleccionado}/members`, {
            usuario_id: usuarioCreadoId, permisos_nombres: permisosParaGrupo
          }).subscribe({
            next: () => {
              this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario y permisos guardados' });
              this.userDialog = false;
              this.cargarUsuarios();
            }
          });
        } else {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario guardado correctamente' });
          this.userDialog = false;
          this.cargarUsuarios();
        }
      },
      error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message })
    });
  }
}