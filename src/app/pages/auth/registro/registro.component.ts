import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HttpClient } from '@angular/common/http'; // <-- IMPORTANTE: Agregar HttpClient

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

  private http = inject(HttpClient); // <-- INYECTAR HTTP CLIENT

  constructor() {
    this.registroForm = this.fb.group({
      usuario: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      nombre: ['', Validators.required],
      direccion: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      fechaNacimiento: ['', [Validators.required, ageValidator]],
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

    // 1. Extraemos los valores del formulario
    const formValues = this.registroForm.value;

    // 2. Mapeamos los datos para que coincidan con los nombres de variables que espera tu Backend
    const payload = {
      nombre_completo: formValues.nombre,
      username: formValues.usuario,
      email: formValues.email,
      password: formValues.password,
      // Los siguientes los mando por si quieres actualizar tu backend para que también los guarde
      direccion: formValues.direccion,
      telefono: formValues.telefono,
      permisos_nombres: [] // Opcional: Si quieres asignar permisos por defecto al registrarse
    };

    // 3. URL del API Gateway apuntando al servicio de registro
    const apiUrl = 'http://localhost:3000/api/users/register';

    // 4. Hacemos la petición POST
    this.http.post<any>(apiUrl, payload).subscribe({
      next: (response) => {
        this.messageService.add({ severity: 'success', summary: 'Registro Exitoso', detail: 'Cuenta creada correctamente' });

        // Redirigir al login después de 1.5 segundos
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        console.error('Error al registrar:', err);
        // Mostrar mensaje de error que viene del backend (ej. "El correo ya existe")
        const errorMsg = err.error?.message || 'Hubo un problema al crear la cuenta';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMsg });
      }
    });
  }
}