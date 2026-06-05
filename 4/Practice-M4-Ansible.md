## Практика: DOB Модул 4 – Ansible

За целите на упражненията в тази практика приемаме, че работим върху физическа машина с инсталирана **Linux** дистрибуция, за предпочитане **CentOS7,** с инсталирани **VirtualBox** и **Vagrant**. Приемаме също, че всички разполагаме със съпътстващия архивен файл и сме го разархивирали в папка **DOB/M4** в папката на нашия потребител.
Инсталация на Ansible и подготовка на средата
Ansible
SUSE/openSUSE
sudo zypper install ansible
RedHat/CentOS
[sudo yum install epel-release]
sudo yum install ansible
Debian/Ubuntu
sudo apt-add-repository ppa:ansible/ansible
sudo apt-get update
sudo apt-get install ansible
Работна среда
Извършваме последователно следните действия

> - •	Работим в папка
> - M4/M4-1
> - •	Създаваме файл
> - Vagrantfile
> - :

# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure(2) do |config|

config.ssh.insert_key = false

config.vm.define "web" do |web|
web.vm.box="shekeriev/centos-7-64-minimal"
web.vm.hostname = "web.sulab.local"
web.vm.network "private_network", ip: "192.168.98.100"
web.vm.network "forwarded_port", guest: 80, host: 8080
end

config.vm.define "db" do |db|
db.vm.box = "shekeriev/centos-7-64-minimal"
db.vm.hostname = "db.sulab.local"
db.vm.network "private_network", ip: "192.168.98.101"
end

config.vm.define "clnt" do |clnt|
clnt.vm.box = "shekeriev/centos-7-64-minimal"
clnt.vm.hostname = "clnt.sulab.local"
clnt.vm.network "private_network", ip: "192.168.98.102"
end

end

> - •	Изпълняваме
> - vagrant up

Първа част
Добавяме хостовете в глобалния инвентарен файл:

> - •	su -c 'echo '[test-srv]' >> /etc/ansible/hosts'
•	su -c 'echo '192.168.98.100' >> /etc/ansible/hosts'
•	su -c 'echo '192.168.98.101' >> /etc/ansible/hosts'
•	su -c 'echo '[test-clnt]' >> /etc/ansible/hosts'
•	su -c 'echo '192.168.98.102' >> /etc/ansible/hosts'

Или го отваряме за редакция като **root**.
Изпълняваме последователно следните команди:

> - •	ansible 192.168.98.100 -a "hostname"
•	ansible 192.168.98.100 -a "hostname" -u vagrant
•	ansible 192.168.98.100 -a "hostname" -u vagrant -k

Паролата за потребителя **vagrant** е **vagrant
**Изпълняваме последователно следните команди:

> - •	ansible test-srv -a "hostname" -u vagrant -k
•	ansible test-srv -a "hostname" -u vagrant -k
•	ansible all -a "hostname" -u vagrant -k

Ако не можем да осъществим връзка, бихме могли да добавим съответните записи в **~/.ssh/known_hosts** като влезем последователно на всеки хост, изпълним **ssh-keyscan** или **ssh-copy-id**:

> - •	ssh vagrant@192.168.98.101
•	ssh vagrant@192.168.98.102

Сега можем да изпълним:

> - •	ansible all -a "hostname" -u vagrant -k
•	ansible all -a "hostname" -u vagrant -k -f 1

Последната команда ограничава броя на едновременно изпълняваните процеси.
Изпълняваме последователно следните команди:

> - •	ansible all -m command -a "df -h" -u vagrant -k
•	ansible all -m shell -a "df -h" -u vagrant -k
•	ansible all -m shell -a "echo $HOSTNAME" -u vagrant -k
•	ansible all -m shell -a 'echo $HOSTNAME' -u vagrant -k

Обърнете внимание на разликата в резултата от изпълнението на последните две команди.
Командите, изпълнени през **command** се изпълняват „директно“, за разлика от тези, изпълнени през **shell**.
Модулът **command** може да бъде пропуснат:

