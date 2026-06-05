<!-- Slide number: 1 -->
# Advanced Docker
Advanced Techniques. Distributed Applications. Clusters

![](PicturePlaceholder4.jpg)
SoftUni Team
Technical Trainers
Software University
http://softuni.bg

### Notes:

<!-- Slide number: 2 -->
# Table of Contents
Docker Machine
Advanced techniques
Volumes
Networking
Distributed Applications
Linking Methods
Docker Compose
Docker Hosts in Cluster
Components and Principles
Docker Swarm
2

### Notes:

<!-- Slide number: 3 -->
# Resources
https://goo.gl/B73qXW
3

<!-- Slide number: 4 -->
# Proposed Environment

VM1
VM2
…
…
…
…
C1
C2
C1
C2
C1
C2
C1
C2
…
Docker
Docker
Docker
CentOS
CentOS
CentOS

Docker
VirtualBox

Host OS
(Win, Linux, Mac)
Host OS
(Win, Linux, Mac)
Module #2
Modules #2 and #3
4

<!-- Slide number: 5 -->

![](Picture9.jpg)
Dev
Ops
Quick Recap
DOB Module 2

### Notes:

<!-- Slide number: 6 -->
# Table of Contents
Containerization
Introduction to Docker
Docker in Action
Create Our Own Images
6

### Notes:

<!-- Slide number: 7 -->
# Docker Platform (at least part of it)

![](Picture15.jpg)
Docker Engine

![](Picture17.jpg)

![](Picture13.jpg)

![](Picture19.jpg)
Docker Machine
Docker Compose
Docker Swarm
7

<!-- Slide number: 8 -->

![](Picture9.jpg)
Dev
Ops
Docker Machine
Portable and Easy to Use Solution

### Notes:

<!-- Slide number: 9 -->
# Docker Machine*
Tool for provisioning and managing Dockerized hosts
Dockerized hosts can be local or remote VMs
Supports VirtualBox, VMware products, AWS, and etc.

![](Picture7.jpg)
* https://docs.docker.com/machine/overview/
9

<!-- Slide number: 10 -->
# docker-machine create
Purpose
Create a machine
Syntax

Example
docker-machine create [OPTIONS] [arg...]
# create dev machine with default virtualbox driver
docker-machine create dev
10

<!-- Slide number: 11 -->
# docker-machine create (2)
Example
# create dev machine with vmwarevsphere driver
# environment variables could be used i.e. $VSPHERE_NETWORK
docker-machine create --driver vmwarevsphere \
   --vmwarevsphere-username=<username> \
   --vmwarevsphere-password=<password> \
   --vmwarevsphere-vcenter=<ip-address> \
   --vmwarevsphere-network=<network-name>\
   --vmwarevsphere-datastore=<ds-name> \
# applicable only to vCenter
#  --vmwarevsphere-datacenter=<dc-name> \
#  --vmwarevsphere-hostsystem=<cluster-name> \
   dev
11

<!-- Slide number: 12 -->
# docker-machine env
Purpose
Display the commands to setup the environment
Syntax

Example
docker-machine env [OPTIONS] [arg...]
# display the environment setup for the dev machine
docker-machine env dev
# display and unset the environment setup
docker-machine env -u
12

<!-- Slide number: 13 -->
# docker-machine ls
Purpose
List Docker machines
Syntax

Example
docker-machine ls [OPTIONS] [arg...]
# list hosts with timeout bigger than the default 10s
docker-machine ls -t 15
# list hosts with filter
docker-machine ls --filter name=dev [--filter key=value]
13

<!-- Slide number: 14 -->
# docker-machine status
Purpose
Get the status of a machine
Syntax

Example
docker-machine status [arg...]
# get the status of the default machine
docker-machine status
# get the status of the dev machine
docker-machine status dev
14

<!-- Slide number: 15 -->
# docker-machine ssh
Purpose
Log into or run a command on a machine with SSH
Syntax

Example
docker-machine ssh [arg...]
# log into a running machine named dev
docker-machine ssh dev
# execute a command in the running dev machine
docker-machine ssh dev "mkdir -p /test/html"
15

<!-- Slide number: 16 -->
# docker-machine start
Purpose
Start a machine
Syntax

Example
docker-machine start [arg...]
# start dev machine
docker-machine start dev
# start dev1 and dev2 machines
docker-machine start dev1 dev2
16

<!-- Slide number: 17 -->
# docker-machine stop
Purpose
Stop a machine
Syntax

