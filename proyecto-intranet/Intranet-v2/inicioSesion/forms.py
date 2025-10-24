from django import forms

class LoginForm(forms.Form):
    rut = forms.CharField(
        label="",
        max_length=20,
        widget=forms.TextInput(attrs={
            "placeholder": "",
            "autocomplete": "off",  # 👈 evita que el navegador lo recuerde
            "class": "input-field",
            "id": "id_rut",
        })
    )

    password = forms.CharField(
        label="",
        widget=forms.PasswordInput(attrs={
            "placeholder": "",
            "autocomplete": "off",  # 👈 evita autocompletar
            "class": "input-field",
            "id": "id_password",
        })
    )

    remember = forms.BooleanField(
        label="Recordarme",
        required=False,
        widget=forms.CheckboxInput(attrs={"class": "checkbox-field"})
    )