> - •	ansible all -a "df -h" -u vagrant -k
•	ansible all -a "free -m" -u vagrant -k

Изпълняваме последователно следните действия:

> - •	Създаваме файл
> - local_script.sh
> - със следното съдържание:

#!/bin/bash

echo 'My hostname is '$HOSTNAME

> - •	ansible test-srv -m script -a "local_script.sh" -u vagrant -k

Втора част
Инвентарни файлове (1)
Създаване на инвентарен файл

> - •	Работим в папка
> - M4/M4-2/1
> - •	Създаваме празен файл
> - inventory
> - •	Добавяме:

> web ansible_host=192.168.98.100 ansible_user=vagrant ansible_ssh_pass=vagrant

> - •	Записваме и излизаме
•	Изпълняваме

ansible web -i inventory -a "hostname"

> - •	Отваряме файла и създаваме група:

[grp-webservers]
web

> - •	Изпълняваме

ansible grp-webservers -i inventory -a "hostname"

> - •	Отваряме файла и добавяме втори хост:

db ansible_host=192.168.98.101 ansible_user=vagrant ansible_ssh_pass=vagrant

> - •	И група за него:

[grp-databases]
db

> - •	Запазваме и изпълняваме

ansible grp-databases -i inventory -a "hostname"

> - •	Отваряме файла и добавяме трети хост:

clnt ansible_host=192.168.98.102 ansible_user=vagrant ansible_ssh_pass=vagrant

> - •	И група за него:

[grp-stations]
clnt

> - •	След това добавяме обща група:

[grp-servers:children]
grp-webservers
grp-databases

> - •	И най-накрая добавяме променливи за групата:

[grp-servers:vars]
ansible_user=vagrant
ansible_ssh_pass=vagrant

> - •	Изпълняваме

ansible grp-servers -i inventory -a "hostname"
Променливи (2)
Глобално ниво:

> - •	Работим в папка
> - M4/M4-2/2
> - •	Създаваме директории
> - group_vars
> - и
> - host_vars
> - •	Копираме файла
> - inventory
> - от папка
> - M4/M4-2/1
> - •	Създаваме файл
> - all
> - в папка
> - group_vars

# Global level user
username: user_all

> - •	ansible grp-servers -i inventory -m user -a "name={{username}} password=Password1" --become

Групово ниво:

> - •	Създаваме файл
> - grp-webservers
> - в папка
> - group_vars

# Group level user
username: user_group

> - •	ansible grp-servers -i inventory -m user -a "name={{username}} password=Password1" --become

Ниво хост:

> - •	Създаваме файл  file
> - web
> - in
> - host_vars

# Host level user
username: user_host

> - •	ansible grp-servers -i inventory -m user -a "name={{username}} password=Password1" --become

Конфигурации (3)
Работим в папка **M4/M4-2/3**. Копираме инвентарния файл от папка **M4/M4-2/2**.
Използване на локален конфигурационен файл:

> - •	Премахваме записите за трите хоста от файла
> - ~/.ssh/known_hosts
> - •	Изпълняваме
> -

> ansible clnt -i inventory -a "hostname" -u vagrant -k

> - •	Създаваме файл
> - ansible.cfg

> [defaults]
host_key_checking=false

> - •	ansible clnt -i inventory -a "hostname" -u vagrant -k
•	cat ~/.ssh/known_hosts

Променливи на средата:

> - •	Създаваме променлива

> export ANSIBLE_HOST_KEY_CHECKING=true

> - •	Проверяваме я

> echo $ANSIBLE_HOST_KEY_CHECKING

> - •	Изпълняваме:

> ansible db -i inventory -a "hostname" -u vagrant -k

> - •	Премахваме променливата

> unset ANSIBLE_HOST_KEY_CHECKING

> - •	Изпълняваме отново

> ansible db -i inventory -a "hostname" -u vagrant -k

> - •	Проверяваме

cat ~/.ssh/known_hosts
Допълнителни настройки:

> - •	Редактираме фйла
> - ansible.cfg
> -