Example
docker-machine stop [arg...]
# stop dev machine
docker-machine stop dev
# stop dev1 and dev2 machines
docker-machine stop dev1 dev2
17

<!-- Slide number: 18 -->
# docker-machine rm
Purpose
Remove a machine
Syntax

Example
docker-machine rm [OPTIONS] [arg...]
# removes the default instance
docker-machine rm
# forcefully removes the machine with name dev-machine
docker-machine rm --force dev-machine
18

<!-- Slide number: 19 -->

![](Picture9.jpg)
Dev
Ops
Communication
Networks: Overview and Usage

### Notes:

<!-- Slide number: 20 -->
# Components
Three components
CNM
Libnetwork
Drivers
CNM
Libnetwork
Drivers
(Specifications)
(Networking logic, API, …)
(Bridge, Overlay, …)
20

<!-- Slide number: 21 -->
# Overview

CON-1
CON-2

docker host
eth0: 172.15.0.2
eth0: 10.0.0.2
veth
veth
docker0
my-bridge

eth0: 192.168.1.2
21

<!-- Slide number: 22 -->
# network ls
Purpose
List networks
Syntax

Example
docker network ls [options]
# list IDs of all networks
docker network ls -q
# list all networks that satisfy the filter
docker network ls -f driver=bridge
22

<!-- Slide number: 23 -->
# network inspect
Purpose
Display detailed information on one or more networks
Syntax

Example
docker network inspect [options] network [network]
# show network details
docker network inspect dob-network
23

<!-- Slide number: 24 -->
# network connect
Purpose
Connect a container to a network
Syntax

Example
docker network connect [options] network container
# connect container to a network
docker network connect \
   dob-bridge \
   cont-001
24

<!-- Slide number: 25 -->
# network disconnect
Purpose
Disconnect a container from a network
Syntax

Example
docker network disconnect [options] network container
# disconnect container from a network
docker network disconnect –f \
   dob-bridge \
   cont-001
25

<!-- Slide number: 26 -->
# network create
Purpose
Create a network
Syntax

Example
docker network create [options] network
# create new bridge network
docker network create -d bridge \
   --subnet 10.0.0.1/24 \
   dob-bridge
26

<!-- Slide number: 27 -->
# network rm
Purpose
Remove one or more networks
Syntax

Example
docker network rm network [network]
# remove networks net-1 and net-2
docker network rm net-1 net-2
27

<!-- Slide number: 28 -->
# network prune
Purpose
Remove all unused networks
Syntax

Example
docker network prune [options]
# remove all unused networks without asking
docker network prune --force
# remove all network satisfying a filter
docker network prune --filter driver=bridge
28

<!-- Slide number: 29 -->

![](Picture9.jpg)
Dev
Ops
Persistent Data
Volumes: Overview and Usage

### Notes:

<!-- Slide number: 30 -->
# Volume Overview
Allow for external data in containers
Two types
Data volumes
Data volume containers
Created upfront, during run or build phase (VOLUME command)
Data volumes can be shared
Data volumes persist
Data volumes are not deleted automatically
30

<!-- Slide number: 31 -->
# volume ls
Purpose
List volumes
Syntax

Example
docker volume ls [options]
# list IDs of all volumes
docker volume ls -q
# list all volumes satisfying a filter
docker volume ls --filter driver=local
31

<!-- Slide number: 32 -->
# volume inspect
Purpose
Display detailed information on one or more volumes
Syntax

Example
docker volume inspect [options] volume [volume]
# show details about volume test-vol
docker volume inspect test-vol
32

<!-- Slide number: 33 -->
# volume create
Purpose
Create a volume
Syntax

Example
docker volume create [options] [volume]
# create local volume test-vol
docker volume create test-vol
# create local volume lv-1 with label
docker volume create lv-1 --label mode=dev
33

<!-- Slide number: 34 -->
# volume rm
Purpose
Remove one or more volumes
Syntax

Example
docker volume rm [options] volume [volume]
# remove volume test-vol
docker volume rm test-vol
34

<!-- Slide number: 35 -->
# network prune
Purpose
Remove all unused volumes
Syntax

Example
docker volume prune [options]
# remove all unused volumes without asking
docker volume prune -f
# remove all volumes satisfying a filter
docker volume prune --filter driver=local
35

<!-- Slide number: 36 -->

![](Picture4.jpg)
Dev
Ops
Practice: Installation. Networks. Volumes
Live Demonstration in Class

### Notes:

<!-- Slide number: 37 -->

![](Picture4.jpg)
Dev
Ops
Distributed Applications
Overview and Implementation

