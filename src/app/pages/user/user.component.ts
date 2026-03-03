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

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CardModule, ButtonModule, DialogModule, InputTextModule, ToastModule, ReactiveFormsModule, ConfirmDialogModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export class UserComponent implements OnInit {
  userData: any = {};
  profileDialog: boolean = false;
  profileForm!: FormGroup;

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
  }

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

  // LÓGICA DE ELIMINACIÓN
  confirmDelete() {
    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas eliminar tu perfil de forma permanente? Esta acción no se puede deshacer.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        // Mostramos el mensaje de éxito
        this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Tu perfil ha sido eliminado', life: 3000 });

        // Simulamos que se borra y redirigimos al login después de 1.5 segundos
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      }
    });
  }
}