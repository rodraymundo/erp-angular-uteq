import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Validador de mayoría de edad
function ageValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const birthDate = new Date(control.value);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
  return age >= 18 ? null : { minor: true };
}

// Validador de coincidencia de contraseñas
function passwordMatchValidator(form: AbstractControl): ValidationErrors | null {
  const password = form.get('password')?.value;
  const confirmPassword = form.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { mismatch: true };
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [RouterLink, CardModule, InputTextModule, PasswordModule, ButtonModule, ReactiveFormsModule, ToastModule],
  providers: [MessageService],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css'
})
export class RegistroComponent {
  registroForm: FormGroup;
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private router = inject(Router);

  constructor() {
    this.registroForm = this.fb.group({
      usuario: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      nombre: ['', Validators.required],
      direccion: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]], // Solo 10 números
      fechaNacimiento: ['', [Validators.required, ageValidator]],
      // Password: Mínimo 10 chars y al menos un símbolo especial (!@#$%^&*)
      password: ['', [Validators.required, Validators.minLength(10), Validators.pattern(/(?=.*[!@#$%^&*])/)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  onRegistro() {
    if (this.registroForm.invalid) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Verifica los campos en rojo' });
      this.registroForm.markAllAsTouched();
      return;
    }

    this.messageService.add({ severity: 'success', summary: 'Registro Exitoso', detail: 'Cuenta creada correctamente' });
    setTimeout(() => this.router.navigate(['/login']), 1500);
  }
}