<!-- Slide number: 1 -->
# Ansible
Introduction and Basic Techniques

![](PicturePlaceholder4.jpg)
SoftUni Team
Technical Trainers
Software University
http://softuni.bg

### Notes:

<!-- Slide number: 2 -->
# Table of Contents
Introduction to Ansible
Other solutions
Ansible architecture
Working with Ansible
Work with Inventories and Configurations
Using Modules
Advanced Ansible
Playbooks and Roles
2

### Notes:

<!-- Slide number: 3 -->
# Resources
https://goo.gl/B73qXW
3

<!-- Slide number: 4 -->
# Proposed Environment

…
VMn
VM2
VM1
Ansible
…
Win
CentOS
CentOS

VirtualBox
Vagrant
Host OS
(Linux)
Module 4: VirtualBox + Vagrant + Ansible (on the host)
4

<!-- Slide number: 5 -->

![](Picture9.jpg)
Dev
Ops
Quick Recap
DOB Module 3

### Notes:

<!-- Slide number: 6 -->
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
6

### Notes:

<!-- Slide number: 7 -->

![](Picture9.jpg)
Dev
Ops
Available Solutions
For Provisioning, Configuration, and etc.

### Notes:

<!-- Slide number: 8 -->
# The Need
Manage efficiently large-scale infrastructures
Replicated environments
Avoid the so called Snowflake servers
Version control for the environment
Quick provisioning
Quick recovery
8

<!-- Slide number: 9 -->
# Solutions (1)
Chef
Recipes are written in Ruby DSL
Master-agent model, pull-based approach
Supports Windows both as server and node

Puppet
Recipes are written in Ruby DSL and Embedded Ruby
Master-agent model
Supports only agents on Windows
9

<!-- Slide number: 10 -->
# Solutions (2)
Salt by SaltStack
Recipes are written in YAML
Two modes – with or without agents (Salt Minions)
Supports Windows both as host and remote system

Ansible by Ansible Inc (RedHat)
Recipes are written in YAML
Agentless
Windows is only supported as remote system
10

<!-- Slide number: 11 -->

![](Picture9.jpg)
Dev
Ops
Introduction to Ansible
Architecture. Components. Installation

### Notes:

<!-- Slide number: 12 -->
# What is Ansible*?

“… An ansible is a category of fictional device or technology capable of instantaneous or faster-than-light communication…”
* https://en.wikipedia.org/wiki/Ansible
12

<!-- Slide number: 13 -->
# What is/does Ansible?
Change Management
Define and track system state. Idempotence
Provisioning
Transition form a State A to a State B
Automation
Automatic execution of tasks on a system
Orchestration
Coordination of automation between systems
13

<!-- Slide number: 14 -->
# Key Characteristics
No extra components, just the bare minimum
There are no agents, repositories, and etc.
Easy to learn and program
Uses YAML, structured, easy to read and write
Secure by design
Uses OpenSSH and WinRM, root and sudo
Open and extendable
Shell commands, Library (Ansible-Galaxy) with 450+ modules
14

<!-- Slide number: 15 -->
# Requirements
Ansible Control Server
Python 2.6 or 2.7 / 3.5+
Linux/Unix/Mac
Windows is not supported

Remote Server
Linux/Unix/Mac – Python 2.6+, SSH
Windows – Remote PowerShell
Current version
2.7.0
15

<!-- Slide number: 16 -->
# Architecture and Components
Set of plays
Inventory
Playbook
Modules
Static
or
Dynamic
Program unit of work

Play
Play

Configuration
Single set of tasks

Global and User settings

Building Packages
Python
SSH
S1
S2
S3
S4
S5
16

<!-- Slide number: 17 -->
# Availability
Compilation from source
Installation from the official repositories
Supports all major distributions
Usually additional repository have to be added
RedHat 6.x – EPEL / RedHat 7.x – Extras
SUSE Enterprise Linux 12.x/15.x – Package Hub Repository
Ubuntu – Ansible PPA (ppa:ansible/ansible)
Installation via pip (Python package manager)

17

<!-- Slide number: 18 -->

![](Picture4.jpg)
Dev
Ops
Practice: Installation. Environment Setup
Live Demonstration in Class

