FROM ubuntu
LABEL maintainer="SoftUni Student"
RUN apt-get update && apt-get install -y nginx
ENTRYPOINT ["/usr/sbin/nginx","-g","daemon off;"]
EXPOSE 80