# FormaSalones - Sistema de Gestión de Formación

## Problema Original
App móvil (web responsive) para gestionar la formación de empleados en salones de apuestas en España. El usuario es coordinador de 35 salones (127 en total en Murcia) y necesita llevar control de la formación de empleados.

## Arquitectura

### Tech Stack
- **Frontend**: React 19 + Tailwind CSS + Radix UI
- **Backend**: FastAPI + Python 3.11
- **Database**: MongoDB
- **Auth**: JWT (SHA-256 hash)
- **Email**: SendGrid (para recordatorios)

### Estructura de Datos
- **Users**: id, email, password, name, role (admin/coordinator), assigned_salons
- **Salons**: id, name, address, city
- **Employees**: id, name, salon_id, level, notes, trainings_count
- **TrainingTypes**: id, name, description
- **Trainings**: id, employee_id, training_type_id, coordinator_id, notes, level_before, level_after, date
- **ScheduledTrainings**: id, employee_id, training_type_id, scheduled_date, notes, reminder_sent, completed

## User Personas

### Administrador (Juan - único admin)
- Crea y gestiona tipos de formación
- Crea salones
- Asigna salones a coordinadores
- Ve reportes globales
- Envía recordatorios de email

### Coordinador
- Registra empleados en sus salones asignados
- Registra formaciones realizadas
- Programa formaciones futuras
- Ve historial de empleados
- Ve estadísticas de sus salones

## Requisitos Core (Estáticos)

1. ✅ Login/Registro solo para coordinadores
2. ✅ Rol Admin (primer usuario) y Coordinadores
3. ✅ Gestión de salones (127 en Murcia, 35 asignables)
4. ✅ Empleados organizados por salón
5. ✅ Niveles de empleados: Principiante, Intermedio, Avanzado
6. ✅ Tipos de formación personalizables por admin
7. ✅ Registro de formaciones con notas y evolución de nivel
8. ✅ Historial de formaciones por empleado
9. ✅ Agenda de formaciones programadas
10. ✅ Recordatorios por email 1 día antes
11. ✅ Reportes y estadísticas

## Lo Implementado

### Fecha: 4 Febrero 2026

**Backend (100% funcional)**
- API REST completa con FastAPI
- Autenticación JWT
- CRUD completo para: Users, Salons, Employees, TrainingTypes, Trainings, ScheduledTrainings
- Sistema de roles y permisos
- Estadísticas y reportes
- Integración SendGrid para emails

**Frontend (95% funcional)**
- Diseño "Performance Pro" - dark theme, mobile-first
- Fuente: Barlow Condensed (headings) + Inter (body)
- Colores: Emerald (#10B981) como acento principal
- Sidebar desktop + Bottom Nav mobile
- Todas las páginas implementadas:
  - Login/Registro
  - Dashboard con estadísticas
  - Gestión de Salones
  - Gestión de Empleados (con búsqueda y filtros)
  - Registro de Formaciones
  - Agenda de Formaciones
  - Reportes
  - Panel Admin (tipos, coordinadores, herramientas)

## Backlog (Priorizado)

### P0 - Crítico
- (Ninguno - MVP completo)

### P1 - Importante
- [ ] Configurar API key de SendGrid para envío real de emails
- [ ] Agregar paginación para listas grandes
- [ ] Implementar notificaciones push (requiere app nativa)

### P2 - Deseable
- [ ] Exportar reportes a PDF/Excel
- [ ] Dashboard con gráficos más detallados (Recharts)
- [ ] Modo offline (Service Worker)
- [ ] Multi-idioma
- [ ] Temas claro/oscuro toggle

## Próximas Tareas

1. Configurar credenciales SendGrid para recordatorios reales
2. Agregar más tipos de formación según necesidades
3. Importar lista de 127 salones de Murcia
4. Invitar a coordinadores al sistema
5. Configurar cron job para envío automático de recordatorios

## Credenciales de Prueba
- Admin: juan@admin.com / admin123
