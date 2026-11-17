# Arquitectura del producto

Freelance Pipeline Tracker es una aplicación web para que una persona gestione oportunidades, tareas y avisos asociados a su trabajo independiente.

## Módulos

- `src/app/`: páginas de Next.js App Router y endpoints HTTP.
- `src/components/`: interfaz React para autenticación, dashboard, tablero, tareas y ajustes.
- `src/services/`: lógica de negocio y acceso a persistencia.
- `src/lib/`: sesión, validación, reglas puras y adaptadores.
- `prisma/`: esquema PostgreSQL y migraciones.
- `tests/`: pruebas unitarias y de integración.

## Flujo principal

El usuario se registra e inicia sesión con email y contraseña. La sesión se conserva mediante un token de sesión asociado a la cuenta. Las operaciones de negocio identifican al usuario autenticado y filtran sus oportunidades y tareas. Las rutas de la aplicación usan los servicios para leer y actualizar datos; las reglas del dominio se mantienen separadas de los componentes visuales.

Las oportunidades recorren etapas definidas, guardan eventos de transición y admiten notas de solo adición. Una tarea puede ser independiente o vincularse a una oportunidad. Los avisos se almacenan para mostrarse en la aplicación y pueden enviarse por correo mediante el adaptador configurado.

## Documentación técnica

- [`01-stack.md`](./01-stack.md): herramientas y dependencias principales.
- [`02-technical-decisions-review.md`](./02-technical-decisions-review.md): criterios de arquitectura.
- [`03-data-model-and-storage-contract.md`](./03-data-model-and-storage-contract.md): entidades y reglas de persistencia.
- [`04-api-and-component-contract.md`](./04-api-and-component-contract.md): interfaces HTTP y comportamiento de UI.
- [`../decisions/index.md`](../decisions/index.md): decisiones técnicas registradas.
