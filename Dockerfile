FROM node:carbon-slim

RUN  apt-get update && apt-get install -y \
 git python-dev python-setuptools libyaml-dev libpython2.7-dev nmap unzip socat bridge-utils python-pip python-httplib2 libssl-dev libffi-dev \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g --unsafe @mdslab/wstun log4js@1.1.1 requestify mysql nconf ip express node-uuid autobahn q body-parser ps-node nodemailer nodemailer-smtp-transport swagger-jsdoc cors bcrypt optimist jsonwebtoken \
 && npm cache --force clean

RUN mkdir -p /var/lib/iotronic/plugins \
 && mkdir -p /var/lib/iotronic/drivers/ \
 && mkdir -p /var/log/iotronic/ \
 && touch /var/log/iotronic/s4t-iotronic.log

WORKDIR /usr/local/lib/node_modules/@mdslab/

RUN git clone --depth=1 git://github.com/MDSLab/s4t-iotronic-standalone.git ./iotronic-standalone

ENV NODE_PATH=/usr/local/lib/node_modules
ENV IOTRONIC_HOME=/var/lib/iotronic

WORKDIR /usr/local/lib/node_modules/@mdslab/iotronic-standalone/

VOLUME /var/lib/iotronic

CMD [ "./bin/server"]
 