### Notes:

<!-- Slide number: 38 -->
# Distributed Applications

User Interface
Web application

Container
User Interface

Business Logic
Business Logic

Containerized application
Container
Database Layer

Database Layer
Server
Container
38

<!-- Slide number: 39 -->
# Link Containers
By name alias
Container
#1
Container
"c-mysql"
Container
"c-php"
dob-mysql

Shared Network (docker0)
docker container run -d ... -p 8080:80 --link c-mysql:dob-mysql ...
Actual linkage / alias
39

<!-- Slide number: 40 -->
# Isolated Network
Work in an isolated environment
dob-network
Container
#1
Container
dob-mysql
Container
dob-php

Shared Network (docker0)

docker container run -d ... -p 8080:80 --net dob-network ...
Attached to the isolated network
40

<!-- Slide number: 41 -->

![](Picture4.jpg)
Dev
Ops
Docker Compose

### Notes:

<!-- Slide number: 42 -->
# Docker Compose
Define and run multi-container Docker applications
Multiple isolated environments on a single host
Preserve volume data when containers are created
Only recreate containers that have changes
Supports variables
Use cases
Development environments
Automated testing
Single host deployments
42

<!-- Slide number: 43 -->
# Configuration

version: "2.1"
services:
    com-php:
        build: ./php/
        ports:
            - 8080:80
        volumes:
            - "${PROJECT_ROOT}:/var/www/html:ro"
        networks:
            - com-network
networks:
    com-network:
Version (up to 3.7)
PROJECT_ROOT=/home/docker/M3-3

DB_ROOT_PASSWORD=12345

.env
Services Definition

Networks Definition
docker-compose.yml
43

<!-- Slide number: 44 -->
# docker-compose build
Purpose
Build or rebuild services
Syntax

Example
… build [options] [--build-arg key=val...] [SERVICE...]
# rebuild all services
docker-compose build
# rebuild particular service with no-cache
docker-compose build --no-chache my-php
44

<!-- Slide number: 45 -->
# docker-compose up
Purpose
Build, (re)create, start, and attach to containers for a service
Syntax

Example
… up [options] [--scale SERVICE=NUM...] [SERVICE...]
# start all containers and aggregate the output
docker-compose up
# start all containers in a daemon mode
docker-compose up -d
45

<!-- Slide number: 46 -->
# docker-compose down
Purpose
Stop containers and remove everything created by up
Syntax

Example
docker-compose down [options]
# remove everything including all images
docker-compose down --rmi all
# remove declared named volumes and anonymous volumes
docker-compose down --volumes
46

<!-- Slide number: 47 -->
# docker-compose ps
Purpose
List containers
Syntax

Example
docker-compose ps [options] [SERVICE...]
# list running containers
docker-compose ps
# display ID for a particular container
docker-compose ps -q com-php
47

<!-- Slide number: 48 -->
# docker-compose logs
Purpose
View output from containers
Syntax

Example
docker-compose logs [options] [SERVICE...]
# view logs for all containers
docker-compose logs
# follow the log for com-php service
docker-compose logs -f com-php
48

<!-- Slide number: 49 -->
# docker-compose start
Purpose
Start existing containers
Syntax

Example
docker-compose start [SERVICE...]
# start all containers
docker-compose start
# start particular container / service
docker-compose start com-php
49

<!-- Slide number: 50 -->
# docker-compose stop
Purpose
Stop running containers without removing them
Syntax

Example
docker-compose stop [options] [SERVICE...]
# stop all containers
docker-compose stop
# stop particular container / service with timeout
docker-compose stop -t 20 com-php
50

<!-- Slide number: 51 -->
# docker-compose rm
Purpose
Remove stopped service containers
Syntax

Example
docker-compose rm [options] [SERVICE...]
# remove all stopped containers
docker-compose rm
# stop all containers and remove them without asking
docker-compose rm -s -f
51

<!-- Slide number: 52 -->

![](Picture4.jpg)
Dev
Ops
Practice: Distributed Apps. Compose
Live Demonstration in Class

### Notes:

<!-- Slide number: 53 -->

![](Picture4.jpg)
Dev
Ops
Docker Swarm
What is it? How it works?

### Notes:

<!-- Slide number: 54 -->
# What is it?
Docker engines joined in a cluster
Commands are executed by the swarm manager
There could be more than one manager, but only one is Leader
Nodes that are not managers are called workers
Both managers and workers are running containers
There are different strategies to run containers
Nodes can be physical or virtual
54