> private_key_file = /home/devops/.vagrant.d/insecure_private_key
ansible_user = vagrant
remote_user = vagrant

> - •	Редактираме файла
> - inventory
> - като премахваме всичката информация за потребители и пароли:

web ansible_host=192.168.98.100
db ansible_host=192.168.98.101
clnt ansible_host=192.168.98.102

[grp-webservers]
web

[grp-databases]
db

[grp-stations]
clnt

[grp-servers:children]
grp-webservers
grp-databases

> - •	Изпълняваме

ansible web -i inventory -a "hostname"
Modules (4)
Предварителна подготовка - работим в папка **M4/M4-2/4** и копираме файлове от папка **M4/M4-2/3**:

> - •	Копираме инвентарния и конфигурационния файл:

cp ../3/ansible.cfg .
cp ../3/inventory .
Преглеждаме списъка от достъпни модули

> - •	ansible-doc -l
•	ansible-doc yum

Инсталираме Apache HTTP на нашите уеб сървъри (**grp-webservers**):

> - •	ansible grp-webservers -i inventory -m yum -a "name=httpd state=present" --become
•	ansible grp-webservers -i inventory -m service -a "name=httpd state=started enabled=true" --become
> - •	Тестваме в браузър на хоста - http://localhost:8080

Инсталираме MariaDB на нашите сървъри за бази от данни (**grp-dbservers**):

> - •	ansible grp-databases -i inventory -m yum -a "name=mariadb,mariadb-server state=present" --become
•	ansible grp-databases -i inventory -m service -a "name=mariadb state=started enabled=true" --become
> - •	Влизаме в системата и проверяваме дали всичко работи

Трета част
Playbooks
Ако все още не сме го направили, можем да спрем всички машини от предходните упражнения.
Подготвяме работната директория:

> - •	Бидейки в работната папка
> - M4
> - изпълняваме следните команди

mkdir -p M4-3/{1..2}
cd M4-3

> - •	Копираме
> - Vagrantfile
> - от
> - p2
> - и изпълняваме

> vagrant up

> - •	Изпълняваме

cd 1

> - •	Копираме
> - inventory
> - файла от
> - ../../M4-2/2

cp ../../M4-2/2/inventory .

> - •	Създаваме конфигурационен файл
> - ansible.cfg

[defaults]
host_key_checking = False
hostfile=iventory

> - •	Създаваме файл
> - playbook.yml
> - със съдържание:

- hosts: grp-webservers
become: true

tasks:
- name: Install Apache HTTP Server
yum: name=httpd state=present

- name: Start Apache HTTP Server and Enable it
service: name=httpd state=started enabled=true

> - •	Преди да пристъпим към изпълнение, нека проверим коректността на създадения файл:

ansible-playbook playbook.yml --syntax-check

> - •	Ако проверката е минала без грешка, можем да проверим кои хостове ще бъдат засегнати:

ansible-playbook playbook.yml --list-hosts

> - •	И най-накрая можем да пристъпим към изпълнение с командата:

ansible-playbook playbook.yml

> - •	Нека отворим отново файла
> - playbook.yml
> - и да добавим:

- hosts: grp-databases
become: true

tasks:
- name: Install MariaDB Server
yum: name=mariadb,mariadb-server state=present

- name: Start and enable MariaDB
service: name=mariadb state=started enabled=true

> - •	Изпълняваме отново:

ansible-playbook playbook.yml
Нека сега да направим невъзможна комуникацията с единия хост:

> - •	Преди да пристъпим към действие, трябва да променим локалната конфигурация. За целта отваряме файла
> - ansible.cfg
> - и добавяме:

retry_files_enabled = True
retry_files_save_path = ~/.ansible-retry

> - •	Отваряме
> - inventory
> - файла и извършваме следните промени - премахваме променливите
•	След това добавяме премахнатата информация само срещу единия хост в началото на файла
•	Запазваме и стартираме повторно:

ansible-playbook playbook.yml
За недостъпните хостове се създава специален файл, който след отстраняване на проблема с достъпа, бихме могли да използваме, за да повторим операцията само срещу тях. За целта изпълняваме следните действия:

> - •	Отваряме
> - inventory
> - файла и го възстановяваме към предходното му състояние - добавяме секция с променливи в края

[grp-servers:vars]
ansible_user=vagrant
ansible_ssh_pass=vagrant

> - •	След това изпълняваме:

ansible-playbook playbook.yml --limit @/home/devops/.ansible-retry/playbook.retry
Няколко допълнителни техники
Register & Debug
Нека да направим още един файл с име **register.yml** и да въведем следния текст:
- hosts: clnt
become: false

tasks:
- name: Get system's kernel version
shell: /usr/bin/uname -r
register: kver

- name: Debug info
debug: var=kver
Сега можем да изпълним:
ansible-playbook register.yml
Copy
Да пробваме и още една техника - за копиране на файл(-ове). Нека направим нов файл - **copy.yml** и да въведем следния текст:
- hosts: grp-webservers
become: true

tasks:
- name: Copy new index.html
copy: src=html/index.html dest=/var/www/html/
Нека направим и нова папка **html**, в която да запишем файл **index.html** със следното съдържание:
<h2>Hello, Ansible!</h2>
Сега можем да изпълним:
ansible-playbook copy.yml
И да проверим резултата в браузъра, като въведем http://localhost:8080
Conditional
Нека променим **inventory** файла, така че да добавим още един уеб сървър:
web ansible_host=192.168.98.100
webu ansible_host=192.168.98.105
…
[grp-webservers]
web
webu
Сега можем да добавим следното във **Vagrant** файла:
config.vm.define "webu" do |webu|
webu.vm.box="ubuntu/trusty64"
webu.vm.hostname = "webu.sulab.local"
webu.vm.network "private_network", ip: "192.168.98.105"
webu.vm.network "forwarded_port", guest: 80, host: 8081
end
И да изпълним повторно **vagrant up
**Нека да създадем още един файл **webservers.yml**:
- hosts: grp-webservers
become: true

tasks:
- name: Install Apache HTTP Server
yum: name=httpd state=present
when: ansible_os_family == "RedHat"

- name: Start Apache HTTP Server and Enable it
service: name=httpd state=started enabled=true
when: ansible_os_family == "RedHat"

- name: Install Apache HTTP Server on Ubuntu
apt: name=apache2 state=present
when: ansible_os_family == "Debian"

- name: Start Apache HTTP Server and Enable it on Ubuntu
service: name=apache2 state=started enabled=true
when: ansible_os_family == "Debian"
И да изпълним:
ansible-playbook webservers.yml
Нека сега да отворим следния адрес http://localhost:8081 в браузър.
Шаблони
Нека изпълним следната последователност от действия, за да видим макар и в много базов пример работата с шаблони:

> - •	Отиваме в папка
> - M4-3/2

> cd ../2

> - •	Копираме следните файлове от папка
> - 1

cp ../1/ansible.cfg .
cp ../1/inventory .
cp ../1/webservers.yml

> - •	Създаваме папка
> - templates

mkdir templates

> - •	Създаваме файл
> - index.j2
> - в папка
> - templates
> - със следното съдържание:

<html>
<head>
<title>Hello!</title>
</head>
<body>
<h2>Hello from Ansible on {{ v_host_type }}!</h2>
</body>
</html>

> - •	Променяме съдържанието на
> - webservers.yml
> - както следва:

- hosts: grp-webservers
become: true

tasks:
- name: Install Apache HTTP Server
yum: name=httpd state=present
when: ansible_os_family == "RedHat"

- name: Start Apache HTTP Server and Enable it
service: name=httpd state=started enabled=true
when: ansible_os_family == "RedHat"

- name: Deploy index.j2 on RedHat
vars:
v_host_type: RedHat
template: src=templates/index.j2 dest=/var/www/html/index.html
when: ansible_os_family == "RedHat"

- name: Install Apache HTTP Server on Ubuntu
apt: name=apache2 state=present
when: ansible_os_family == "Debian"

