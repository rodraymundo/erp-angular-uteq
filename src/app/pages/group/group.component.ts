import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToolbarModule } from 'primeng/toolbar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DragDropModule } from 'primeng/dragdrop'; // <-- IMPORTANTE PARA EL DRAG & DROP
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionsService } from '../../services/permissions.service';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CardModule, TableModule, ButtonModule, DialogModule, InputTextModule, ConfirmDialogModule, ToastModule, ToolbarModule, SelectButtonModule, TagModule, TimelineModule, DropdownModule, InputTextareaModule, DragDropModule, HasPermissionDirective],
  providers: [MessageService, ConfirmationService],
  templateUrl: './group.component.html',
  styleUrl: './group.component.css'
})
export class GroupComponent implements OnInit {
  selectedGroupForBoard: any = null;
  groups: any[] = [];
  groupDialog: boolean = false;
  groupForm!: FormGroup;
  isEdit: boolean = false;
  currentGroupId: number | null = null;
  loggedUser = 'Raymundo Rodríguez';

  viewOptions: any[] = [{ label: 'Kanban', value: 'kanban', icon: 'pi pi-th-large' }, { label: 'Lista', value: 'list', icon: 'pi pi-list' }];
  selectedView: string = 'kanban';

  tickets: any[] = [];
  usuariosGrupo = ['Raymundo Rodríguez', 'Santiago Pérez', 'Ana Gómez'];
  nuevoMiembroEmail: string = '';
  prioridades = ['Baja', 'Media', 'Alta'];
  estados = ['Pendiente', 'En Progreso', 'Revisión', 'Finalizado'];

  displayTicketModal = false;
  displayCreateModal = false;
  selectedTicket: any = null;
  ticketForm!: FormGroup;
  isEditTicket: boolean = false;

  // Variables nuevas para Comentarios, Filtros y Drag&Drop
  nuevoComentario: string = '';
  filtroActivo: string = 'todos';
  draggedTicket: any | null = null;

