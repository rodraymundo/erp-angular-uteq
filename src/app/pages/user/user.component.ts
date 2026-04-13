import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { PermissionsService } from '../../services/permissions.service';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, DialogModule, InputTextModule, ToastModule, ReactiveFormsModule, ConfirmDialogModule, TableModule, TagModule, HasPermissionDirective],
  providers: [MessageService, ConfirmationService],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export class UserComponent implements OnInit {
  userData: any = {};
  profileDialog: boolean = false;
  profileForm!: FormGroup;

  misTicketsAsignados: any[] = [];
  statsTickets = { abiertos: 0, progreso: 0, hechos: 0 };

  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private permsSvc = inject(PermissionsService);

  ngOnInit() {
    this.profileForm = this.fb.group({
      usuario: ['', Validators.required],
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      direccion: ['', Validators.required],
      fechaNacimiento: [''] // Opcional, ya que tu BD actual no lo pide obligatoriamente
    });

    // Leer quién está logueado desde el localStorage
    const userInfoStr = localStorage.getItem('user_info');
    if (userInfoStr) {
      const userInfo = JSON.parse(userInfoStr);
      this.cargarMisDatos(userInfo.id);
    }
  }

  // --- OBTENER MIS DATOS ---
  cargarMisDatos(myId: string) {
    // Usamos el endpoint que trae todos los usuarios y filtramos el nuestro
    this.http.get<any>('http://localhost:3000/api/users').subscribe({
      next: (res) => {
        const allUsers = res.data || [];
        const me = allUsers.find((u: any) => u.id === myId);

        if (me) {
          this.userData = {
            id: me.id,
            usuario: me.username,
            nombre: me.nombre_completo,
            email: me.email,
            telefono: me.telefono,
            direccion: me.direccion,
            fechaNacimiento: 'No registrada' // Pendiente en BD
          };
          this.cargarMisTickets();
        }
      },
      error: (err) => {
        console.error('Error cargando perfil:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falta permiso user:view para ver el perfil' });
      }
    });
  }

  // --- OBTENER MIS TICKETS ---
  cargarMisTickets() {
    this.http.get<any>('http://localhost:3000/api/tickets').subscribe({
      next: (res) => {
        const allTickets = res.data || [];
        // Filtramos solo aquellos donde el asignado coincida con mi nombre
        this.misTicketsAsignados = allTickets.filter((t: any) => t.nombreAsignado === this.userData.nombre);

        // Calculamos las métricas
        this.statsTickets.abiertos = this.misTicketsAsignados.filter(t => t.nombreEstado === 'Pendiente').length;
        this.statsTickets.progreso = this.misTicketsAsignados.filter(t => t.nombreEstado === 'En Progreso').length;
        this.statsTickets.hechos = this.misTicketsAsignados.filter(t => t.nombreEstado === 'Finalizado').length;
      },
      error: (err) => console.error('Error cargando mis tickets:', err)
    });
  }

  // --- MÉTODOS DEL PERFIL (CRUD) ---
  editProfile() {
    this.profileForm.patchValue(this.userData);
    this.profileDialog = true;
  }

  hideDialog() {
    this.profileDialog = false;
  }

  saveProfile() {
    if (this.profileForm.invalid) return;

    const formValues = this.profileForm.value;

    // Mapeamos a los nombres de columna que espera PostgreSQL
    const payload = {
      username: formValues.usuario,
      nombre_completo: formValues.nombre,
      email: formValues.email,
      telefono: formValues.telefono,
      direccion: formValues.direccion
    };

    this.http.put<any>(`http://localhost:3000/api/users/${this.userData.id}`, payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Perfil actualizado correctamente' });
        this.userData = { ...this.userData, ...formValues }; // Actualizar vista local

        // Actualizar localStorage
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        userInfo.username = formValues.usuario;
        userInfo.nombre_completo = formValues.nombre;
        localStorage.setItem('user_info', JSON.stringify(userInfo));

        this.profileDialog = false;
      },
      error: (err) => {
        const msg = err.error?.message || 'No se pudo actualizar el perfil';
        this.messageService.add({ severity: 'error', summary: 'Error de BD', detail: msg });
      }
    });
  }

  confirmDelete() {
    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas eliminar tu perfil permanentemente? Esta acción NO se puede deshacer.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete(`http://localhost:3000/api/users/${this.userData.id}`).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Tu perfil ha sido eliminado' });
            setTimeout(() => {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user_info');
              this.router.navigate(['/login']);
            }, 1500);
          },
          error: (err) => {
            const msg = err.error?.message || 'No se pudo eliminar el perfil por restricciones de base de datos.';
            this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
          }
        });
      }
    });
  }
}