FROM python:3.7.4-alpine3.10

LABEL maintainer="damadden88@googlemail.com"
LABEL cdk_version={{CDK_VERSION}}

RUN mkdir /cdk

COPY ./requirements.txt /cdk/
COPY ./entrypoint.sh /usr/local/bin/

WORKDIR /cdk

RUN apk -U --no-cache add \
    bash \
    git \
    nodejs=10.16.3-r0 \
    npm=10.16.3-r0 &&\
    npm i -g ---unsafe-perm aws-cdk@{{CDK_VERSION}} &&\
    pip3 install -r requirements.txt &&\
    rm -rf /var/cache/apk/*

ENTRYPOINT ["entrypoint.sh"]

CMD ["--help"]