### Notes:

<!-- Slide number: 19 -->

![](Picture4.jpg)
Dev
Ops
Inventory
Manage Your Hosts

### Notes:

<!-- Slide number: 20 -->
# Inventory
Define and describe the environment
Reflect our interpretation of the environment

Can be stored anywhere on the system
Locally for a project, user, etc.

Can have more than one inventory file
We can chose at run-time or use configuration file
20

<!-- Slide number: 21 -->
# Inventory Features
Behavioral Parameters
Groups
Groups of Groups
Assign Variable
Scale out
Either Static or Dynamic

Two default groups – all and ungrouped
21

<!-- Slide number: 22 -->

# Sample Inventory File
web ansible_host=192.168.82.100
clnt ansible_host=192.168.82.102 ansible_user=vagrant ansible_ssh_pass=vagrant
[grp-servers]
web
[grp-stations]
clnt
[grp-all:children]
grp-servers
grp-stations
[grp-all:vars]
ansible_user=vagrant
ansible_ssh_pass=vagrant

Behavioral Parameters
Groups

Groups of Groups

Variables
22

<!-- Slide number: 23 -->
# Inventory Two Ways
The INI Way
The YAML Way
all:
  hosts:
    host.sulab.org:
  children:
    web:
      hosts:
        w1.sulab.org:
        w2.sulab.org:
    db:
      hosts:
        db1.sulab.org:
host.sulab.org

[web]
w1.sulab.org
w2.sulab.org

[db]
db1.sulab.org
23

<!-- Slide number: 24 -->
# Scale Out
Split the inventory file
On smaller more manageable pieces
Chose a criteria – location, environment, role
Store the files in the same directory – shared variables
Store the files in separate directories
Once split the files it is difficult to merge them
24

<!-- Slide number: 25 -->
# Variable Precedence and Files
Order of precedence
Group Variables (group_vars) All
Group Variables (group_vars) GroupName
Host Variables (host_vars) HostName
Variable Files

---
# file: host_vars/web01
username: user01
userdir: /home/user01
YAML file indication

Comment

Variables
25

<!-- Slide number: 26 -->

![](Picture4.jpg)
Dev
Ops
Configuration
Variables and Settings

### Notes:

<!-- Slide number: 27 -->
# Configuration Storage and Order
Configuration Files
$ANSIBLE_CONFIG
./ansible.cfg
~/.ansible.cfg
/etc/ansible/ansible.cfg

They are not merged, the first found is taken into account
Override by prefixing the name with $ANSIBLE_<setting>

Not created if built from source

27

<!-- Slide number: 28 -->

![](Picture4.jpg)
Dev
Ops
Modules

### Notes:

<!-- Slide number: 29 -->
# Modules
Modules do the actual work
They can be executed
Manually using the ansible command
In batches with ansible-playbook

They are known as task plugins or library plugins
Two major types – Core and Extras
Organized in categories – Command, Files, System, etc.
29

<!-- Slide number: 30 -->
# Modules Help
List all available modules

Get detailed information for a module

Show playbook snippet for a module
$ ansible-doc -l
$ ansible-doc service
$ ansible-doc -s service
30

<!-- Slide number: 31 -->

![](Picture4.jpg)
Dev
Ops
Practice: See It in Action
Live Demonstration in Class

### Notes:

<!-- Slide number: 32 -->

![](Picture4.jpg)
Dev
Ops
Plays and Playbooks
Fundamentals

### Notes:

<!-- Slide number: 33 -->
# Plays
Plays map hosts to tasks
Each play can have multiple tasks
Tasks call modules
Tasks run sequentially

33

<!-- Slide number: 34 -->
# Play Declaration
Global Play Declaration
- hosts: grp-webservers
  become: true

  tasks:
    - name: Copy new index.html
      copy: src=html/index.html dest=/var/www/html/
Task Declaration

Module
34

<!-- Slide number: 35 -->
# Playbooks
A playbook contain one or more plays
Stored in YAML files
Two ways of declaration – list and dictionary
Can be used to build entire application environment
35

