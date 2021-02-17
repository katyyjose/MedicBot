"""server URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.11/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url
from django.contrib import admin
from django.conf.urls.static import static
from django.conf import settings

from chatbot import views


urlpatterns = [

    url(r'api/message', views.apiMessage, name="apiMessage"),
    url(r'api/auth', views.auth, name="auth"),
    url(r'^chatbot\.js', views.chatbot_js, name="chatbot_js"),
    url(r'^chatbot$', views.chatbot, name="chatbot"),
    url(r'^chatbot/$', views.chatbot, name="chatbot"),
    url(r'login$', views.admin_login, name="admin_login"),
    url(r'signup$', views.signup, name="signup"),
    url(r'logout$', views.admin_logout, name="admin_logout"),
    url(r'report$', views.pdf, name="pdf"),

    url(r'^customize_chatbot$', views.customize_chatbot, name="customize_chatbot"),


    url(r'admin/users$', views.dashboard, name="dashboard"),


    url(r'admin$', views.admin_login, name="admin_login"),


    url(r'^admin/', admin.site.urls),


]

if settings.DEBUG:
    urlpatterns.append(url(r'^$', views.index, name="index"))
else:
    urlpatterns.append(url(r'^$', views.chatbot, name="chatbot"))

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

handler404 = views.handler404
handler403 = views.handler403
handler500 = views.handler500
