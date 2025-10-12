import csv
from django.core.management.base import BaseCommand
from core.models import User, GuardianRelation


class Command(BaseCommand):
    help = 'Importa apoderados desde un archivo CSV y los asocia con sus alumnos.'

    def add_arguments(self, parser):
        parser.add_argument(
            'csv_file',
            type=str,
            help='Ruta completa del archivo CSV, ejemplo: C:\\Users\\wcast\\Downloads\\guardians.csv'
        )

    def handle(self, *args, **kwargs):
        csv_file = kwargs['csv_file']
        count = 0
        relations = 0

        with open(csv_file, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for row in reader:
                rut = row['rut'].strip()
                first_name = row['first_name'].strip()
                last_name = row['last_name'].strip()
                email = row.get('email', '').strip() or None
                phone = row.get('phone', '').strip() or None
                comuna = row.get('comuna', '').strip() or None
                student_rut = row.get('student_rut', '').strip()

                # Crear o actualizar el apoderado
                guardian, created = User.objects.get_or_create(
                    rut=rut,
                    defaults={
                        'first_name': first_name,
                        'last_name': last_name,
                        'email': email,
                        'phone': phone,
                        'comuna': comuna,
                        'role': User.GUARDIAN,
                        'active_status': 'active'
                    }
                )

                if not created:
                    guardian.first_name = first_name
                    guardian.last_name = last_name
                    guardian.email = email
                    guardian.phone = phone
                    guardian.comuna = comuna
                    guardian.save()
                    self.stdout.write(f'🟡 Actualizado apoderado: {first_name} {last_name}')
                else:
                    self.stdout.write(f'🟢 Creado apoderado: {first_name} {last_name}')

                # Asociar con el estudiante
                if student_rut:
                    try:
                        student = User.objects.get(rut=student_rut, role=User.STUDENT)
                        GuardianRelation.objects.get_or_create(
                            guardian=guardian,
                            student=student
                        )
                        self.stdout.write(f'   ↳ Asociado con estudiante: {student.first_name} {student.last_name}')
                        relations += 1
                    except User.DoesNotExist:
                        self.stdout.write(self.style.WARNING(f'⚠️ No se encontró estudiante con RUT {student_rut}'))

                count += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Carga completa. {count} apoderados procesados, {relations} relaciones creadas.'))
