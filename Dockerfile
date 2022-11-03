FROM ubuntu/nginx

RUN apt-get update && \
    apt-get install -y ca-certificates openssl libssl-dev stunnel4
