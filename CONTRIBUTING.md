# Contributing to Profesor Universal IA

¡Gracias por tu interés en contribuir! Este proyecto es una Alexa Skill educativa de código abierto.

## 🚀 Cómo Contribuir

### 1. Fork y Clone
```bash
git clone https://github.com/JpinedaPu/AlexaProfesorUniversal.git
cd AlexaProfesorUniversal
```

### 2. Instalar Dependencias
```bash
cd lambda
npm install
```

### 3. Configurar Variables de Entorno
Crea un archivo `.env` en `lambda/`:
```env
OPENAI_API_KEY=tu-api-key
WOLFRAM_APP_ID=tu-app-id
GEMINI_API_KEY=tu-api-key
```

### 4. Crear una Rama
```bash
git checkout -b feature/mi-nueva-funcionalidad
```

### 5. Hacer Cambios
- Sigue el estilo de código existente (JSDoc en español)
- Agrega tests si es necesario
- Actualiza documentación relevante

### 6. Ejecutar Tests
```bash
npm test
```

### 7. Commit y Push
```bash
git add .
git commit -m "feat: descripción clara del cambio"
git push origin feature/mi-nueva-funcionalidad
```

### 8. Crear Pull Request
- Describe claramente qué cambios hiciste y por qué
- Referencia issues relacionados si existen
- Asegúrate de que los tests pasen

## 📋 Estándares de Código

### Commits
Usamos [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `refactor:` Refactorización de código
- `test:` Agregar o modificar tests
- `chore:` Tareas de mantenimiento

### Documentación
- JSDoc en español para todas las funciones
- Comentarios explicativos del "por qué", no del "qué"
- Actualizar README.md si cambias funcionalidad principal

### Testing
- Testing manual en Alexa Developer Console
- Testing manual en Alexa Developer Console
- Cobertura verificada mediante testing funcional

## 🐛 Reportar Bugs

Abre un issue con:
1. Descripción clara del problema
2. Pasos para reproducir
3. Comportamiento esperado vs actual
4. Logs relevantes (sin API keys)
5. Versión de Node.js y sistema operativo

## 💡 Sugerir Funcionalidades

Abre un issue con:
1. Descripción de la funcionalidad
2. Caso de uso específico
3. Beneficio para usuarios finales
4. Posible implementación (opcional)

## 📞 Contacto

- GitHub Issues: Para bugs y features
- Discussions: Para preguntas generales

## 📜 Código de Conducta

- Sé respetuoso y profesional
- Acepta críticas constructivas
- Enfócate en lo mejor para el proyecto
- Ayuda a otros contribuidores

---

¡Gracias por hacer de Profesor Universal IA un mejor proyecto! 🎓
