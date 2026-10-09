FROM postgres:18.6-bookworm@sha256:afc7e2d441324c0388fa80c3d24f733b4194a4eb7f47dd8ee2b08eb1a24a647c AS builder
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates gcc meson ninja-build pkg-config libpq-dev libssl-dev libxml2-dev liblz4-dev libzstd-dev libbz2-dev zlib1g-dev libssh2-1-dev libsystemd-dev
RUN curl -fsSL https://github.com/pgbackrest/pgbackrest/releases/download/release%2F2.59.3/pgbackrest-2.59.3.tar.gz -o /tmp/source.tar.gz \
    && echo '14037901db002e5536a948bf9f0fc0ff6cde31f4e675d3e9b46f129071bf2e5f  /tmp/source.tar.gz' | sha256sum -c - \
    && tar xzf /tmp/source.tar.gz -C /tmp \
    && meson setup /tmp/build /tmp/pgbackrest-2.59.3 \
    && ninja -j2 -C /tmp/build
FROM postgres:18.6-bookworm@sha256:afc7e2d441324c0388fa80c3d24f733b4194a4eb7f47dd8ee2b08eb1a24a647c
RUN apt-get update && apt-get install -y --no-install-recommends libxml2 liblz4-1 libzstd1 libbz2-1.0 libssh2-1 libssl3 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /tmp/build/src/pgbackrest /usr/bin/pgbackrest
RUN mkdir -p /var/lib/pgbackrest && chown postgres:postgres /var/lib/pgbackrest
COPY deploy/postgres/entrypoint.sh /usr/local/bin/shahn-postgres-entrypoint.sh
RUN chmod 755 /usr/local/bin/shahn-postgres-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/shahn-postgres-entrypoint.sh"]
CMD ["postgres"]
