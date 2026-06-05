#!/bin/bash

curl -L https://download.docker.com/linux/static/edge/x86_64/docker-18.06.1-ce.tgz > /tmp/docker-18.06.1-ce.tgz && \
     tar xzvf /tmp/docker-18.06.1-ce.tgz && \
     sudo mv docker/docker /usr/local/bin/docker && \
     rm -rf docker/ && \
     rm /tmp/docker-18.06.1-ce.tgz
