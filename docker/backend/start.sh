#!/bin/sh
set -e

echo "Waiting for MySQL to be ready..."
until nc -z mysql 3306; do
  echo "MySQL is unavailable - sleeping"
  sleep 2
done
echo "MySQL is up!"

echo "Waiting for RabbitMQ to be ready..."
until nc -z rabbitmq 5672; do
  echo "RabbitMQ is unavailable - sleeping"
  sleep 2
done
echo "RabbitMQ is up!"

echo "Running database migrations..."
npx prisma migrate deploy

echo "Running database seed..."
npx prisma db seed

echo "Starting application..."
exec node dist/src/main.js
