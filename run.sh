#!/bin/bash

#echo STARTINGD RUN.SH FOR STARTING DJANGO SERVER PORT IS $PORT
#
#echo ENVIRONMENT VAIRABLES IN RUN.SH
#printenv


#Change this values for django superuser


if [ -z "$VCAP_APP_PORT" ];
  then SERVER_PORT=5000;
  else SERVER_PORT="$VCAP_APP_PORT";
fi


echo [$0] port is------------------- $SERVER_PORT
rm -rf chatbot/migrations/

# python manage.py makemigrations chatbot
# python manage.py migrate
# python manage.py populate_db
python manage.py collectstatic --no-input

# echo "from app import models; models.User.objects.create_superuser('${MAIL}', '${PASS}')" | python3 manage.py shell

echo [$0] Starting Django Server...
if [ -z "$DEBUG" ]
    then python3 manage.py runserver 0.0.0.0:$SERVER_PORT;

else if [ $DEBUG -eq 0 ]
        then gunicorn -w 4 server.wsgi;
        else python3 manage.py runserver 0.0.0.0:$SERVER_PORT;
    fi
fi
