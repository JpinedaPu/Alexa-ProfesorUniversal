# Propuesta Comercial — Wolfram Alpha Show Steps API
**Para:** Blake Gilbert, Developer Relations Coordinator, Wolfram Research  
**De:** Jorge Pineda Pulido, Estudiante Ingeniería Mecánica, Universidad Nacional de Colombia  
**App ID:** 6U3PEET6LV  
**Fecha:** Marzo 2026  
**Estado:** 🔴 BORRADOR — pendiente de redactar y enviar

---

## Contexto de la conversación con Blake

### Hilo de correos (resumen)
1. **6 mar** — Blake ofrece acceso gratuito a todas las APIs excepto Show Steps (requiere acuerdo comercial). Provisiona el App ID para acceso completo.
2. **6 mar** — Jorge responde con descripción detallada del proyecto (Alexa Skill educativa, integración Wolfram+OpenAI, screenshots de APL).
3. **10 mar** — Blake provisiona acceso completo incluyendo Show Steps para testing interno. Menciona mínimo de $1,000 prepago a $20 CPM (50,000 queries).
4. **20 mar** — Blake revoca el acceso (procedimiento estándar) y hace follow-up preguntando si Jorge quiere proceder con acuerdo comercial.
5. **20 mar** — Jorge responde explicando el avance técnico real, situación económica como estudiante, propone $100-$200 como prepago inicial.
6. **20 mar** — Blake responde positivamente, restaura el acceso, pide: (a) detalles de implementación, (b) métricas de uso, (c) qué prepago puede acomodar Jorge para llevar a su management.

### Posición actual
- Acceso Show Steps **activo** nuevamente ✅
- Blake está dispuesto a hacer pitch interno a su management
- Necesita munición: implementación técnica + métricas + propuesta de prepago
- Jorge no puede pagar $1,000 upfront como estudiante

---

## Lo que ya le enviamos (correo del 20 mar)

- Arquitectura de 2 llamadas (fase1 podstates + fase2 expansión)
- 58 commits en 3 días de desarrollo intensivo
- Stack completo: 9 handlers, 8 servicios, 14 utils, APL visual
- Propuesta de $100-$200 como prepago inicial
- Oferta de compartir repo, screenshots o demo en vivo

---

## Ideas para la propuesta formal (PENDIENTE DE DESARROLLAR)

### Ángulo 1 — Caso de estudio académico
Wolfram podría usar este proyecto como **caso de estudio público** de integración con Alexa Skills. Es el único proyecto conocido que combina:
- Wolfram Alpha Show Steps + Alexa APL visual
- Navegación por voz paso a paso ("siguiente paso", "ir al resultado")
- Arquitectura de 2 llamadas con budget de tiempo estricto (<8s)

Valor para Wolfram: visibilidad en el ecosistema Alexa/Amazon, documentación real de un caso de uso educativo.

### Ángulo 2 — Programa académico / student developer
Proponer formalmente que Wolfram cree (o aplique si existe) un tier para estudiantes/investigadores con:
- Prepago mínimo reducido (ej: $100-$200)
- Cuota mensual de queries limitada (ej: 5,000-10,000 queries/mes)
- Condición: uso estrictamente no comercial + crédito visible a Wolfram en la skill

### Ángulo 3 — Revenue share futuro
Comprometerse a un porcentaje de ingresos futuros si la skill se monetiza (Alexa Skills pueden tener compras in-app). Wolfram recupera su inversión cuando el proyecto escale.

### Ángulo 4 — Demo técnico impresionante para Blake
Antes de enviar la propuesta, tener listo:
- [ ] Video/GIF del paso a paso funcionando en Echo Show
- [ ] Screenshots del APL con los pasos de `∫ x²·sin(x) dx`
- [ ] Métricas reales de testing (número de queries usadas, tipos de problemas)
- [ ] Link al repo público: https://github.com/JpinedaPu/Alexa-ProfesorUniversal

---

## Métricas técnicas reales del proyecto

| Métrica | Valor |
|---------|-------|
| Commits totales | 58 (en ~3 días) |
| Handlers de intents | 9 |
| Servicios integrados | 8 (Wolfram, Claude, GPT, Gemini, Wikipedia, NASA, Wikimedia, ElevenLabs) |
| Módulos utilitarios | 14 |
| Tiempo de respuesta | <7.8s (deadline Alexa: 8s) |
| Infraestructura AWS | Lambda + DynamoDB + S3 + Bedrock |
| Integraciones de caché | S3 (conceptual) + DynamoDB (step-by-step, TTL 24h) |
| Pasos SBS verificados | 5 pasos para ∫ x²·sin(x) dx ✅ |

---

## Implementación técnica del Show Steps (para incluir en propuesta)

```
Llamada 1 — Detección de podstates
GET /v2/query?input=...&format=plaintext
→ Detecta pod.states[] con name="Step-by-step solution"
→ Guarda state.input (ej: "IndefiniteIntegral__Step-by-step solution")
→ canStepByStep = true → muestra botón en APL

Llamada 2 — Expansión de pasos (solo si usuario presiona botón)
GET /v2/query?input=...&podstate=X__Step-by-step+solution&podstate=X__Show+all+steps
→ Extrae pod primary:true con más subpods
→ Filtra por stepbystepcontenttype: SBSIntro + SBSStep
→ Devuelve array de imágenes ordenadas

Navegación por voz:
"siguiente paso" → ContinueWolframIntent → muestra 3 pasos por turno
"ir al resultado" → SkipToResultIntent → salta al último paso
"continúa" → misma lógica con paginación DynamoDB
```

---

## Propuesta de prepago a negociar

| Opción | Prepago | Queries | CPM | Condición |
|--------|---------|---------|-----|-----------|
| Ideal para Jorge | $100 | 5,000 | $20 | Uso no comercial, crédito a Wolfram |
| Alternativa | $200 | 10,000 | $20 | Mismo |
| Si Blake no puede bajar el mínimo | $500 | 25,000 | $20 | Pago en 2 cuotas |
| Mínimo actual de Wolfram | $1,000 | 50,000 | $20 | Estándar comercial |

---

## Próximos pasos antes de enviar

- [ ] Capturar screenshots/video del paso a paso funcionando (necesita deploy activo)
- [ ] Contar queries reales usadas en testing (revisar logs CloudWatch)
- [ ] Decidir qué ángulo principal usar (académico / student tier / revenue share)
- [ ] Redactar el correo formal con Q ayudando
- [ ] Revisar si Wolfram tiene programa académico oficial

---

## Notas técnicas adicionales

- El fix del budget SBS (1500ms → 4500ms paralelo con Claude) fue deployado el 20 mar
- Verificado con `∫ x²·sin(x) dx`: 5 pasos SBS correctos (SBSIntro + 4×SBSStep)
- El `es-ES.json` está sincronizado con el último commit
- Repo público: https://github.com/JpinedaPu/Alexa-ProfesorUniversal
- Repo privado (deploy): Alexa-ProfesorUniversal-private (contiene modo secreto Boaz)
