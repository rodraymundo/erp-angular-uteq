import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ConfirmationService, MessageService } from 'primeng/api';

import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { PermissionsService } from '../../services/permissions.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, TableModule, ButtonModule, CardModule,
    TagModule, ProgressBarModule, HasPermissionDirective, ToastModule,
    ConfirmDialogModule, DialogModule, DropdownModule, InputTextModule, InputTextareaModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private http = inject(HttpClient);
  public permsSvc = inject(PermissionsService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  misTicketsAsignados: any[] = [];
  loggedUserId: string = '';
  tickets: any[] = [];
  grupos: any[] = [];
  stats = { total: 0, pending: 0, completed: 0 };
  loading: boolean = true;

  // Variables para crear ticket
  displayCreateModal = false;
  ticketForm!: FormGroup;
  prioridades = ['Baja', 'Media', 'Alta'];

  ngOnInit() {
    // 1. EXTRAER EL NOMBRE DEL USUARIO AL INICIAR
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      this.loggedUserId = JSON.parse(userInfo).id;
    }

    this.ticketForm = this.fb.group({
      titulo: ['', Validators.required],
      descripcion: ['', Validators.required],
      grupo_id: ['', Validators.required],
      prioridad_id: ['Media', Validators.required],
      estado_id: ['Pendiente', Validators.required]
    });

    // 🔴 QUITAMOS EL IF: Dejamos que el Backend inteligente decida qué tickets devolver
    this.cargarTickets();

    // Este sí lo dejamos protegido porque depende de si tienes acceso a ver los cuadros de grupos
    if (this.permsSvc.hasAnyPermission(['group:view', 'group:manage'])) {
      this.cargarGrupos();
    }
  }

  // --- OBTENER DATOS DE LA BD ---
  cargarGrupos() {
    this.http.get<any>('http://localhost:3000/api/groups').subscribe({
      next: (res) => this.grupos = res.data || [],
      error: (err) => console.error('Error al cargar grupos', err)
    });
  }

  cargarTickets() {
    this.loading = true;
    this.http.get<any>('http://localhost:3000/api/tickets').subscribe({
      next: (res) => {
        this.tickets = res.data || [];

        // 2. FILTRAR SOLO MIS TICKETS PARA LA TABLA INFERIOR
        this.misTicketsAsignados = this.tickets.filter((t: any) => t.asignado_id === this.loggedUserId);

        this.calcularEstadisticas();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando tickets', err);
        this.loading = false;
      }
    });
  }

  calcularEstadisticas() {
    // 🔴 Ahora las estadísticas se calculan basándose SOLO en mis tickets
    this.stats.total = this.misTicketsAsignados.length;
    this.stats.pending = this.misTicketsAsignados.filter(t => t.nombreEstado !== 'Finalizado').length;
    this.stats.completed = this.misTicketsAsignados.filter(t => t.nombreEstado === 'Finalizado').length;
  }

  // --- NAVEGACIÓN ---
  irAlTablero(grupoId: string) {
    this.router.navigate(['/home/group', grupoId]);
  }

  // --- ACCIONES DE TICKETS ---
  abrirModalTicket() {
    this.ticketForm.reset({ estado_id: 'Pendiente', prioridad_id: 'Media' });
    this.displayCreateModal = true;
  }

  guardarTicket() {
    if (this.ticketForm.invalid) return;

    this.http.post<any>('http://localhost:3000/api/tickets', this.ticketForm.value).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Ticket guardado exitosamente' });
        this.displayCreateModal = false;
        this.cargarTickets(); // Recargar la tabla
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el ticket' });
      }
    });
  }

  eliminarTicket(ticket: any) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar el ticket: "${ticket.titulo}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete(`http://localhost:3000/api/tickets/${ticket.id}`).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Ticket eliminado correctamente' });
            this.cargarTickets();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' })
        });
      }
    });
  }
}