- name: Start Apache HTTP Server and Enable it on Ubuntu
service: name=apache2 state=started enabled=true
when: ansible_os_family == "Debian"

- name: Deploy index.j2 on Debian
vars:
v_host_type: Debian
template: src=templates/index.j2 dest=/var/www/html/index.html
when: ansible_os_family == "Debian"

> - •	Изпълняваме командата:

ansible-playbook webservers.yml

> - •	Отваряме в браузър адреса: http://localhost:8080
•	Отваряме във втори прозорец адреса: http://localhost:8081

Роли
Можем да спрем и почистим средата. Евентуално трябва да изтрием и съответните записи от файла **~/.ssh/known_hosts
**След това докато сме в папка **M4-3** изпълняваме отново:
**vagrant up
**Отиваме в папка **3** (**DOB/M4/M-4/3**). Нека разгледаме съдържанието на файловете **ansible.cfg** и **inventory
**Сега с помощта на командата **tree** можем да разгледаме структурата на папките. Нека влезем в папка **roles/apache-web-server/tasks** и последователно разгледаме файловете **main.yml**, **debian.yml** и **redhat.yml
**Връщаме се в първоначалната папка (**DOB/M4/M4-3/3**) и нека разгледаме съдържанието на файла **webservers.yml**
Вече можем да изпълним:
**ansible-playbook webservers.yml
**Можем да проверим резултата от изпълнението, като в браузър на хоста отворим двата адреса – http://localhost:8080 и http://localhost:8081
Работа в хетерогенна среда
Нека да добавим една **Windows** машина към нашата виртуална инфраструктура. Това може да стане като импортираме вече готова или инсталираме нова.
При всички положения трябва да има мрежова свързаност и да е видима от нашия **Ansible** хост. След като се уверим, че в мрежово направление всичко е наред, можем да пристъпим към настройката на защитната стена така, че да позволява отдалечено управление.
Конфигурирането на защитната стена може да стане по няколко начина. Тъй като нашият случай имаме **Windows Server 2016 Core**, то можем да използваме командата **sconfig**.
За цялостно и автоматизирано настройване на **WinRM** можем да използваме следния скрипт:
https://github.com/ansible/ansible/blob/devel/examples/scripts/ConfigureRemotingForAnsible.ps1
Това може да стане с инструмент като **wget**, но трябва да се използва следния адрес:
https://raw.githubusercontent.com/ansible/ansible/devel/examples/scripts/ConfigureRemotingForAnsible.ps1
Един от вариантите да доставим този скрипт на нашия Windows Core хост е да направим споделена папка. За целта стартираме PowerShell и изпълняваме следните команди:
mkdir C:\Temp
New-SmbShare -Name Temp -Path 'C:\Temp' -FullAccess Everyone
Set-NetFirewallRule -Name 'FPS-SMB-In-TCP' -Enabled True
След това стартираме копирания конфигурационен скрипт.
Алтернативен начин е да използваме директно команда като **wget** или **curl** за изтегляне на скрипта:
curl https://... -UseBasicParsing -OutFile Ansible.ps1
Сега на нашия **Ansible** хост трябва да добавим информация в инвентарния файл:
[win]
192.168.98.110

[win:vars]
ansible_user: Administrator
ansible_password: Password1
ansible_port: 5986
ansible_connection: winrm
ansible_winrm_server_cert_validation: ignore

Като пред-последна стъпка инсталираме **pip**, ако вече не е наличен:
sudo yum install python-pip
Най-накрая инсталираме съответния **Python** модул на нашата работна станция:
pip install pywinrm
Можем да изпълним следната команда, за да съберем информация за отдалечения **Windows** хост:
ansible win -i inventory -m setup
Можем да опитаме и с модулите: **win_whoami**, **win_ping** и **win_service**. Последният би изглеждал така:
ansible win -i inventory -m win_service -a "name=spool"
Повече детайли за специализираните Windows модули, може да бъде намерена тук:
https://docs.ansible.com/ansible/latest/modules/list_of_windows_modules.html