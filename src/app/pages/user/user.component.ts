import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CardModule],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export class UserComponent {
  // Objeto con la información hardcodeada idéntica a los campos del registro
  userData = {
    usuario: 'Raymundorod',
    nombre: 'Raymundo Rodríguez Naranjo',
    email: 'admin@uteq.edu.mx',
    telefono: '4421234567',
    direccion: 'Av. Universidad Tecnológica 1, Querétaro',
    fechaNacimiento: '2002-08-15'
  };
}