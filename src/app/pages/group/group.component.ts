import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

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
import { DragDropModule } from 'primeng/dragdrop';

import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { PermissionsService } from '../../services/permissions.service';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CardModule, TableModule, ButtonModule, DialogModule, InputTextModule, ConfirmDialogModule, ToastModule, ToolbarModule, SelectButtonModule, TagModule, TimelineModule, DropdownModule, InputTextareaModule, DragDropModule, HasPermissionDirective],
  providers: [MessageService, ConfirmationService],
  templateUrl: './group.component.html',
  styleUrl: './group.component.css'
})
export class GroupComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  public permsSvc = inject(PermissionsService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Variables de Grupos
  groups: any[] = [];
  selectedGroupForBoard: any = null;
  groupDialog: boolean = false;
  groupForm!: FormGroup;
  isEdit: boolean = false;
  currentGroupId: string | null = null;
  loggedUser = '';

  // Variables de Tickets / Tablero
  viewOptions: any[] = [{ label: 'Kanban', value: 'kanban', icon: 'pi pi-th-large' }, { label: 'Lista', value: 'list', icon: 'pi pi-list' }];
  selectedView: string = 'kanban';
  tickets: any[] = [];
  usuariosGrupo: any[] = []; // Se llenará con la BD en un futuro
  prioridades = ['Baja', 'Media', 'Alta'];
  estados = ['Pendiente', 'En Progreso', 'Revisión', 'Finalizado'];
  comentariosTicket: any[] = [];

  displayTicketModal = false;
  displayCreateModal = false;
  selectedTicket: any = null;
  ticketForm!: FormGroup;
  isEditTicket: boolean = false;

  nuevoComentario: string = '';
  filtroActivo: string = 'todos';
  draggedTicket: any | null = null;

  ngOnInit() {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) this.loggedUser = JSON.parse(userInfo).nombre_completo || 'Usuario';

    this.groupForm = this.fb.group({ nombre: ['', Validators.required], descripcion: [''] });
    this.ticketForm = this.fb.group({ titulo: ['', Validators.required], descripcion: ['', Validators.required], estado_id: ['Pendiente', Validators.required], asignado_id: [''], prioridad_id: ['Media', Validators.required] });

    this.cargarGrupos();
    this.cargarUsuarios();

    // 🔴 ESTO EVITA EL SANGRADO: Escucha la URL y limpia poderes al instante
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      if (!idStr) {
        this.selectedGroupForBoard = null;
        this.restaurarPermisosGlobales();
      } else if (this.groups.length > 0) {
        this.verificarUrlParametros(idStr); // Pasamos el ID exacto y fresco
      }
    });
  }

  // Función auxiliar de limpieza
  restaurarPermisosGlobales() {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1]))));
      this.permsSvc.setPermissions(payload.permissions || []);
    }
  }

  // ==========================================
  // GESTIÓN DE GRUPOS (CRUD)
  // ==========================================
  cargarGrupos() {
    this.http.get<any>('http://localhost:3000/api/groups').subscribe({
      next: (res) => {
        this.groups = res.data || [];
        const idStr = this.route.snapshot.paramMap.get('id');
        if (idStr) this.verificarUrlParametros(idStr);
      },
      error: (err) => console.error('Error al cargar grupos:', err)
    });
  }

  cargarUsuarios() {
    this.http.get<any>('http://localhost:3000/api/users').subscribe({
      next: (res) => this.usuariosGrupo = res.data || [],
      error: (err) => console.error('No se pudieron cargar los usuarios (¿Falta permiso user:view?):', err)
    });
  }

  verificarUrlParametros(idStr?: string) {
    const id = idStr || this.route.snapshot.paramMap.get('id');
    if (id) {
      const grupoEncontrado = this.groups.find(g => g.id === id);
      if (grupoEncontrado) this.abrirTablero(grupoEncontrado);
      else this.messageService.add({ severity: 'warn', summary: 'Denegado', detail: 'No tienes acceso' });
    }
  }
  openNewGroup() {
    this.isEdit = false;
    this.groupForm.reset();
    this.groupDialog = true;
  }

  editGroup(group: any) {
    this.isEdit = true;
    this.currentGroupId = group.id;
    this.groupForm.patchValue(group);
    this.groupDialog = true;
  }

  saveGroup() {
    if (this.groupForm.invalid) return;
    const payload = this.groupForm.value;

    if (this.isEdit) {
      this.http.put<any>(`http://localhost:3000/api/groups/${this.currentGroupId}`, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Grupo actualizado' });
          this.groupDialog = false;
          this.cargarGrupos();
        }
      });
    } else {
      this.http.post<any>('http://localhost:3000/api/groups', payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Grupo creado' });
          this.groupDialog = false;
          this.cargarGrupos();
        }
      });
    }
  }

  deleteGroup(group: any) {
    this.confirmationService.confirm({
      message: `¿Eliminar permanentemente el grupo: ${group.nombre}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete(`http://localhost:3000/api/groups/${group.id}`).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Grupo eliminado' });
            this.cargarGrupos();
          }
        });
      }
    });
  }

  // ==========================================
  // TABLERO Y PERMISOS POR GRUPO
  // ==========================================
  abrirTablero(group: any) {
    this.selectedGroupForBoard = group;
    this.restaurarPermisosGlobales();

    this.http.get<any>(`http://localhost:3000/api/groups/${group.id}/my-permissions`).subscribe({
      next: (res) => {
        const dataBruta = res.data || [];

        // 🔴 EL TRADUCTOR MÁGICO: Convierte objetos complejos a texto simple
        const permisosLocales = dataBruta.map((p: any) => {
          if (typeof p === 'string') return p;
          if (p.permisos && p.permisos.nombre) return p.permisos.nombre;
          if (p.nombre) return p.nombre;
          return '';
        }).filter((p: string) => p !== '');

        const token = localStorage.getItem('auth_token');
        let permisosGlobales = [];
        if (token) {
          permisosGlobales = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1])))).permissions || [];
        }

        this.permsSvc.setPermissions([...permisosGlobales, ...permisosLocales]);
      }
    });

    this.cargarTicketsTablero(group.id);
  }
  cerrarTablero() {
    this.selectedGroupForBoard = null;
    this.restaurarPermisosGlobales(); // <- Usamos el limpiador

    if (this.permsSvc.hasPermission('group:manage')) {
      this.router.navigate(['/home/group']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  // ==========================================
  // GESTIÓN DE TICKETS Y DRAG & DROP
  // ==========================================
  cargarTicketsTablero(grupoId: string) {
    this.http.get<any>(`http://localhost:3000/api/tickets?grupo_id=${grupoId}`).subscribe({
      next: (res) => this.tickets = res.data || []
    });
  }

  // DRAG & DROP
  dragStart(ticket: any) {
    if (this.permsSvc.hasAnyPermission(['ticket:edit:state', 'ticket:manage'])) {
      this.draggedTicket = ticket;
    } else {
      this.draggedTicket = null;
      this.messageService.add({ severity: 'warn', summary: 'Acceso Denegado', detail: 'No tienes permiso para mover tickets aquí.' });
    }
  }

  dragEnd() { this.draggedTicket = null; }

  // FILTROS
  aplicarFiltro(filtro: string) { this.filtroActivo = filtro; }
  // Actualiza los filtros para leer las variables limpias
  getTicketsFiltrados() {
    let filtrados = this.tickets;
    if (this.filtroActivo === 'mis_tickets') filtrados = filtrados.filter(t => t.nombreAsignado === this.loggedUser);
    if (this.filtroActivo === 'alta') filtrados = filtrados.filter(t => t.nombrePrioridad === 'Alta');
    return filtrados;
  }

  // Actualiza la lectura de columnas Kanban
  getTicketsByStatus(status: string) {
    return this.getTicketsFiltrados().filter(t => t.nombreEstado === status);
  }

  // Actualiza la validación del Drag & Drop
  drop(estadoDestino: string) {
    // 1. Candado Estricto Front-end
    if (!this.permsSvc.hasAnyPermission(['ticket:edit:state', 'ticket:manage'])) {
      this.messageService.add({ severity: 'error', summary: 'Denegado', detail: 'No tienes permiso para mover tickets en este grupo.' });
      this.draggedTicket = null;
      this.cargarTicketsTablero(this.selectedGroupForBoard.id); // 🔴 ROMPER ILUSIÓN VISUAL
      return;
    }

    if (this.draggedTicket && this.draggedTicket.nombreEstado !== estadoDestino) {
      const ticketId = this.draggedTicket.id;

      this.http.patch<any>(`http://localhost:3000/api/tickets/${ticketId}/state`, { estado_id: estadoDestino }).subscribe({
        next: () => {
          this.messageService.add({ severity: 'info', summary: 'Actualizado', detail: `Ticket movido a ${estadoDestino}` });
          this.cargarTicketsTablero(this.selectedGroupForBoard.id);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Denegado', detail: 'Bloqueo de seguridad del servidor.' });
          this.cargarTicketsTablero(this.selectedGroupForBoard.id); // 🔴 ROMPER ILUSIÓN VISUAL
        }
      });
    }
  }
  getSeverity(prioridad: string) { switch (prioridad) { case 'Alta': return 'danger'; case 'Media': return 'warning'; case 'Baja': return 'info'; default: return 'success'; } }

  // CRUD TICKETS
  openTicketDetail(ticket: any) {
    if (this.permsSvc.hasPermission('ticket:view')) {
      this.selectedTicket = ticket;
      this.displayTicketModal = true;
      this.cargarComentarios(ticket.id); // 🔴 Llamamos a los comentarios al abrir
    }
  }

  cargarComentarios(ticketId: string) {
    this.http.get<any>(`http://localhost:3000/api/tickets/${ticketId}/comments`).subscribe({
      next: (res) => this.comentariosTicket = res.data || [],
      error: (err) => console.error('Error cargando comentarios', err)
    });
  }

  agregarComentario() {
    if (!this.nuevoComentario.trim()) return;
    this.http.post<any>(`http://localhost:3000/api/tickets/${this.selectedTicket.id}/comments`, { texto: this.nuevoComentario }).subscribe({
      next: () => {
        this.nuevoComentario = '';
        this.cargarComentarios(this.selectedTicket.id); // Recargar el muro de comentarios
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Comentario agregado' });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No tienes permiso para comentar' })
    });
  }

  openCreateTicket() {
    this.isEditTicket = false;
    this.ticketForm.reset({ estado_id: 'Pendiente', prioridad_id: 'Media' });
    this.displayCreateModal = true;
  }

  editTicket(ticket: any) {
    this.isEditTicket = true;
    this.selectedTicket = ticket;
    this.ticketForm.patchValue({
      titulo: ticket.titulo, descripcion: ticket.descripcion, estado_id: ticket.estado_id || 'Pendiente', prioridad_id: ticket.prioridad_id || 'Media'
    });
    this.displayTicketModal = false;
    this.displayCreateModal = true;
  }

  saveTicket() {
    if (this.ticketForm.invalid) return;

    const formValues = this.ticketForm.value;
    const payload = {
      ...formValues,
      grupo_id: this.selectedGroupForBoard.id,
      asignado_id: formValues.asignado_id ? formValues.asignado_id : null
    };

    if (this.isEditTicket) {
      this.http.put<any>(`http://localhost:3000/api/tickets/${this.selectedTicket.id}`, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Ticket actualizado' });
          this.displayCreateModal = false;
          this.cargarTicketsTablero(this.selectedGroupForBoard.id);
        }
      });
    } else {
      this.http.post<any>('http://localhost:3000/api/tickets', payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Ticket creado' });
          this.displayCreateModal = false;
          this.cargarTicketsTablero(this.selectedGroupForBoard.id);
        }
      });
    }
  }

  deleteTicket(ticket: any) {
    this.displayTicketModal = false;
    this.confirmationService.confirm({
      message: `¿Eliminar ticket ${ticket.titulo}?`, header: 'Confirmar Eliminación', icon: 'pi pi-exclamation-triangle', acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete(`http://localhost:3000/api/tickets/${ticket.id}`).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Ticket eliminado' });
            this.cargarTicketsTablero(this.selectedGroupForBoard.id);
          }
        });
      }
    });
  }

  agregarMiembro() { /* Backend pendiente para miembros */ }
  eliminarMiembro(usuario: string) { /* Backend pendiente para miembros */ }

  ngOnDestroy() {
    // Al salir de este componente, limpiamos los permisos fusionados
    // y restauramos solo los que venían en tu Gafete (Token) original
    const token = localStorage.getItem('auth_token');
    if (token) {
      const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1]))));
      this.permsSvc.setPermissions(payload.permissions || []);
    }
  }
}