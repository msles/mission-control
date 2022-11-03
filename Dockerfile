FROM ubuntu/nginx

RUN apt-get update && \
    apt-get install -y ca-certificates openssl libssl-dev stunnel4

RUN mkdir -p /etc/stunnel/conf.d
COPY stunnel.conf /etc/stunnel/stunnel.conf
# COPY psk.txt /etc/stunnel/psk.txt <-- psk will be povided via secret

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]