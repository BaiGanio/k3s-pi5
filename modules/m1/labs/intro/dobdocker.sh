#!/bin/bash
# Provisioner runs as root via Vagrant's shell provisioner — no sudo needed.
set -e

echo "* Add host entry ..."
echo "192.168.56.100 dob-docker" >> /etc/hosts

echo "* Install prerequisites ..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg

echo "* Add Docker's official GPG key ..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "* Add Docker repository (arm64) ..."
echo \
  "deb [arch=arm64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

echo "* Install Docker Engine ..."
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "* Enable and start Docker ..."
systemctl enable docker
systemctl start docker

# Ubuntu's ufw is inactive on the bento box, so the forwarded port 8080 needs no
# firewall rule out of the box.

echo "* Add vagrant user to docker group ..."
usermod -aG docker vagrant
