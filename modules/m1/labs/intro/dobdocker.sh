#!/bin/bash

echo "* Add hosts ..."
echo "192.168.81.100 dob-docker.sulab.local dob-docker" >> /etc/hosts

echo "* Install Prerequisites ..."
sudo yum update -y
sudo yum install -y yum-utils device-mapper-persistent-data lvm2

echo "* Add Docker repository ..."
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

echo "* Install Docker ..."
sudo yum makecache fast
sudo yum install -y docker-ce

echo "* Start Docker ..."
sudo systemctl enable docker
sudo systemctl start docker

echo "* Firewall - open port 8080 ..."
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload

echo "* Add vagrant user to docker group ..."
sudo usermod -aG docker $USER