  public permsSvc = inject(PermissionsService);


  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit() {
    this.groups = [
      { id: 1, nombre: 'IDGS14', nivel: 'Avanzado', autor: 'Profe Luis', integrantes: 25, descripcion: 'Grupo de desarrollo' },
      { id: 2, nombre: 'ITIC91', nivel: 'Intermedio', autor: 'Profe Juan', integrantes: 20, descripcion: 'Redes' }
    ];

    this.groupForm = this.fb.group({
      nombre: ['', Validators.required], nivel: ['', Validators.required], autor: [this.loggedUser, Validators.required],
      integrantes: [0, [Validators.required, Validators.min(1)]], descripcion: ['']
    });

    this.ticketForm = this.fb.group({
      titulo: ['', Validators.required], descripcion: ['', Validators.required], estado: ['Pendiente', Validators.required],
      asignadoA: [''], prioridad: ['', Validators.required], fechaLimite: ['', Validators.required]
    });

    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      if (idStr) {
        // Si hay un ID en la URL, buscamos el grupo y abrimos su tablero automáticamente
        const grupoEncontrado = this.groups.find(g => g.id === Number(idStr));
        if (grupoEncontrado) {
          this.abrirTablero(grupoEncontrado);
        }
      } else {
        // Si no hay ID (entramos desde el sidebar), mostramos la tabla normal
        this.selectedGroupForBoard = null;
      }
    });
  }

  // --- CRUD GRUPOS ---
  openNewGroup() { this.isEdit = false; this.groupForm.reset(); this.groupForm.patchValue({ autor: this.loggedUser, integrantes: 0 }); this.groupDialog = true; }
  editGroup(group: any) { this.isEdit = true; this.currentGroupId = group.id; this.groupForm.patchValue(group); this.groupDialog = true; }
  deleteGroup(group: any) {
    this.confirmationService.confirm({
      message: '¿Eliminar grupo ' + group.nombre + '?', header: 'Confirmar', icon: 'pi pi-exclamation-triangle', acceptButtonStyleClass: 'p-button-danger',
      accept: () => { this.groups = this.groups.filter(g => g.id !== group.id); this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Grupo eliminado' }); }
    });
  }
  hideGroupDialog() { this.groupDialog = false; }
  saveGroup() {
    if (this.groupForm.invalid) return;
    if (this.isEdit) {
      const index = this.groups.findIndex(g => g.id === this.currentGroupId);
      this.groups[index] = { ...this.groupForm.value, id: this.currentGroupId };
    } else { this.groups.push({ ...this.groupForm.value, id: Math.floor(Math.random() * 1000) }); }
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Grupo guardado' });
    this.groupDialog = false;
  }

  // --- TRANSICIÓN A TABLERO ---
  abrirTablero(group: any) {
    this.selectedGroupForBoard = group;
    this.tickets = [
      { id: 'T-01', titulo: 'Diseñar BD', descripcion: 'Esquema inicial', estado: 'En Progreso', asignadoA: 'Raymundo Rodríguez', prioridad: 'Alta', fechaCreacion: new Date('2026-03-01'), fechaLimite: new Date('2026-03-10'), comentarios: ['Se ajustó la tabla de usuarios.'], historial: [{ status: 'Creado', date: '01/03/2026', user: 'Admin' }] },
      { id: 'T-02', titulo: 'Login UI', descripcion: 'Pantalla Angular', estado: 'Pendiente', asignadoA: '', prioridad: 'Media', fechaCreacion: new Date('2026-03-05'), fechaLimite: new Date('2026-03-12'), comentarios: [], historial: [{ status: 'Creado', date: '05/03/2026', user: 'Admin' }] }
    ];
  }
  cerrarTablero() {
    if (this.permsSvc.hasPermission('group:view')) {
      this.router.navigate(['/home/group']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  // --- FILTROS RÁPIDOS ---
  aplicarFiltro(filtro: string) {
    this.filtroActivo = filtro;
  }

  getTicketsFiltrados() {
    let filtrados = this.tickets;
    if (this.filtroActivo === 'mis_tickets') { filtrados = filtrados.filter(t => t.asignadoA === this.loggedUser); }
    if (this.filtroActivo === 'sin_asignar') { filtrados = filtrados.filter(t => !t.asignadoA || t.asignadoA === ''); }
    if (this.filtroActivo === 'alta') { filtrados = filtrados.filter(t => t.prioridad === 'Alta'); }
    return filtrados;
  }

  getTicketsByStatus(status: string) {
    return this.getTicketsFiltrados().filter(t => t.estado === status);
  }
  getSeverity(prioridad: string) { switch (prioridad) { case 'Alta': return 'danger'; case 'Media': return 'warning'; case 'Baja': return 'info'; default: return 'success'; } }

  // --- DRAG AND DROP ---
  dragStart(ticket: any) {
    this.draggedTicket = ticket;
  }
  drop(estadoDestino: string) {
    if (this.draggedTicket && this.draggedTicket.estado !== estadoDestino) {
      // Registrar en el historial el movimiento
      this.draggedTicket.historial.push({ status: `Movido a ${estadoDestino}`, date: new Date().toLocaleDateString(), user: this.loggedUser });
      this.draggedTicket.estado = estadoDestino;
      this.messageService.add({ severity: 'info', summary: 'Actualizado', detail: `Ticket movido a ${estadoDestino}` });
    }
  }
  dragEnd() {
    this.draggedTicket = null;
  }

  // --- CRUD TICKETS Y COMENTARIOS ---
  openTicketDetail(ticket: any) { this.selectedTicket = ticket; this.displayTicketModal = true; }
  openCreateTicket() { this.isEditTicket = false; this.ticketForm.reset({ estado: 'Pendiente' }); this.displayCreateModal = true; }

  agregarComentario() {
    if (this.nuevoComentario.trim()) {
      this.selectedTicket.comentarios.push(this.nuevoComentario);
      this.selectedTicket.historial.push({ status: 'Comentario agregado', date: new Date().toLocaleDateString(), user: this.loggedUser });
      this.nuevoComentario = '';
    }
  }

  editTicket(ticket: any) {
    this.isEditTicket = true;
    this.selectedTicket = ticket;
    let fechaFormat = '';
    if (ticket.fechaLimite) { fechaFormat = new Date(ticket.fechaLimite).toISOString().split('T')[0]; }
    this.ticketForm.patchValue({ titulo: ticket.titulo, descripcion: ticket.descripcion, estado: ticket.estado, asignadoA: ticket.asignadoA, prioridad: ticket.prioridad, fechaLimite: fechaFormat });
    this.displayTicketModal = false;
    this.displayCreateModal = true;
  }

  deleteTicket(ticket: any) {
    this.displayTicketModal = false;
    this.confirmationService.confirm({
      message: `¿Eliminar ticket ${ticket.id}?`, header: 'Confirmar Eliminación', icon: 'pi pi-exclamation-triangle', acceptButtonStyleClass: 'p-button-danger',
      accept: () => { this.tickets = this.tickets.filter(t => t.id !== ticket.id); this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Ticket eliminado' }); }
    });
  }

  saveTicket() {
    if (this.ticketForm.invalid) return;
    if (this.isEditTicket) {
      const index = this.tickets.findIndex(t => t.id === this.selectedTicket.id);
      this.tickets[index] = { ...this.tickets[index], ...this.ticketForm.value };
      this.tickets[index].historial.push({ status: 'Editado', date: new Date().toLocaleDateString(), user: this.loggedUser });
    } else {
      this.tickets.push({ ...this.ticketForm.value, id: 'T-0' + (this.tickets.length + 1), fechaCreacion: new Date(), comentarios: [], historial: [{ status: 'Creado', date: new Date().toLocaleDateString(), user: this.loggedUser }] });
    }
    this.displayCreateModal = false;
  }

  // --- MIEMBROS ---
  agregarMiembro() {
    if (this.nuevoMiembroEmail) { this.usuariosGrupo.push(this.nuevoMiembroEmail); this.nuevoMiembroEmail = ''; }
  }
  eliminarMiembro(usuario: string) { this.usuariosGrupo = this.usuariosGrupo.filter(u => u !== usuario); }
}