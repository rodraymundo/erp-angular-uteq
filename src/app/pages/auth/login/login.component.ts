import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HttpClient } from '@angular/common/http'; // <-- HTTP
import { PermissionsService } from '../../../services/permissions.service'; // <-- SERVICIO DE PERMISOS

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

  // Inyectamos las nuevas herramientas
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
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Llena todos los campos' });
      return;
    }

    const credentials = this.loginForm.value;
    const apiUrl = 'http://localhost:3000/login';

    // Hacemos la petición POST a la API del profesor
    this.http.post<any>(apiUrl, credentials).subscribe({
      next: (response) => {
        try {
          // 1. Obtenemos el token de la respuesta
          const token = response.data[0].token;

          // 2. Decodificamos la parte central del JWT (el Payload)
          // El token tiene 3 partes separadas por puntos. La del medio [1] tiene los datos.
          const payloadBase64 = token.split('.')[1];
          const decodedPayload = atob(payloadBase64); // atob() decodifica Base64
          const payloadJson = JSON.parse(decodedPayload); // Lo convertimos a objeto

          // 3. Extraemos los permisos que venían ocultos en el token
          const userPerms = payloadJson.permissions || [];

          console.log('Permisos desencriptados con éxito:', userPerms);

          // 4. Guardamos los permisos en el sistema
          this.permsSvc.setPermissions(userPerms);

          // Opcional: Podrías guardar el token en localStorage si luego haces peticiones GET/PUT
          localStorage.setItem('auth_token', token);

          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Bienvenido al sistema' });

          // Redirigimos al Dashboard
          setTimeout(() => this.router.navigate(['/home']), 1000);

        } catch (error) {
          console.error('Error procesando el token:', error);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Respuesta inválida del servidor' });
        }
      },
      error: (err) => {
        console.error('Error de Login:', err);
        this.messageService.add({ severity: 'error', summary: 'Acceso Denegado', detail: 'Correo o contraseña incorrectos' });
      }
    });
  }
}