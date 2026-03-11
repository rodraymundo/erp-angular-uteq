import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

// --- NUEVAS IMPORTACIONES PARA LA TABLA ---
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-user',
  standalone: true,
  // Aquí agregamos TableModule y TagModule
  imports: [CardModule, ButtonModule, DialogModule, InputTextModule, ToastModule, ReactiveFormsModule, ConfirmDialogModule, TableModule, TagModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export class UserComponent implements OnInit {
  userData: any = {};
  profileDialog: boolean = false;
  profileForm!: FormGroup;

  // Nuevas variables para cumplir con el Requerimiento 6 del PDF
  misTicketsAsignados: any[] = [];
  statsTickets = { abiertos: 0, progreso: 0, hechos: 0 };

  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  ngOnInit() {
    this.userData = {
      usuario: 'ray_naranjo',
      nombre: 'Raymundo Rodríguez Naranjo',
      email: 'admin@uteq.edu.mx',
      telefono: '4421234567',
      direccion: 'Av. Universidad Tecnológica 1, Querétaro',
      fechaNacimiento: '2002-08-15'
    };

    this.profileForm = this.fb.group({
      usuario: ['', Validators.required],
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      direccion: ['', Validators.required],
      fechaNacimiento: ['', Validators.required]
    });

    // Simulamos que el sistema busca tus tickets en la base de datos
    this.misTicketsAsignados = [
      { id: 'T-01', titulo: 'Diseñar BD', estado: 'En Progreso', prioridad: 'Alta', grupo: 'IDGS14' },
      { id: 'T-05', titulo: 'Corregir Login', estado: 'Pendiente', prioridad: 'Media', grupo: 'IDGS14' },
      { id: 'T-12', titulo: 'Desplegar Servidor', estado: 'Finalizado', prioridad: 'Alta', grupo: 'ITIC91' }
    ];

    // Calculamos las estadísticas reales
    this.statsTickets.abiertos = this.misTicketsAsignados.filter(t => t.estado === 'Pendiente').length;
    this.statsTickets.progreso = this.misTicketsAsignados.filter(t => t.estado === 'En Progreso').length;
    this.statsTickets.hechos = this.misTicketsAsignados.filter(t => t.estado === 'Finalizado').length;
  }

  // --- MÉTODOS DEL PERFIL ---
  editProfile() {
    this.profileForm.patchValue(this.userData);
    this.profileDialog = true;
  }

  hideDialog() {
    this.profileDialog = false;
  }

  saveProfile() {
    if (this.profileForm.invalid) return;

    this.userData = { ...this.profileForm.value };
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Perfil actualizado correctamente', life: 3000 });
    this.profileDialog = false;
  }

  confirmDelete() {
    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas eliminar tu perfil de forma permanente? Esta acción no se puede deshacer.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Tu perfil ha sido eliminado', life: 3000 });
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      }
    });
  }
}