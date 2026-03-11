import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table'; // <-- NUEVO
import { TagModule } from 'primeng/tag';     // <-- NUEVO

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CardModule, ButtonModule, ProgressBarModule, TableModule, TagModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private router = inject(Router);

  stats = { pendientes: 12, enProgreso: 15, revision: 8, finalizados: 10 };

  misGrupos = [
    { id: 1, nombre: 'IDGS14', tickets: 25, avance: 85 },
    { id: 2, nombre: 'ITIC91', tickets: 20, avance: 40 }
  ];

  misTicketsAsignados: any[] = [];

  ngOnInit() {
    // Tickets simulados que le pertenecen exclusivamente al usuario logueado
    this.misTicketsAsignados = [
      { id: 'T-01', titulo: 'Diseñar BD', estado: 'En Progreso', prioridad: 'Alta', grupo: 'IDGS14' },
      { id: 'T-05', titulo: 'Corregir Login', estado: 'Pendiente', prioridad: 'Media', grupo: 'IDGS14' }
    ];
  }

  irAlGrupo(id: number) {
    this.router.navigate(['/home/group', id]);
  }
}