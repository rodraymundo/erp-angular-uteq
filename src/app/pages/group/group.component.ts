import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToolbarModule } from 'primeng/toolbar';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CardModule, TableModule, ButtonModule, DialogModule, InputTextModule, ConfirmDialogModule, ToastModule, ReactiveFormsModule, ToolbarModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './group.component.html',
  styleUrl: './group.component.css'
})
export class GroupComponent implements OnInit {
  groups: any[] = [];
  groupDialog: boolean = false;
  groupForm!: FormGroup;
  isEdit: boolean = false;
  currentGroupId: number | null = null;

  // Variable simulando al usuario logueado
  loggedUser = 'Raymundo Rodríguez Naranjo';

  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  ngOnInit() {
    this.groups = [
      { id: 1, nombre: 'IDGS14', nivel: 'Avanzado', autor: 'Profe Luis', integrantes: 25, tickets: 3, descripcion: 'Grupo de desarrollo de software' },
      { id: 2, nombre: 'ITIC91', nivel: 'Intermedio', autor: 'Profe Juan', integrantes: 20, tickets: 1, descripcion: 'Redes y telecomunicaciones' }
    ];

    this.groupForm = this.fb.group({
      nombre: ['', Validators.required],
      nivel: ['', Validators.required],
      autor: [this.loggedUser, Validators.required], // Se inicializa con tu nombre
      integrantes: [0, [Validators.required, Validators.min(1)]],
      tickets: [0, Validators.required],
      descripcion: ['']
    });
  }

  openNew() {
    this.isEdit = false;
    this.groupForm.reset();

    // Al abrir un nuevo formulario, volvemos a inyectar tus datos por defecto
    this.groupForm.patchValue({
      autor: this.loggedUser,
      integrantes: 0,
      tickets: 0
    });

    this.groupDialog = true;
  }

  editGroup(group: any) {
    this.isEdit = true;
    this.currentGroupId = group.id;
    this.groupForm.patchValue(group);
    this.groupDialog = true;
  }

  deleteGroup(group: any) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas eliminar el grupo ' + group.nombre + '?',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.groups = this.groups.filter(g => g.id !== group.id);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Grupo eliminado', life: 3000 });
      }
    });
  }

  hideDialog() {
    this.groupDialog = false;
  }

  saveGroup() {
    if (this.groupForm.invalid) return;

    const groupData = this.groupForm.value;

    if (this.isEdit) {
      const index = this.groups.findIndex(g => g.id === this.currentGroupId);
      this.groups[index] = { ...groupData, id: this.currentGroupId };
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Grupo actualizado', life: 3000 });
    } else {
      const newGroup = { ...groupData, id: Math.floor(Math.random() * 1000) };
      this.groups = [...this.groups, newGroup];
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Grupo creado', life: 3000 });
    }

    this.groupDialog = false;
  }
}