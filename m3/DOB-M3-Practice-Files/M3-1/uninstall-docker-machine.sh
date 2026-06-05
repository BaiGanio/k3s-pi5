#!/bin/bash

docker-machine rm -f -y $(docker-machine ls -q)
sudo rm $(which docker-machine)
