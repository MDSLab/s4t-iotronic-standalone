FROM ubuntu:xenial

# This image contains the whole iostronic-standalone component without the mysql server.
# 
# You may configure it via passing your own /lib/settings.json this way:
# docker run ... -v /path/to/your/settings.json:/etc/iotronic-standalone/settings.json ...
# ... or you can pass configuration clauses as environment variables which will be placed in /lib/settings.example.json this way:
# docker run ... -e S4T_IOTRONIC_SETTINGS_CONFIG__SERVER__DB__HOST=mysql ...
# 
# See docker/fill_settings.py for reference.

# Apache License
#                            Version 2.0, January 2004
#                         http://www.apache.org/licenses/
# Copyright (c) 2016 Kostya Esmukov <kostya@esmukov.ru>



ENV DEBIAN_FRONTEND noninteractive
ENV LC_ALL C.UTF-8

ENV HOME /root
ENV NODE_PATH /usr/local/lib/node_modules

ENV S4T_IOTRONIC_PATH /opt/stack4things/iotronic-standalone
ENV S4T_IOTRONIC_SETTINGS_PATH /etc/iotronic-standalone

ENV S4T_IOTRONIC_SETTINGS_CONFIG__SERVER__DB__HOST mysql
ENV S4T_IOTRONIC_SETTINGS_CONFIG__SERVER__DB__USER root
ENV S4T_IOTRONIC_SETTINGS_CONFIG__SERVER__DB__PASSWORD root
ENV S4T_IOTRONIC_SETTINGS_CONFIG__SERVER__DB__DB_NAME s4t-myarduino
ENV S4T_IOTRONIC_SETTINGS_CONFIG__WAMP__REALM s4t


RUN apt-get update -y \
    && apt-get install -y --no-install-recommends nodejs nodejs-legacy npm git python-dev libyaml-dev libpython2.7-dev mysql-client nmap apache2 unzip socat bridge-utils python-pip python-setuptools \
    net-tools supervisor \
    && apt-get clean -y

RUN pip install httplib2

RUN npm install -g node-reverse-wstunnel requestify mysql nconf ip express uuid autobahn log4js q


# Crossbar.io router

RUN apt-key adv --keyserver hkps.pool.sks-keyservers.net --recv D58C6920
RUN echo 'deb http://package.crossbar.io/ubuntu xenial main' > /etc/apt/sources.list.d/crossbar.list
RUN apt-get update -y \
	&& apt-get install crossbar \
	&& apt-get clean -y


# Install IoTronic

RUN mkdir -p "$S4T_IOTRONIC_PATH" && mkdir -p "$S4T_IOTRONIC_SETTINGS_PATH"

WORKDIR "$S4T_IOTRONIC_PATH"

ADD . .


# Configure Crossbar.io router

RUN mkdir -p /etc/crossbar \
	&& cp -f "$S4T_IOTRONIC_PATH"/etc/crossbar/config.example.json /etc/crossbar/config.json

RUN /opt/crossbar/bin/crossbar check --cbdir /etc/crossbar

EXPOSE 8888/tcp 8181/tcp 8080/tcp

CMD "$S4T_IOTRONIC_PATH"/docker/run.sh
