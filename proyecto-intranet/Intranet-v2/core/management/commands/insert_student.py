import csv
from datetime import datetime
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

# Modelos que pueden vivir en 'core' o 'studentView'
def import_models():
    try:
        from core.models import Class, Enrollment
        return Class, Enrollment
    except Exception:
        from studentView.models import Class, Enrollment
        return Class, Enrollment

User = get_user_model()
Class, Enrollment = import_models()

def normalize_rut(rut: str) -> str:
    """Quita puntos y espacios; conserva guion."""
    rut = (rut or "").strip()
    rut = rut.replace(".", "").replace(" ", "")
    return rut

def parse_date_mx(s: str):
    """Intenta varios formatos comunes (CL/US/ISO). Devuelve date o None."""
    if not s:
        return None
    s = s.strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None

class Command(BaseCommand):
    help = 'Importa estudiantes desde un archivo CSV y los asocia a sus cursos.'

    def add_arguments(self, parser):
        # csv_file ahora es OPCIONAL y con default a tu ruta
        parser.add_argument(
            "csv_file",
            nargs="?",
            default=r"C:\Users\Softer\Desktop\CARGA DE ARCHIVOS GOD\matriz de carga.csv",
            help="Ruta del CSV. Si no se indica, usa la ruta por defecto."
        )
        parser.add_argument(
            "--year",
            type=int,
            default=timezone.now().year,
            help="Año académico para la matrícula (default: año actual)."
        )

    def _read_csv_rows(self, csv_file: str):
        """Lee CSV intentando UTF-8 y luego ISO-8859-1, detecta delimitador y normaliza filas."""
        rows = []
        encodings = ["utf-8", "ISO-8859-1"]
        last_exc = None

        for enc in encodings:
            try:
                with open(csv_file, "r", encoding=enc, newline="") as f:
                    sample = f.read(4096)
                    f.seek(0)

                    # Delimitador
                    try:
                        dialect = csv.Sniffer().sniff(sample, delimiters=";,")
                        delimiter = dialect.delimiter
                    except Exception:
                        delimiter = ";" if ";" in sample else ","

                    reader = csv.DictReader(f, delimiter=delimiter)
                    # Normalizar cada fila: llaves y valores
                    for r in reader:
                        norm = {}
                        for k, v in (r or {}).items():
                            key = (k or "").strip().lower()
                            val = (v or "").strip()
                            norm[key] = val
                        rows.append(norm)

                    self.stdout.write(self.style.WARNING(
                        f"Encoding={enc} Delimiter='{delimiter}' Encabezados={list(reader.fieldnames or [])}"
                    ))
                    return rows
            except UnicodeDecodeError as e:
                last_exc = e
                continue
            except FileNotFoundError:
                raise CommandError(f"Archivo no encontrado: {csv_file}")

        if last_exc:
            raise CommandError(f"No se pudo leer el CSV con UTF-8 ni ISO-8859-1: {last_exc}")
        return rows

    @transaction.atomic
    def handle(self, *args, **kwargs):
        csv_file = kwargs["csv_file"]
        year = kwargs["year"]

        # Validación de existencia
        if not Path(csv_file).exists():
            raise CommandError(f"Archivo no encontrado: {csv_file}")

        rows = self._read_csv_rows(csv_file)
        if not rows:
            self.stdout.write(self.style.WARNING("⚠️ El CSV está vacío o no tiene filas."))
            return

        created = 0
        updated = 0
        enrolled = 0
        skipped = 0
        errors = 0

        for row in rows:
            try:
                rut = normalize_rut(row.get("rut", ""))
                if not rut:
                    self.stdout.write(self.style.WARNING("⚠️ Fila sin RUT. Saltando..."))
                    skipped += 1
                    continue

                first_name = row.get("first_name", "")
                last_name = row.get("last_name", "")
                email = row.get("email") or None
                role = (row.get("role") or User.STUDENT).strip().lower()
                comuna = row.get("comuna") or None
                phone = row.get("phone") or None
                active_status = (row.get("active_status") or "active").strip().lower()
                curso_id = row.get("curso_id") or ""
                birth_date = parse_date_mx(row.get("birth_date") or "")
                ingreso_date = parse_date_mx(row.get("ingreso_date") or "")

                # Crear / actualizar usuario por RUT
                student, was_created = User.objects.get_or_create(
                    rut=rut,
                    defaults={
                        "first_name": first_name,
                        "last_name": last_name,
                        "email": email,
                        "role": role,
                        "birth_date": birth_date,
                        "comuna": comuna,
                        "ingreso_date": ingreso_date,
                        "phone": phone,
                        "active_status": active_status,
                    },
                )

                if was_created:
                    created += 1
                    self.stdout.write(f"🟢 Creado: {first_name} {last_name} ({rut})")
                else:
                    # Update idempotente
                    changed = False
                    for field, value in {
                        "first_name": first_name,
                        "last_name": last_name,
                        "email": email,
                        "role": role,
                        "birth_date": birth_date,
                        "comuna": comuna,
                        "ingreso_date": ingreso_date,
                        "phone": phone,
                        "active_status": active_status,
                    }.items():
                        if getattr(student, field) != value:
                            setattr(student, field, value)
                            changed = True
                    if changed:
                        student.save()
                        updated += 1
                        self.stdout.write(f"🟡 Actualizado: {first_name} {last_name} ({rut})")

                # Matricular si hay curso_id
                if curso_id:
                    try:
                        class_group = Class.objects.get(grade__curso_id=curso_id, year=year)
                        _, enr_created = Enrollment.objects.get_or_create(
                            student=student,
                            class_group=class_group,
                            defaults={"active_status": "active", "date": ingreso_date},
                        )
                        if enr_created:
                            enrolled += 1
                            self.stdout.write(f"   ↳ Matriculado en: {class_group}")
                    except Class.DoesNotExist:
                        self.stdout.write(self.style.WARNING(
                            f"⚠️ Clase no encontrada para curso_id '{curso_id}' y año {year}"
                        ))
                else:
                    self.stdout.write(self.style.WARNING("ℹ️ Sin curso_id; no se matricula."))

            except Exception as e:
                errors += 1
                self.stdout.write(self.style.ERROR(f"❌ Error en fila (rut={row.get('rut')}): {e}"))

        self.stdout.write(self.style.SUCCESS(
            f"✅ Carga completa. Total filas={len(rows)} | Creados={created} | Actualizados={updated} | Matriculados={enrolled} | Omitidos={skipped} | Errores={errors}"
        ))
