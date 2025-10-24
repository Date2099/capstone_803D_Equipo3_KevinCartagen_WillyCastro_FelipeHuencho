import csv
from datetime import datetime
from django.core.management.base import BaseCommand
from core.models import Grade, Class, Subject, User


def parse_birth_date(value):
    s = (value or '').strip().replace('“', '').replace('”', '').replace('"', '')
    if not s:
        return None
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


class Command(BaseCommand):
    help = "Carga profesores desde matrizteacher.csv"

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Ruta del archivo CSV de profesores')

    def handle(self, *args, **options):
        csv_path = options['csv_file']
        fila_num = 0
        nuevos = 0
        existentes = 0

        try:
            with open(csv_path, newline='', encoding='utf-8-sig', errors='ignore') as f:
                # autodetección simple; si falla, usa ';'
                sample = f.read(2048)
                f.seek(0)
                try:
                    dialect = csv.Sniffer().sniff(sample, delimiters=[',', ';', '\t'])
                    reader = csv.DictReader(f, dialect=dialect)
                except csv.Error:
                    reader = csv.DictReader(f, delimiter=';')

                for row in reader:
                    fila_num += 1
                    row = {(k or '').strip(): (v or '').strip() for k, v in (row or {}).items()}

                    rut = (row.get('rut') or '').strip().replace(' ', '').replace('\t', '')
                    if not rut:
                        self.stdout.write(self.style.WARNING(f"⚠️  Fila {fila_num}: sin RUT, saltada"))
                        continue

                    curso_id = row.get('curso_id', '')
                    year = int((row.get('year') or '0').strip() or 0)
                    is_head = (row.get('is_head_teacher') or row.get('is_headteacher') or '').lower() in ['si', 'sí', 'true', '1', 'yes']
                    asignatura = row.get('asignatura', '')

                    teacher, created = User.objects.get_or_create(
                        rut=rut,
                        defaults={
                            'first_name': row.get('first_name', ''),
                            'last_name': row.get('last_name', ''),
                            'email': row.get('email') or None,
                            'phone': row.get('phone') or None,
                            'address': row.get('address') or None,
                            'title': row.get('title') or None,
                            'role': User.TEACHER,
                            'birth_date': parse_birth_date(row.get('birth_date')),
                        }
                    )

                    if created:
                        nuevos += 1
                    else:
                        existentes += 1

                    if not (curso_id and year):
                        self.stdout.write(f"✔ Fila {fila_num}: {teacher.first_name} {teacher.last_name} ({rut}) [solo user]")
                        continue

                    grade, _ = Grade.objects.get_or_create(
                        curso_id=curso_id,
                        defaults={'curso_nombre': curso_id}
                    )

                    class_instance, _ = Class.objects.get_or_create(
                        grade=grade,
                        year=year
                    )

                    if is_head and class_instance.teacher_id != teacher.id:
                        class_instance.teacher = teacher
                        class_instance.save(update_fields=['teacher'])

                    if asignatura:
                        subj, created_s = Subject.objects.get_or_create(
                            name=asignatura,
                            class_group=class_instance,
                            defaults={'teacher': teacher}
                        )
                        if not created_s and subj.teacher_id != teacher.id:
                            subj.teacher = teacher
                            subj.save(update_fields=['teacher'])

                    self.stdout.write(f"✔ Fila {fila_num}: {teacher.first_name} {teacher.last_name} ({rut})")

            self.stdout.write(self.style.SUCCESS('✅ Profesores insertados correctamente'))
            self.stdout.write(self.style.SUCCESS(f"📊 Nuevos: {nuevos} | Existentes: {existentes}"))

        except Exception as e:
            import traceback
            self.stdout.write(self.style.ERROR(f"❌ Error inesperado: {e}"))
            self.stdout.write(self.style.WARNING(traceback.format_exc()))