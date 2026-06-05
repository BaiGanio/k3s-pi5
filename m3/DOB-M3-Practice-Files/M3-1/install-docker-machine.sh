#!/bin/bash

curl -L https://github.com/docker/machine/releases/download/v0.15.0/docker-machine-`uname -s`-`uname -m` >/tmp/docker-machine && \
    chmod +x /tmp/docker-machine && \
    sudo cp /tmp/docker-machine /usr/local/bin/docker-machine
