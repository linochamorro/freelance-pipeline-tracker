# ADR-007 — Adaptador desacoplado de email con dobles en pruebas

**Estado:** Adoptada
**Fecha:** 2026-11-08  
**Afecta:** `src/lib/email-adapter.ts`, `tests/setup.ts`, integración con Resend

## Contexto

El sistema requiere despachar correos electrónicos para dos funciones críticas: restablecimiento de contraseñas y notificaciones de tareas/agenda. Durante la ejecución de pruebas automatizadas en local o CI, no deben emitirse correos reales hacia Internet, no deben exponerse claves API privadas ni debe bloquearse la suite si no hay conexión externa disponible.

## Decisión

1. **Patrón Adaptador / Puerto e Interfaz:**
   - Se define una interfaz abstracta `EmailAdapter` con método `sendEmail({ to, subject, html, text })`.
   - Se provee una implementación de producción basada en Resend (`ResendEmailAdapter`).
   - Se provee una implementación stub / memoria (`InMemoryEmailAdapter`) para entornos de desarrollo y pruebas automatizadas.
2. **Aislamiento en pruebas:**
   - La suite de tests Vitest utiliza exclusivamente el doble de prueba en memoria, registrando los correos emitidos en un arreglo accesible para aserciones (`expect(stubEmail.sent).toContainEqual(...)`).
   - No se requiere ninguna variable `RESEND_API_KEY` para compilar o ejecutar los tests.

## Alternativas consideradas

1. *Llamar directamente al SDK de Resend en los controladores:* Descartado por acoplamiento fuerte y dificultad de simular fallos de red o inspeccionar el correo en tests.
2. *Configurar un servidor SMTP local de prueba (como MailHog o Docker):* Descartado por violar el principio de "Recursos moderados sin Docker" establecido en la constitución.

## Consecuencias

- Desacoplamiento arquitectónico limpio y extensible a otros proveedores (SendGrid, Postmark, AWS SES) si fuera necesario.
- Pruebas deterministas, rápidas y que no dependen de la red ni consumen cuotas de servicios de terceros.