<!-- Slide number: 36 -->
# Playbook File
---
- hosts: grp-webservers
  become: true
  tasks:
    - name: Install Apache HTTP Server
      yum: name=httpd state=present
    - name: Start Apache HTTP Server and Enable it
      service: name=httpd state=started enabled=true
- hosts: grp-databases
  become: true
  tasks:
    - name: Install MariaDB Server
      yum: name=mariadb,mariadb-server state=present
    - name: Start and enable MariaDB
      service: name=mariadb state=started enabled=true
Play One
Play Two
36

<!-- Slide number: 37 -->
# Playbook Two Ways
The List Way
The Dictionary Way
---
- hosts: web
  become: true
  tasks:
    - name: Install WEB
      yum:
        name: httpd
        state: present
    - name: Start WEB
      service:
        name: httpd
        state: started
---
- hosts: web
  become: true
  tasks:
    - name: Install WEB
      yum: name=httpd state=present
    - name: Start WEB
      service: name=httpd state=started
37

<!-- Slide number: 38 -->
# Playbooks Execution
Execute with default inventory

Execute with specified inventory

On host failure it is excluded from further tasks execution
Failed hosts are stored in a file
Retry execution only for failed hosts

$ ansible-playbook playbook_name.yml
$ ansible-playbook -i inventory playbook_name.yml
$ ansible-playbook book.yml --limit @/path/to/file
38

<!-- Slide number: 39 -->

![](Picture4.jpg)
Dev
Ops
Roles
Fundamentals

### Notes:

<!-- Slide number: 40 -->
# Roles
Allow easy sharing of content
Way of automatic loading of tasks, vars, and handlers
Described via YAML files in certain directory structure
Search for roles:
A roles/ directory relative to the playbook file
By default, in /etc/ansible/roles

40

<!-- Slide number: 41 -->
# Roles Directory Structure
tasks – main list of tasks to be executed
handlers – handlers, that may be executed
defaults – default variables for the role
vars – other variables for the role
files – files, that can be deployed
templates – templates, that can be deployed
meta – meta data (parameters and dependencies)
    * main.yml is expected in each folder
  ** Other task specific files can be included, like redhat.yml
*** At least one of the folders must be included
41

<!-- Slide number: 42 -->
# Role Example
Definition (main.yml)

Usage (playbook.yml)

---
  - name: Firewall | Open HTTP port
    firewalld:
      service: http
      permanent: true
      state: enabled
      immediate: true
.
├── ansible.cfg
├── hosts
├── playbook.yml
└── roles
    ├── firewall-8080
    │   └── tasks
    │       └── main.yml
    └── firewall-http
        └── tasks
            └── main.yml
---
- hosts: web
  roles:
    - firewall-8080
42

<!-- Slide number: 43 -->
# Ansible Galaxy
Free site for finding, downloading, and sharing roles
We can develop and share our own roles. GitHub account is needed
Galaxy can be run on-premise as well
Command line tool ansible-galaxy is included

Default storage is configured via roles_path variable
Install a role to a custom path

Install roles included in requirements file

$ ansible-galaxy install username.role
$ ansible-galaxy install --roles-path . username.role
$ ansible-galaxy install -r requirements.yml
43

<!-- Slide number: 44 -->

![](Picture4.jpg)
Dev
Ops
Additional Techiniques

### Notes:

<!-- Slide number: 45 -->
# Include Files
Easier playbook management – smaller playbooks
Reuse other playbooks – common/repeatable plays
Can load external variable

tasks:
  - include_vars: ext_var_file.yml
  - include: web-server.yml
  - include: db-server.yml
45

<!-- Slide number: 46 -->
# Register Task
Link tasks – data from one task is passed to another
Can be used for error catching

tasks:
  - shell: /usr/bin/whoami
    register: username
  - file: path=/path/to/folder/readme.txt
          owner={{ username }}
46

<!-- Slide number: 47 -->
# Debug Module
Display output during execution
Easier problem identification
Two ways for execution
tasks:
  - debug: msg="Host: {{ inventory_hostname }}"

  - shell: /usr/bin/uptime
    register: result
  - debug:
      var: result
      verbosity: 2
47

<!-- Slide number: 48 -->
# Playbook Handlers
Runs when notified
It is notified only when state=changed
Runs last

