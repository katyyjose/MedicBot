from django.contrib import admin
from . import models


# Register your models here.
class WatsonSessionAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.WatsonSession, WatsonSessionAdmin)

