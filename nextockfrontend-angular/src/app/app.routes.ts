import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';
import { AdminComponent } from './pages/admin/admin.component';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { PrivateLayoutComponent } from './layout/private-layout.component';
import { LandingComponent } from './pages/landing/landing.component';
import { QuienesSomosComponent } from './pages/quienes-somos/quienes-somos.component';
import { RegistroComponent } from './pages/registro/registro.component';
import { LoginComponent } from './pages/login/login.component';
import { InicioComponent } from './pages/inicio/inicio.component';
import { ProcesarComponent } from './pages/procesar/procesar.component';
import { AnalisisComponent } from './pages/analisis/analisis.component';
import { PrediccionComponent } from './pages/prediccion/prediccion.component';
import { PerfilComponent } from './pages/perfil/perfil.component';
import { InventarioComponent } from './pages/inventario/inventario.component';
import { SoporteComponent } from './pages/soporte/soporte.component';
import { HistorialComponent } from './pages/historial/historial.component';

export const routes: Routes = [
  // ---- Público ----
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: LandingComponent },
      { path: 'quienes-somos', component: QuienesSomosComponent },
      { path: 'prueba-gratuita', component: RegistroComponent },
      { path: 'login', component: LoginComponent },
    ],
  },
  // ---- Privado (requiere sesión) ----
  {
    path: 'app',
    component: PrivateLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'inicio', component: InicioComponent },
      // Escritura de datos: solo bodeguero/admin (el visualizador no entra)
      { path: 'procesar', component: ProcesarComponent, canActivate: [roleGuard], data: { roles: ['gestor', 'administrador'] } },
      { path: 'inventario', component: InventarioComponent, canActivate: [roleGuard], data: { roles: ['gestor', 'administrador'] } },
      { path: 'analisis', component: AnalisisComponent },
      { path: 'historial', component: HistorialComponent },
      { path: 'prediccion', component: PrediccionComponent },
      // Panel de administración: solo administrador
      { path: 'admin', component: AdminComponent, canActivate: [roleGuard], data: { roles: ['administrador'] } },
      { path: 'soporte', component: SoporteComponent },
      { path: 'perfil', component: PerfilComponent },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
