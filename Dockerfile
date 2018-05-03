FROM node:boron

RUN  apt-get update && apt-get install -y \
 git python-dev python-setuptools libyaml-dev libpython2.7-dev nmap unzip socat bridge-utils python-pip python-httplib2 libssl-dev libffi-dev \
 && rm -rf /var/lib/apt/lists/*


RUN mkdir -p /var/lib/iotronic/plugins \
 && mkdir -p /var/lib/iotronic/drivers/ \
 && mkdir -p /var/log/iotronic/ \
 && touch /var/log/iotronic/s4t-iotronic.log \
 && mkdir -p /usr/src/@mdslab/iotronic

RUN npm install -g --unsafe @mdslab/wstun

ENV NODE_PATH=/usr/local/lib/node_modules
ENV IOTRONIC_HOME=/var/lib/iotronic
WORKDIR /usr/src/@mdslab/iotronic

COPY bin /usr/src/@mdslab/iotronic/bin
COPY lib /usr/src/@mdslab/iotronic/lib
COPY utils /usr/src/@mdslab/iotronic/utils
COPY index.js /usr/src/@mdslab/iotronic/index.js
COPY package.json /usr/src/@mdslab/iotronic/package.json

COPY postinst_docker /usr/src/@mdslab/iotronic/scripts/postinst

RUN npm i
RUN npm rebuild
EXPOSE 8888
EXPOSE 8080
VOLUME /var/lib/iotronic

COPY settings.json /var/lib/iotronic/settings.json
CMD ["node", "bin/server"]