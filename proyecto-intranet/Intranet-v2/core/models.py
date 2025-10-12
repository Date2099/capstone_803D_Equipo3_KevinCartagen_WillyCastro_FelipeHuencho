from django.db import models
from django.contrib.auth.models import AbstractUser


# Modelo de Usuario

from django.db import models
from django.contrib.auth.models import AbstractUser

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


    #  Campo role
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=STUDENT)


    #  Eliminamos el campo username de Django
    username = None

    #  Usamos el RUT como campo de login
    rut = models.CharField(max_length=15, unique=True)

    # Datos personales
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(null=True, blank=True)
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
    position = models.CharField(max_length=150, null=True, blank=True)

    # Campos de configuración para login
    USERNAME_FIELD = 'rut'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'email']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.get_role_display()})"




# Managers por rol

class StudentManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(role=User.STUDENT)

class TeacherManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(role=User.TEACHER)

class GuardianManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(role=User.GUARDIAN)



# Grados y Clases

class Grade(models.Model):
    curso_id = models.CharField(max_length=5, primary_key=True)
    curso_nombre = models.CharField(max_length=30, unique=True)

    def __str__(self):
        return f"{self.curso_id} - {self.curso_nombre}"


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



# Asignaturas

class Subject(models.Model):
    name = models.CharField(max_length=100)
    class_group = models.ForeignKey(Class, on_delete=models.CASCADE)
    teacher = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, limit_choices_to={"role": User.TEACHER}
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['name', 'class_group'], name='unique_subject_per_class')
        ]

    def __str__(self):
        return f"{self.name} ({self.class_group})"



# Matrículas (Enrollment)

class Enrollment(models.Model):
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, limit_choices_to={"role": User.STUDENT}
    )
    class_group = models.ForeignKey(Class, on_delete=models.CASCADE)
    date = models.DateField(null=True, blank=True)
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


# Relación Apoderado - Alumno

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



# Evaluaciones y Resultados

class EvaluationType(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()

    def __str__(self):
        return self.name


class Evaluation(models.Model):
    class_group = models.ForeignKey(Class, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)  # 🔹 Nueva relación
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
        return f"{self.subject} - {self.evaluation_type} ({self.date})"


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
        return f"{self.student} - {self.evaluation.subject.name}: {self.score}"



# Asistencia

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



# Pagos

class Payment(models.Model):
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, limit_choices_to={"role": User.STUDENT}
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    concept = models.CharField(max_length=100, default="Mensualidad")
    date = models.DateField()
    status = models.CharField(
        max_length=20, choices=[("paid", "Pagado"), ("pending", "Pendiente")]
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} - {self.amount} ({self.status})"
