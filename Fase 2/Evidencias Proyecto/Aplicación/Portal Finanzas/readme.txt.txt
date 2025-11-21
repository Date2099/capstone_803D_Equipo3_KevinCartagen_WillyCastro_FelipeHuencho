📂 Evidencias — Portal Finanzas

Este directorio contiene las evidencias del desarrollo e implementación del Portal de Finanzas
del sistema de Intranet Escolar del Colegio San Agustín de Hipona.

El Portal de Finanzas permite la gestión administrativa de los pagos realizados por los
apoderados y verificados mediante comprobantes. Este módulo reemplaza temporalmente el
procesamiento automático vía Transbank mientras el establecimiento genera sus credenciales
oficiales.

 Funcionalidades Implementadas
- Visualización de comprobantes enviados por los apoderados
- Revisión manual de pagos por el administrador de finanzas
- Validación o rechazo de comprobantes con registro de comentarios
- Cambio automático del estado del pago del estudiante
- Vistas separadas para comprobantes pendientes, aprobados y rechazados
- Interfaz alineada a la identidad visual del colegio
- Sistema con autenticación segura por rol: solo Finanzas accede a este módulo

 Tecnologías utilizadas
- Frontend: HTML, CSS (tema institucional)
- Backend: Django (Python)
- Base de Datos: PostgreSQL
- ORM: Django Models
- Archivos multimedia almacenados en servidor (comprobantes)

📎 Archivos incluidos como evidencia
- Portal Finanzas FOTO 1.png — vista panel de revisión
- Portal Finanzas FOTO 2.png — detalle de comprobante
- Portal Finanzas FOTO 3.png — opciones de aprobación/rechazo
- Código fuente: admin.py, models.py, urls.py, views.py

 Notas
Este módulo se conectará posteriormente al sistema de pagos bancarios oficial
cuando el establecimiento proporcione las credenciales Transbank/Getnet.

Pendiente: mejora estética final y automatización del feedback al apoderado