tasks:
  - copy: src=files/httpd.conf dest=/etc/httpd/conf/
    notify:
      - Web Server Restart

handlers:
  - name: Web Server Restart
    service: name=apache2 state=restarted
48

<!-- Slide number: 49 -->
# Conditional Clause - When
Evaluate should a task execute

Use APT module if Debian or use YUM if RedHat
tasks:
  - apt: name=apache2 state=present
    when: ansible_os_family == "Debian"

  - yum: name=httpd state=present
    when: ansible_os_family == "RedHat"
49

<!-- Slide number: 50 -->
# Conditional Clause - Result
Track execution status of the previous task
Status options – success, failed, skipped
Should add ignore_errors or the playbook will fail

tasks:
  - command: /bin/false
    register: result
    ignore_errors: True

  - command: /bin/some_command
    when: result|failed
50

<!-- Slide number: 51 -->
# Templates
Jinja2 Engine
Create and copy dynamic files

templates/index.j2
- name: Deploy index.j2 on RedHat
  vars:
    v_host_type: RedHat
  template: src=templates/index.j2
            dest=/var/www/html/index.html
  when: ansible_os_family == "RedHat"
<h2>Hello from Ansible on {{ v_host_type }}!</h2>
51

<!-- Slide number: 52 -->

![](Picture4.jpg)
Dev
Ops
Practice: Playbooks in Action
Live Demonstration in Class

### Notes:

<!-- Slide number: 53 -->
# Summary
Ansible is a powerful solution for configuration and provisioning
It can be installed from source, repository, or PIP
It is driven by a set of configuration files
One or more inventories can be used simultaneously
Actual executable parts are called modules
Modules can be combined in plays
Plays can be combined in playbooks
Plays can go one step further with Jinja2 templates

…
…
…

![](Picture12.jpg)
53

### Notes:

<!-- Slide number: 54 -->
# Resources
Ansible Documentation
	http://docs.ansible.com/
Ansible Modules
	http://docs.ansible.com/ansible/latest/list_of_all_modules.html
Ansible Galaxy
	https://galaxy.ansible.com/
Ansible Galaxy Documentation
	https://galaxy.ansible.com/docs/
Ansible Examples Repository
	https://github.com/ansible/ansible-examples
Short Ansible Tutorial
	https://www.codereviewvideos.com/course/ansible-tutorial

…
…
…

![](Picture12.jpg)
54

### Notes:

<!-- Slide number: 55 -->

### Notes:

<!-- Slide number: 56 -->
# СофтУни диамантени партньори

![](Picture3.jpg)

![Ð ÐµÐ·ÑÐ»ÑÐ°Ñ Ñ Ð¸Ð·Ð¾Ð±ÑÐ°Ð¶ÐµÐ½Ð¸Ðµ Ð·Ð° indeavr](Picture2.jpg)

![Ð ÐµÐ·ÑÐ»ÑÐ°Ñ Ñ Ð¸Ð·Ð¾Ð±ÑÐ°Ð¶ÐµÐ½Ð¸Ðµ Ð·Ð° software group](Picture10.jpg)

![Ð¡Ð²ÑÑÐ·Ð°Ð½Ð¾ Ð¸Ð·Ð¾Ð±ÑÐ°Ð¶ÐµÐ½Ð¸Ðµ](Picture14.jpg)

![Ð ÐµÐ·ÑÐ»ÑÐ°Ñ Ñ Ð¸Ð·Ð¾Ð±ÑÐ°Ð¶ÐµÐ½Ð¸Ðµ Ð·Ð° superhosting png](Picture22.jpg)

![Ð ÐµÐ·ÑÐ»ÑÐ°Ñ Ñ Ð¸Ð·Ð¾Ð±ÑÐ°Ð¶ÐµÐ½Ð¸Ðµ Ð·Ð° netpeak](Picture16.jpg)

### Notes:

<!-- Slide number: 57 -->
# СофтУни диамантени партньори

![](Picture9.jpg)

![](Picture5.jpg)

![](Picture12.jpg)

![](Picture3.jpg)

![](Picture14.jpg)

![](Picture7.jpg)

### Notes:

<!-- Slide number: 58 -->
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