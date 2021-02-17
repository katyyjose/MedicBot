from django import forms
from django.contrib.auth.forms import UserCreationForm

from chatbot import models



class Login(forms.Form):

    email = forms.EmailField(required=True, label="Email")
    # password = forms.CharField(widget=forms.PasswordInput, required=True, label="Password")
    dna = forms.CharField(label="dna", required=False)

    def __init__(self, *args, **kwargs):
        super(Login, self).__init__(*args, **kwargs)
        for i in self.fields:
            self.fields[i].widget.attrs.update({'class' : 'form-control disable-autocomplete'})
            self.fields[i].widget.attrs.update({'placeholder' : self.fields[i].label})

    def clean_email(self):
        return self.cleaned_data['email'].lower()

class CreateUser(UserCreationForm):

    dna = forms.CharField(label="dna", required=False)
    class Meta():
        model = models.User
        fields = ('title', 'full_name', 'address', 'phone', 'email', 'password1', 'password2')


    def __init__(self, *args, **kwargs):
        super(CreateUser, self).__init__(*args, **kwargs)
        for i in self.fields:
            if self.fields[i].label == "Title":
                self.fields[i].widget.attrs.update({'class' : 'form-control'})
                continue
            self.fields[i].widget.attrs.update({'class' : 'form-control disable-autocomplete'})
            self.fields[i].widget.attrs.update({'placeholder' : self.fields[i].label})

    def clean_email(self):
        return self.cleaned_data['email'].lower()
