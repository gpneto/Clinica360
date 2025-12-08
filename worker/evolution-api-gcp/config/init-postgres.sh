#!/bin/sh
# Script de inicialização do PostgreSQL para copiar configurações

# Copiar configurações para o diretório de dados se não existirem
if [ ! -f /var/lib/postgresql/data/postgresql.conf ]; then
  cp /etc/postgresql/postgresql.conf /var/lib/postgresql/data/postgresql.conf 2>/dev/null || true
fi

if [ ! -f /var/lib/postgresql/data/pg_hba.conf ]; then
  cp /etc/postgresql/pg_hba.conf /var/lib/postgresql/data/pg_hba.conf 2>/dev/null || true
fi

# Garantir que listen_addresses está configurado
if ! grep -q "^listen_addresses" /var/lib/postgresql/data/postgresql.conf 2>/dev/null; then
  echo "listen_addresses = '*'" >> /var/lib/postgresql/data/postgresql.conf
fi

# Garantir que pg_hba.conf permite conexões externas
if ! grep -q "0.0.0.0/0" /var/lib/postgresql/data/pg_hba.conf 2>/dev/null; then
  echo "" >> /var/lib/postgresql/data/pg_hba.conf
  echo "# Conexões externas permitidas" >> /var/lib/postgresql/data/pg_hba.conf
  echo "host    all             all             0.0.0.0/0               md5" >> /var/lib/postgresql/data/pg_hba.conf
  echo "host    all             all             ::/0                    md5" >> /var/lib/postgresql/data/pg_hba.conf
fi

# Iniciar PostgreSQL
exec postgres -c listen_addresses='*' -c max_connections=200

