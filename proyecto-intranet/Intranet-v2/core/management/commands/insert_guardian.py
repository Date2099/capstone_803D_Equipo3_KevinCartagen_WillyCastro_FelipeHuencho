import csv
from django.core.management.base import BaseCommand
from core.models import User, GuardianRelation

class Command(BaseCommand):
    help = 'Importa apoderados desde un archivo CSV y los asocia con sus alumnos.'

    def add_arguments(self, parser):
        parser.add_argument(
            'csv_file',
            type=str,
            help='Ruta completa del archivo CSV, ejemplo: C:\Users\wcast\Downloads\guardians.csv'
        )

    def handle(self, *args, **kwargs):
        csv_file = kwargs['csv_file']
        count = 0
        relations = 0

        # --- Intentar abrir el CSV en UTF-8 y, si falla, en ISO-8859-1 ---
        try:
            with open(csv_file, newline='', encoding='utf-8') as f:
                sample = f.read(2048)
                delimiter = ';' if ';' in sample else ','
                f.seek(0)
                reader = csv.DictReader(f, delimiter=delimiter)
                rows = list(reader)
        except UnicodeDecodeError:
            self.stdout.write(self.style.WARNING("⚠️ Archivo no está en UTF-8, intentando con ISO-8859-1..."))
            with open(csv_file, newline='', encoding='ISO-8859-1') as f:
                sample = f.read(2048)
                delimiter = ';' if ';' in sample else ','
                f.seek(0)
                reader = csv.DictReader(f, delimiter=delimiter)
                rows = list(reader)

        # --- Normalizar encabezados ---
        reader.fieldnames = [h.strip().lower() for h in reader.fieldnames]
        self.stdout.write(self.style.WARNING(f"Encabezados detectados: {reader.fieldnames}"))

        # --- Procesar filas ---
        for row in rows:
            rut = row.get('rut', '').strip()
            first_name = row.get('first_name', '').strip()
            last_name = row.get('last_name', '').strip()
            email = row.get('email', '').strip() or None
            phone = row.get('phone', '').strip() or None
            comuna = row.get('comuna', '').strip() or None
            student_rut = row.get('student_rut', '').strip()

            if not rut:
                continue  # saltar filas vacías

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