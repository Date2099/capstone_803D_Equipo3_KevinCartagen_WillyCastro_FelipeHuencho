 Evidencias - Base de Datos

Este directorio contiene las evidencias del diseño, creación y configuración de la base de datos
utilizada para el proyecto Intranet del Colegio San Agustín de Hipona.

 Tecnologías
- Motor: PostgreSQL
- Entorno de desarrollo: PgAdmin + Django ORM
- Hosting final: AWS Lightsail (PostgreSQL Cloud)

 Contenido
- Creacion base de datos en AWS.png → evidencia despliegue en AWS Lightsail
- Diagrama base de datos.png → diseño relacional utilizado para modelar el sistema
- Evidencia_base_datos_2.png → captura de tablas y registros en PgAdmin
- Models base de datos.txt → modelos Django (ORM) que corresponden a las tablas reales del sistema

 Notas
La base de datos fue diseñada para soportar:
- Usuarios con roles diferenciados
- Cursos, asignaturas, horarios y calificaciones
- Gestión de pagos y comprobantes
- Sistema de comunicados
- Control de apoderados y alumnos

La implementación se encuentra validada localmente y se migrará al servicio AWS para producción.
