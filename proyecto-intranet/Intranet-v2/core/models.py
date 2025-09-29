from django.db import models

# Create your models here.
from django.db import models
from django.contrib.auth.models import AbstractUser

# ---------------------------
# Modelo de Usuario
# ---------------------------

class User(AbstractUser):
    STUDENT = "student"
    GUARDIAN = "guardian"
    TEACHER = "teacher"
    ADMIN = "admin"
    FINANCE_ADMIN = "finance_admin"

    ROLE_CHOICES = [
        (STUDENT, "Alumno"),
        (GUARDIAN, "Apoderado"),
        (TEACHER, "Profesor"),
        (ADMIN, "Administrador"),
        (FINANCE_ADMIN, "Administrador de Finanzas"),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    
    rut = models.CharField(max_length=15, unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    comuna = models.CharField(max_length=100, null=True, blank=True)
    ingreso_date = models.DateField(null=True, blank=True)
    active_status = models.CharField(
        max_length=20,
        choices=[("active", "Activo"), ("inactive", "Inactivo")],
        default="active"
    )
    # Campos específicos por rol
    department = models.CharField(max_length=100, null=True, blank=True)
    title = models.CharField(max_length=150, null=True, blank=True)
    subject = models.CharField(max_length=150, null=True, blank=True)
    position = models.CharField(max_length=150, null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


# ---------------------------
# Managers por rol
# ---------------------------
class StudentManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(role=User.STUDENT)

class TeacherManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(role=User.TEACHER)

class GuardianManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(role=User.GUARDIAN)


# ---------------------------
# Grados y Clases
# ---------------------------
class Grade(models.Model):
    name = models.CharField(max_length=100, unique=True)  
    # Ej: "Prekínder", "1° Básico", "4° Medio"

    def __str__(self):
        return self.name


class Class(models.Model):
    grade = models.ForeignKey(Grade, on_delete=models.CASCADE)
    year = models.IntegerField()
    teacher = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, limit_choices_to={"role": User.TEACHER}
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['grade', 'year'], name='unique_class_per_year')
        ]

    def __str__(self):
        return f"{self.grade} - {self.year}"


# ---------------------------
# Matrículas (Enrollment)
# ---------------------------
class Enrollment(models.Model):
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, limit_choices_to={"role": User.STUDENT}
    )
    class_group = models.ForeignKey(Class, on_delete=models.CASCADE)
    date = models.DateField()
    active_status = models.CharField(
        max_length=20,
        choices=[("active", "Activo"), ("inactive", "Inactivo")],
        default="active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['student', 'class_group'], name='unique_enrollment')
        ]

    def __str__(self):
        return f"{self.student} en {self.class_group}"


# ---------------------------
# Relación Apoderado - Alumno
# ---------------------------
class GuardianRelation(models.Model):
    guardian = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="guardian_relations",
        limit_choices_to={"role": User.GUARDIAN},
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="student_relations",
        limit_choices_to={"role": User.STUDENT},
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['guardian', 'student'], name='unique_guardian_student')
        ]

    def __str__(self):
        return f"{self.guardian} -> {self.student}"


# ---------------------------
# Evaluaciones y Resultados
# ---------------------------
class EvaluationType(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()

    def __str__(self):
        return self.name


class Evaluation(models.Model):
    class_group = models.ForeignKey(Class, on_delete=models.CASCADE)
    teacher = models.ForeignKey(
        User, on_delete=models.CASCADE, limit_choices_to={"role": User.TEACHER}
    )
    evaluation_type = models.ForeignKey(EvaluationType, on_delete=models.CASCADE)
    date = models.DateField()
    description = models.TextField()
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)  # peso evaluación

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.class_group} - {self.evaluation_type} ({self.date})"


class GradeResult(models.Model):
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE)
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, limit_choices_to={"role": User.STUDENT}
    )
    score = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['evaluation', 'student'], name='unique_grade_result')
        ]

    def __str__(self):
        return f"{self.student} - {self.score}"


# ---------------------------
# Asistencia
# ---------------------------
class Attendance(models.Model):
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, limit_choices_to={"role": User.STUDENT}
    )
    class_group = models.ForeignKey(Class, on_delete=models.CASCADE)
    date = models.DateField()
    present = models.BooleanField()
    justified_absence = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['student', 'class_group', 'date'], name='unique_attendance')
        ]

    def __str__(self):
        return f"{self.student} - {self.date}: {'Presente' if self.present else 'Ausente'}"


# ---------------------------
# Pagos
# ---------------------------
class Payment(models.Model):
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, limit_choices_to={"role": User.STUDENT}
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    concept = models.CharField(max_length=100, default="Mensualidad")  # nuevo campo
    date = models.DateField()
    status = models.CharField(
        max_length=20, choices=[("paid", "Pagado"), ("pending", "Pendiente")]
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} - {self.amount} ({self.status})"