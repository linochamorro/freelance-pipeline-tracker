# Interfaces HTTP y componentes

## API

Las rutas HTTP están bajo `src/app/api/`. Las operaciones validan el cuerpo y los parámetros de entrada y aplican la sesión en servidor antes de acceder a datos privados.

| Área | Operaciones principales |
|---|---|
| Autenticación | Registro, login, logout, consulta de sesión y recuperación de contraseña |
| Oportunidades | Listar, crear, consultar, editar, archivar y restaurar |
| Notas | Crear y listar notas; las mutaciones retrospectivas se rechazan |
| Dashboard | Métricas y oportunidades inactivas |
| Ajustes | Consultar y actualizar umbrales de inactividad y notificaciones |
| Tareas | Crear, listar, actualizar y eliminar tareas |
| Avisos | Consultar y marcar notificaciones como leídas |

Las respuestas usan un sobre común con indicador de éxito, datos o un error tipado. Los códigos concretos se definen en cada Route Handler y sus pruebas.

## Interfaz

El tablero muestra oportunidades por etapa, permite buscar y filtrar y presenta presupuestos en PEN con el símbolo literal `S/.`. Desde `/pipeline`, el formulario «Nueva oportunidad» crea mediante `POST /api/opportunities` una oportunidad con cliente, descripción, presupuesto estimado, persona de contacto y canal; la etapa inicial del API es `Lead`. La tarjeta expone los subestados de desarrollo y pago y el historial relacionado. Las tareas mantienen su agenda separada y pueden vincularse opcionalmente a una oportunidad. Las vistas de tareas, dashboard y ajustes consumen las operaciones autenticadas correspondientes.

## Accesibilidad y seguridad de interfaz

Los controles interactivos deben tener etiquetas accesibles, estados de foco visibles y operación por teclado. El movimiento respeta `prefers-reduced-motion`. La aplicación define cabeceras HTTP básicas contra framing, MIME sniffing y políticas de referencia/permisos.
