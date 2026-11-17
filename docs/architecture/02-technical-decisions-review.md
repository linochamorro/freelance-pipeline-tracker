# Criterios de arquitectura

## Enrutamiento

La aplicación usa Next.js App Router. Las páginas viven en `src/app/`; las operaciones HTTP se implementan como Route Handlers y usan `Request`/`Response`.

## Separación de responsabilidades

Los componentes gestionan presentación e interacción. Los servicios concentran operaciones de negocio y persistencia. Las funciones de `src/lib/` proporcionan reglas, validación, sesión y adaptadores reutilizables. Esta separación mantiene las reglas de negocio independientes de la interfaz.

## Identidad y propiedad de datos

Los endpoints privados obtienen la identidad desde la sesión validada en servidor. Las consultas de oportunidades, tareas y ajustes deben filtrar por el usuario autenticado. El cliente no define la identidad usada para autorizar una operación.

## Persistencia y reglas

PostgreSQL conserva cuentas, sesiones, oportunidades, historiales, tareas y avisos. Prisma define tipos y relaciones. Los enums del esquema limitan etapas y estados válidos. Las notas y los eventos de transición se conservan como historial; los cambios se representan mediante nuevos registros, no mediante edición retrospectiva.

## Tareas y avisos

Una tarea tiene identidad y ciclo de vida propios, y su vínculo con una oportunidad es opcional. Los avisos se guardan para su lectura en la aplicación. El envío de correo se desacopla mediante un adaptador para que las pruebas no dependan de servicios externos.
