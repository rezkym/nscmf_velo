-- Runs once when the local MySQL data volume is first initialized.
-- Creates the isolated, disposable automated-test database. Names assume the
-- default DB_DATABASE=nscmf and DB_USERNAME=nscmf from .env.example.
CREATE DATABASE IF NOT EXISTS `nscmf_testing` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON `nscmf_testing`.* TO 'nscmf'@'%';
