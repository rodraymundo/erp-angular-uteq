import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, CardModule, InputTextModule, PasswordModule, ButtonModule, ReactiveFormsModule, ToastModule],
  providers: [MessageService], // Necesario para el Toast
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private router = inject(Router);

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

    const { email, password } = this.loginForm.value;

    // Validar credenciales hardcodeadas
    if (email === 'admin@uteq.edu.mx' && password === 'Admin123!') {
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Bienvenido al sistema' });
      // Redirigir al landing después de 1 segundo
      setTimeout(() => this.router.navigate(['/landing']), 1000);
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Credenciales incorrectas' });
    }
  }
}