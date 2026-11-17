# Stack tecnológico

## Aplicación

| Componente | Uso |
|---|---|
| Next.js 16 App Router | Renderizado de páginas y Route Handlers |
| React 19 | Interfaz interactiva |
| TypeScript | Tipos de cliente y servidor |
| Tailwind CSS 4 | Estilos de interfaz |
| Radix UI y Lucide | Primitivas accesibles e iconografía |
| `@dnd-kit` | Interacción de arrastrar y soltar del tablero |

## Persistencia y autenticación

| Componente | Uso |
|---|---|
| PostgreSQL | Persistencia relacional |
| Prisma 6 (`prisma-client-js`) | Esquema, cliente tipado y migraciones |
| `bcryptjs` | Hash de contraseñas |
| Cookies de sesión | Identidad autenticada; sesiones almacenadas en PostgreSQL |
| Zod | Validación de datos de entrada |

La aplicación implementa el registro, login, logout y recuperación de contraseña con sus propios servicios y endpoints. No depende de un proveedor OAuth para iniciar sesión.

## Correo y pruebas

El adaptador de correo permite conectar Resend en el entorno configurado y emplear dobles en las pruebas. Vitest ejecuta pruebas unitarias y de integración; Testing Library cubre componentes React. `npm run test:unit` selecciona exclusivamente `tests/unit/` y no carga archivos `.env`.
