import csv
from datetime import datetime
from django.core.management.base import BaseCommand
from core.models import User, Class, Enrollment


class Command(BaseCommand):
    help = 'Importa estudiantes desde un archivo CSV y los asocia a sus cursos.'

    def add_arguments(self, parser):
        # Mensaje de ayuda sin causar errores de Unicode
        parser.add_argument(
            'csv_file',
            type=str,
            help= 'Ruta completa del archivo CSV, ejemplo: C:\\Users\\wcast\\Downloads\\matriz de carga.csv'

        )

    def handle(self, *args, **kwargs):
        csv_file = kwargs['csv_file']
        count = 0

        with open(csv_file, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for row in reader:
                rut = row['rut'].strip()
                first_name = row['first_name'].strip()
                last_name = row['last_name'].strip()
                email = row.get('email', '').strip() or None
                role = row.get('role', User.STUDENT).strip().lower() or User.STUDENT
                birth_date = None
                ingreso_date = None
                comuna = row.get('comuna', '').strip() or None
                phone = row.get('phone', '').strip() or None
                address = row.get('address', '').strip() or None
                active_status = row.get('active_status', 'active').strip().lower()
                curso_id = row.get('curso_id', '').strip()

                # Parsear fechas si existen
                try:
                    if row.get('birth_date'):
                        birth_date = datetime.strptime(row['birth_date'], '%Y-%m-%d').date()
                    if row.get('ingreso_date'):
                        ingreso_date = datetime.strptime(row['ingreso_date'], '%Y-%m-%d').date()
                except ValueError:
                    self.stdout.write(self.style.WARNING(f"⚠️ Formato de fecha inválido en {rut}"))

                # Crear o actualizar el usuario
                student, created = User.objects.get_or_create(
                    rut=rut,
                    defaults={
                        'first_name': first_name,
                        'last_name': last_name,
                        'email': email,
                        'role': role,
                        'birth_date': birth_date,
                        'comuna': comuna,
                        'ingreso_date': ingreso_date,
                        'phone': phone,
                        'address': address,
                        'active_status': active_status,
                    }
                )

                if not created:
                    student.first_name = first_name
                    student.last_name = last_name
                    student.email = email
                    student.role = role
                    student.birth_date = birth_date
                    student.comuna = comuna
                    student.ingreso_date = ingreso_date
                    student.phone = phone
                    student.address = address
                    student.active_status = active_status
                    student.save()
                    self.stdout.write(f'🟡 Actualizado: {first_name} {last_name}')
                else:
                    self.stdout.write(f'🟢 Creado: {first_name} {last_name}')

                # Asociar estudiante a su clase
                if curso_id:
                    try:
                        class_group = Class.objects.get(grade__curso_id=curso_id, year=2025)
                        Enrollment.objects.get_or_create(
                            student=student,
                            class_group=class_group,
                            defaults={'active_status': 'active', 'date': ingreso_date},
                        )
                        self.stdout.write(f'   ↳ Matriculado en: {class_group}')
                    except Class.DoesNotExist:
                        self.stdout.write(self.style.WARNING(f'⚠️ Clase no encontrada para curso_id {curso_id}'))

                count += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Carga completa. {count} estudiantes procesados.'))
