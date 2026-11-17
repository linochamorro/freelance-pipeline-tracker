# ADR-006 — Flujo de reset de contraseña real con respuesta no enumeradora

**Estado:** Adoptada
**Fecha:** 2026-11-08  
**Afecta:** `src/services/auth-reset-service.ts`, `src/app/api/auth/reset-password/`, `src/app/api/auth/request-reset/`

## Contexto

En el prototipo anterior, el enlace de "¿Olvidaste tu contraseña?" era un elemento de interfaz falso que mostraba un diálogo de éxito simulado sin realizar ninguna operación en backend ni emitir tokens de recuperación. Además, un diseño deficiente de endpoints de autenticación suele revelar si un correo electrónico está registrado en el sistema, exponiendo a los usuarios a ataques de enumeración y recolección de credenciales.

## Decisión

1. **Flujo Criptográfico Real:**
   - La solicitud genera un token criptográficamente seguro (`crypto.randomBytes(32).toString('hex')`) con expiración acotada (1 hora) persistido en `VerificationToken`.
   - Se envía un enlace al correo electrónico del usuario mediante el adaptador de correo.
   - El token es de uso único: se invalida inmediatamente tras consumirse exitosamente para restablecer la contraseña.
2. **Respuesta no enumeradora:**
   - La API responde idénticamente (`200 OK`, con el mensaje "Si el correo está registrado, recibirás un enlace de restablecimiento") tanto si el correo existe como si no existe en la base de datos.
   - Se mitiga el análisis de tiempos (*timing attacks*) asegurando un tiempo de respuesta equiparable mediante retardos uniformes o ejecución asíncrona.

## Alternativas consideradas

1. *Retornar 404 cuando el correo no existe:* Rechazado terminantemente por violar buenas prácticas de seguridad (permite enumeración de usuarios).
2. *Flujo simulado permanente:* Descartado porque la recuperación debe procesar un token de un solo uso.

## Consecuencias

- La recuperación de contraseña conserva una respuesta pública uniforme.
- Verificación exhaustiva en pruebas unitarias e integrales simulando correos existentes e inexistentes.


