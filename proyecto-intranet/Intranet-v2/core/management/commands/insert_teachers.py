import csv
from django.core.management.base import BaseCommand
from studentView.models import User


class Command(BaseCommand):
    help = "Actualiza los correos electrónicos de los profesores desde matrizteacher.csv"

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Ruta del archivo CSV de profesores')

    def handle(self, *args, **options):
        csv_path = options['csv_file']
        fila_num = 0
        actualizados = 0
        no_encontrados = 0

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
                    email = (row.get('email') or '').strip().lower()

                    if not rut or not email:
                        self.stdout.write(self.style.WARNING(f"⚠️  Fila {fila_num}: sin RUT o email, saltada"))
                        continue

                    user = User.objects.filter(rut=rut, role=User.TEACHER).first()
                    if not user:
                        no_encontrados += 1
                        self.stdout.write(self.style.WARNING(f"❌ RUT {rut} no encontrado en la base de datos"))
                        continue

                    user.email = email
                    user.save(update_fields=['email'])
                    actualizados += 1
                    self.stdout.write(f"✔ {user.first_name} {user.last_name} ({rut}) → {email}")

            self.stdout.write(self.style.SUCCESS('✅ Correos actualizados correctamente'))
            self.stdout.write(self.style.SUCCESS(f"📊 Total actualizados: {actualizados} | No encontrados: {no_encontrados}"))

        except Exception as e:
            import traceback
            self.stdout.write(self.style.ERROR(f"❌ Error inesperado: {e}"))
            self.stdout.write(self.style.WARNING(traceback.format_exc()))
