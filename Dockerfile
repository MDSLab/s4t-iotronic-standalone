FROM node:8.15-slim

RUN  apt-get update && apt-get install -y \
 git python-dev python-setuptools libyaml-dev libpython2.7-dev nmap unzip socat bridge-utils python-pip python-httplib2 libssl-dev libffi-dev vim

#Fix Vulnerabilities
RUN apt-get install -y procps wget curl gnupg openssl
RUN apt-get install -y curl apt
 
RUN rm -rf /var/lib/apt/lists/*

RUN npm install -g --unsafe log4js@1.1.1 requestify@0.2.5 mysql@2.16.0 nconf@0.10.0 ip@1.1.5 express@4.16.4 node-uuid@1.4.8 autobahn@18.10.2 ws@6.1.0 q@1.5.1 body-parser@1.18.3 ps-node@0.1.6 nodemailer@4.6.7 nodemailer-smtp-transport@2.7.4 swagger-jsdoc@1.9.7 cors@2.8.4 bcrypt@3.0.3 optimist@0.6.1 jsonwebtoken@8.3.0 md5@2.2.1 && npm cache --force clean

RUN mkdir -p /var/lib/iotronic/plugins \
 && mkdir -p /var/lib/iotronic/drivers/ \
 && mkdir -p /var/lib/iotronic/.node-red/ \
 && mkdir -p /var/log/iotronic/ \
 && touch /var/log/iotronic/s4t-iotronic.log

WORKDIR /usr/local/lib/node_modules/@mdslab/

RUN git clone --depth=1 git://github.com/MDSLab/s4t-iotronic-standalone.git ./iotronic-standalone

ENV NODE_PATH=/usr/local/lib/node_modules
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ENV IOTRONIC_HOME=/var/lib/iotronic

EXPOSE 8443 8888

WORKDIR /usr/local/lib/node_modules/@mdslab/iotronic-standalone/

VOLUME /var/lib/iotronic

CMD [ "./bin/server"]
 
