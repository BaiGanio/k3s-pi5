FROM ubuntu
LABEL maintainer="k3s-pi5@admin.pro" description="nginx image — one layer per RUN (unoptimized)"
RUN apt-get update
RUN apt-get install -y nginx
ENTRYPOINT ["/usr/sbin/nginx","-g","daemon off;"]
EXPOSE 80