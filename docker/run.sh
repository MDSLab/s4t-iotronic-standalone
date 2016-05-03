#!/bin/bash

# Apache License
#                            Version 2.0, January 2004
#                         http://www.apache.org/licenses/
# Copyright (c) 2016 Kostya Esmukov <kostya@esmukov.ru>


cd "$S4T_IOTRONIC_PATH"

if [ -r "$S4T_IOTRONIC_SETTINGS_PATH/settings.json" ]; then
    cp "$S4T_IOTRONIC_SETTINGS_PATH/settings.json" "lib/settings.json"
else
    cp "lib/settings.example.json" "lib/settings.json"

    ./docker/fill_settings.py "lib/settings.json"

    if mysql -h "$S4T_IOTRONIC_SETTINGS_CONFIG__SERVER__DB__HOST" -u "$S4T_IOTRONIC_SETTINGS_CONFIG__SERVER__DB__USER" -p"$S4T_IOTRONIC_SETTINGS_CONFIG__SERVER__DB__PASSWORD" "$S4T_IOTRONIC_SETTINGS_CONFIG__SERVER__DB__DB_NAME" >/dev/null 2>&1 </dev/null
    then
        echo "Database exists"
    else
        echo "Database doesn't exist, creating one for you"
        mysql -h "$S4T_IOTRONIC_SETTINGS_CONFIG__SERVER__DB__HOST" -u "$S4T_IOTRONIC_SETTINGS_CONFIG__SERVER__DB__USER" -p"$S4T_IOTRONIC_SETTINGS_CONFIG__SERVER__DB__PASSWORD" < utils/s4t-db.sql
    fi

fi

exec supervisord --nodaemon -c docker/supervisord.conf