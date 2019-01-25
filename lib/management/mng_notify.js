//###############################################################################
//##
//# Copyright (C) 2017 Nicola Peditto
//##
//# Licensed under the Apache License, Version 2.0 (the "License");
//# you may not use this file except in compliance with the License.
//# You may obtain a copy of the License at
//##
//# http://www.apache.org/licenses/LICENSE-2.0
//##
//# Unless required by applicable law or agreed to in writing, software
//# distributed under the License is distributed on an "AS IS" BASIS,
//# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//# See the License for the specific language governing permissions and
//# limitations under the License.
//##
//###############################################################################


var logger = log4js.getLogger('notify');
logger.setLevel(loglevel);

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// NOTIFIER CONFIGURATION
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
enable_notify = nconf.get('config:server:notifier:enable_notify');

if(enable_notify == "true"){

    email_notifier = nconf.get('config:server:notifier:email');

    if(email_notifier != undefined){

        logger.info("[SYSTEM] - Noification system enabled: email");

        // SMTP configuration
        admin_email = nconf.get('config:server:notifier:email:address');
        admin_email_pw = nconf.get('config:server:notifier:email:password');
        smtp_server = nconf.get('config:server:notifier:email:smtp:smtp_server');
        smtp_port = nconf.get('config:server:notifier:email:smtp:smtp_port');
        smtp_secure = nconf.get('config:server:notifier:email:smtp:smtp_secure');

        smtpConfig = {
            host: smtp_server,
            port: smtp_port,
            secure: smtp_secure,
            auth: {
                user: admin_email,
                pass: admin_email_pw
            }
        };

        logger.debug("[SYSTEM] - SMTP configuration:\n" + JSON.stringify(nconf.get('config:server:notifier:email:smtp'), null, "\t"));

    }


}

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++