import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HttpClient } from '@angular/common/http';
import { PermissionsService } from '../../../services/permissions.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, CardModule, InputTextModule, PasswordModule, ButtonModule, ReactiveFormsModule, ToastModule],
  providers: [MessageService],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private router = inject(Router);

  private http = inject(HttpClient);
  private permsSvc = inject(PermissionsService);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Llena todos los campos correctamente' });
      return;
    }

    const credentials = this.loginForm.value;

    // CORRECCIÓN AQUÍ: Agregamos /login a la URL del API Gateway
    const apiUrl = 'http://localhost:3000/api/users/login';

    this.http.post<any>(apiUrl, credentials).subscribe({
      next: (response) => {
        try {
          // Extraemos el token respetando el formato JSON estricto (data[0].token)
          const token = response.data[0].token;

          // Decodificamos el JWT manualmente
          const payloadBase64 = token.split('.')[1];
          // decodeURIComponent junto con escape maneja mejor caracteres especiales que atob solo
          const decodedPayload = decodeURIComponent(escape(atob(payloadBase64)));
          const payloadJson = JSON.parse(decodedPayload);

          // Extraemos los permisos
          const userPerms = payloadJson.permissions || [];

          console.log('Permisos obtenidos del token:', userPerms);

          // Guardamos en el servicio de Angular
          this.permsSvc.setPermissions(userPerms);

          // Guardamos el token en localStorage para futuras peticiones (OBLIGATORIO)
          localStorage.setItem('auth_token', token);

          // Guardamos info básica del usuario si es necesario
          localStorage.setItem('user_info', JSON.stringify(response.data[0].user));

          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Bienvenido al sistema' });

          setTimeout(() => this.router.navigate(['/home']), 1000);

        } catch (error) {
          console.error('Error procesando el token JWT:', error);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Respuesta inválida del servidor' });
        }
      },
      error: (err) => {
        console.error('Error de Login:', err);
        // Manejamos el mensaje de error que viene del backend si existe
        const msg = err.error?.message || 'Correo o contraseña incorrectos';
        this.messageService.add({ severity: 'error', summary: 'Acceso Denegado', detail: msg });
      }
    });
  }
}