<!-- Slide number: 55 -->
# The Big Picture*

![](Picture4.jpg)
* https://docs.docker.com/engine/swarm/how-swarm-mode-works/nodes/
55

<!-- Slide number: 56 -->
# Three Simple Actions
Initialize cluster
docker swarm init

Join to a cluster
docker swarm join

Leave a cluster
docker swarm leave
56

<!-- Slide number: 57 -->
# Deployment Options
Options
Cloud (Azure, AWS, …)
On-premise - VM, Bare-metal

Deployment Strategy (on-premise)
docker-machine
Vagrant

Today’s practice

Additional practice – homework 
57

<!-- Slide number: 58 -->

![](Picture4.jpg)
Dev
Ops
Stacks and Compose
Deployment Automation

### Notes:

<!-- Slide number: 59 -->
# Tasks, Services, and Stacks
Tasks are units of work distributed to nodes
Service is an application deployed on swarm
In fact service is the definition of the tasks to execute
Replicated and global services distribution model
Stacks are groups of interrelated services
Stacks are deployed with docker-compose
Stack
Service 1
Service 2
Task 1-1
Task1-2
Task 2-1
59

<!-- Slide number: 60 -->
# Containers, Tasks, and Services*

![](Picture11.jpg)
* https://docs.docker.com/engine/swarm/how-swarm-mode-works/services/
60

<!-- Slide number: 61 -->
# Replicated and Global Services*

![](Picture6.jpg)
* https://docs.docker.com/engine/swarm/how-swarm-mode-works/services/
61

<!-- Slide number: 62 -->

![](Picture4.jpg)
Dev
Ops
Practice: Swarm, Services and Stacks
Live Demonstration in Class

### Notes:

<!-- Slide number: 63 -->
# Summary
Networking - inspect, tune, add, and remove
Volumes - types, inspect and manage
Distributed applications and Docker Compose
Docker Swarm
How it works
Deployment options
Stacks and Compose

…
…
…

![](Picture12.jpg)
63

### Notes:

<!-- Slide number: 64 -->
# Resources
Docker Machine
	https://docs.docker.com/machine/
Docker Compose
	https://docs.docker.com/compose/
Docker Swarm
	https://docs.docker.com/engine/swarm/

…
…
…

![](Picture12.jpg)
64

### Notes:

<!-- Slide number: 65 -->

### Notes:

<!-- Slide number: 66 -->
# СофтУни диамантени партньори

![](Picture3.jpg)

![Ð ÐµÐ·ÑÐ»ÑÐ°Ñ Ñ Ð¸Ð·Ð¾Ð±ÑÐ°Ð¶ÐµÐ½Ð¸Ðµ Ð·Ð° indeavr](Picture2.jpg)

![Ð ÐµÐ·ÑÐ»ÑÐ°Ñ Ñ Ð¸Ð·Ð¾Ð±ÑÐ°Ð¶ÐµÐ½Ð¸Ðµ Ð·Ð° software group](Picture10.jpg)

![Ð¡Ð²ÑÑÐ·Ð°Ð½Ð¾ Ð¸Ð·Ð¾Ð±ÑÐ°Ð¶ÐµÐ½Ð¸Ðµ](Picture14.jpg)

![Ð ÐµÐ·ÑÐ»ÑÐ°Ñ Ñ Ð¸Ð·Ð¾Ð±ÑÐ°Ð¶ÐµÐ½Ð¸Ðµ Ð·Ð° superhosting png](Picture22.jpg)

![Ð ÐµÐ·ÑÐ»ÑÐ°Ñ Ñ Ð¸Ð·Ð¾Ð±ÑÐ°Ð¶ÐµÐ½Ð¸Ðµ Ð·Ð° netpeak](Picture16.jpg)

### Notes:

<!-- Slide number: 67 -->
# СофтУни диамантени партньори

![](Picture9.jpg)

![](Picture5.jpg)

![](Picture12.jpg)

![](Picture3.jpg)

![](Picture14.jpg)

![](Picture7.jpg)

### Notes:

<!-- Slide number: 68 -->
# Trainings @ Software University (SoftUni)
Software University – High-Quality Education, Profession and Job for Software Developers
softuni.bg
Software University Foundation
http://softuni.foundation/
Software University @ Facebook
facebook.com/SoftwareUniversity
Software University Forums
forum.softuni.bg

![](Picture17.jpg)

![](Picture14.jpg)

![](Picture9.jpg)

![](Picture4.jpg)

![](Picture12.jpg)

### Notes: