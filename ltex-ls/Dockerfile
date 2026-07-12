FROM eclipse-temurin:21-jre-jammy

ARG LTEX_VERSION=18.7.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    && wget -q "https://github.com/ltex-plus/ltex-ls-plus/releases/download/${LTEX_VERSION}/ltex-ls-plus-${LTEX_VERSION}-linux-x64.tar.gz" \
    && tar -xzf "ltex-ls-plus-${LTEX_VERSION}-linux-x64.tar.gz" \
    && mv "ltex-ls-plus-${LTEX_VERSION}" /opt/ltex-ls \
    && rm "ltex-ls-plus-${LTEX_VERSION}-linux-x64.tar.gz" \
    && rm -rf /opt/ltex-ls/jdk-21.0.10+7 \
    && apt-get purge -y wget \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/false ltex
USER ltex
WORKDIR /opt/ltex-ls

ENV JAVA_HOME=/opt/java/openjdk
ENV LTEX_PORT=2222

EXPOSE 2222

ENTRYPOINT ["/opt/ltex-ls/bin/ltex-ls-plus"]
CMD ["--server-type=tcpSocket", "--host", "0.0.0.0", "--port", "2222", "--endless"]
