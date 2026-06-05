FROM ubuntu
LABEL maintainer="k3s-pi5@admin.pro" description="nginx image — update+install chained in one RUN (optimized)"
RUN apt-get update && apt-get install -y nginx
ENTRYPOINT ["/usr/sbin/nginx","-g","daemon off;"]
EXPOSE 80