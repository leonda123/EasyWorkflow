-- MySQL 初始化脚本
-- 此脚本在 MySQL 容器首次启动时自动执行

-- 设置字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 确保数据库存在
CREATE DATABASE IF NOT EXISTS `easyworkflow` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户并使用 mysql_native_password 认证（Prisma 兼容）
CREATE USER IF NOT EXISTS 'easyworkflow'@'%' IDENTIFIED WITH mysql_native_password BY 'easyworkflow123';
GRANT ALL PRIVILEGES ON `easyworkflow`.* TO 'easyworkflow'@'%';
FLUSH PRIVILEGES;
