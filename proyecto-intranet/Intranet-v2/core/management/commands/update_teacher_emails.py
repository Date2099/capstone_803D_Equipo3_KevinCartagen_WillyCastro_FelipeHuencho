import csv
from django.core.management.base import BaseCommand
from core.models import User

class Command(BaseCommand):
    help = "Actualiza los correos electrónicos de los profesores desde el archivo CSV."

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Ruta del archivo CSV de profesores')

    def handle(self, *args, **options):
        csv_path = options['csv_file']
        fila_num = 0
        actualizados = 0
        no_encontrados = 0

        try:
            # Abrimos el archivo con newline="" para que respete los saltos internos
            with open(csv_path, newline='', encoding='utf-8-sig', errors='ignore') as f:
                reader = csv.DictReader(f, delimiter=';', quoting=csv.QUOTE_MINIMAL)
                print("🧾 Encabezados detectados:", reader.fieldnames)

                for row in reader:
                    fila_num += 1
                    row = {(k or '').strip(): (v or '').strip() for k, v in (row or {}).items()}

                    rut = (row.get('rut') or '').strip().replace(' ', '').replace('\t', '')
                    email = (row.get('email') or '').strip()

                    if not rut or not email:
                        self.stdout.write(self.style.WARNING(f"⚠️  Fila {fila_num}: sin rut o email, saltada"))
                        continue

                    user = User.objects.filter(rut=rut, role=User.TEACHER).first()
                    if not user:
                        no_encontrados += 1
                        self.stdout.write(self.style.WARNING(f"❌ RUT {rut} no encontrado en la base de datos"))
                        continue

                    user.email = email.lower()
                    user.save(update_fields=['email'])
                    actualizados += 1
                    self.stdout.write(f"✔ {user.first_name} {user.last_name} ({rut}) → {email}")

            self.stdout.write(self.style.SUCCESS("\n✅ Correos actualizados correctamente"))
            self.stdout.write(self.style.SUCCESS(f"📊 Total actualizados: {actualizados} | No encontrados: {no_encontrados}"))

        except Exception as e:
            import traceback
            self.stdout.write(self.style.ERROR(f"❌ Error inesperado: {e}"))
            self.stdout.write(self.style.WARNING(traceback.format_exc()))
