import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
import { ConfirmationService, MessageService } from 'primeng/api';
import { HasPermissionDirective } from '../../directives/has-permission.directive';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [ReactiveFormsModule, CardModule, TableModule, ButtonModule, DialogModule, InputTextModule, MultiSelectModule, TagModule, ToolbarModule, ConfirmDialogModule, ToastModule, HasPermissionDirective],
  providers: [MessageService, ConfirmationService],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit {
  users: any[] = [];
  userDialog: boolean = false;
  userForm!: FormGroup;
  isEdit: boolean = false;
  currentUserId: number | null = null;

  // Lista de todos los permisos disponibles en el sistema
  availablePermissions = [
    { label: 'Ver Grupos', value: 'group:view' },
    { label: 'Crear Grupos', value: 'group:add' },
    { label: 'Editar Grupos', value: 'group:edit' },
    { label: 'Eliminar Grupos', value: 'group:delete' },
    { label: 'Eliminar usuarios de un grupo', value: 'group-user:delete' },
    { label: 'Añadir Miembros a un grupo', value: 'group-user:add' },
    { label: 'Admin Usuarios', value: 'users:view' },
    { label: 'Crear Usuarios', value: 'users:create' },
    { label: 'Editar Usuarios', value: 'users:edit' },
    { label: 'Eliminar Usuarios', value: 'user:delete' },
    { label: 'Crear Tickets', value: 'ticket:create' },
    { label: 'Editar Tickets', value: 'ticket:edit' },
    { label: 'Eliminar Tickets', value: 'ticket:delete' }
  ];

  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  ngOnInit() {
    // Usuarios simulados (Mock data)
    this.users = [
      { id: 1, nombre: 'Raymundo Rodríguez', email: 'admin@uteq.edu.mx', permisos: ['group:view', 'group:new', 'users:view', 'users:edit', 'ticket:create'] },
      { id: 2, nombre: 'Santiago Pérez', email: 'santiago@uteq.edu.mx', permisos: ['group:view', 'ticket:create', 'ticket:edit'] }
    ];

    this.userForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      permisos: [[]] // Arreglo vacío por defecto
    });
  }

  openNew() {
    this.isEdit = false;
    this.userForm.reset({ permisos: [] });
    this.userDialog = true;
  }

  editUser(user: any) {
    this.isEdit = true;
    this.currentUserId = user.id;
    this.userForm.patchValue(user);
    this.userDialog = true;
  }

  deleteUser(user: any) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar a ${user.nombre}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.users = this.users.filter(u => u.id !== user.id);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario eliminado' });
      }
    });
  }

  hideDialog() {
    this.userDialog = false;
  }

  saveUser() {
    if (this.userForm.invalid) return;

    if (this.isEdit) {
      const index = this.users.findIndex(u => u.id === this.currentUserId);
      this.users[index] = { ...this.userForm.value, id: this.currentUserId };
    } else {
      this.users.push({ ...this.userForm.value, id: Math.floor(Math.random() * 1000) });
    }

    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario guardado' });
    this.userDialog = false;
  }
}