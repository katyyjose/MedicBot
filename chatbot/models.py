import uuid
from django.db import models
from django.utils import timezone

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


class MyUserManager(BaseUserManager):
    """
    A custom user manager to deal with emails as unique identifiers for auth
    instead of usernames. The default that's used is "UserManager"
    """
    def _create_user(self, email, password, **extra_fields):
        """
        Creates and saves a User with the given email and password.
        """
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):
        """
            Crear super usuario
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('verified', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self._create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):

    is_staff = models.BooleanField(
        'staff status',
        default=False,
        help_text=('Designates whether the user can log into this site.'),
    )
    is_active = models.BooleanField(
        'active',
        default=True,
        help_text=(
            'Designates whether this user should be treated as active. '
            'Unselect this instead of deleting accounts.'
        ),
    )

    titles = [
        ("", "Title"),
        ("MD", "MD"),
        ("DO", "DO"),
        ("PA", "PA"),
        ("DMD", "DMD"),
        ("DDS", "DDS"),
    ]

    email = models.EmailField(unique=True, null=True)
    title = models.CharField(max_length=100, verbose_name='Title', help_text="Title", choices=titles)
    full_name = models.CharField(max_length=100, verbose_name='Full Name', help_text="Full Name")
    is_superuser = models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')
    phone = models.CharField(max_length=100, verbose_name='Phone', help_text="Phone")
    address = models.CharField(max_length=100, verbose_name='Address', help_text="Address")
    verified     = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)


    USERNAME_FIELD = 'email'
    objects = MyUserManager()


    def __str__(self):
        return self.email

    def get_username(self):
        return self.email

    def get_short_name(self):
        return self.email

class WatsonSession(models.Model):
    # uuid = models.UUIDField(default=uuid.uuid4, editable=False)
    session_id = models.CharField(max_length=64)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    context = models.CharField(max_length=1024*20, blank=True)
    conv = models.PositiveIntegerField(null=True, blank=True)
    token = models.CharField(max_length=512, null=True)
    previousToken = models.CharField(max_length=512, null=True)
    count = models.IntegerField(default=0)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    def save(self, *args, **kwargs):
        if not self.id:
            self.created = timezone.now()
        self.modified = timezone.now()
        super(WatsonSession, self).save(*args, **kwargs)

    def serialize(self):
        return {
            "created": self.created.strftime('%d/%m/%Y %H:%M'),
            "modified": self.modified.strftime('%d/%m/%Y %H:%M')
        }
