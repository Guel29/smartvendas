-- ==============================================================================
-- SMART VENDAS - BANCO DE DADOS CENTRAL MYSQL 8 (SCHEMA ATUALIZADO)
-- Arquivo de Migração Inicial e Atualização: 001_initial_schema.sql
-- Fuso Horário de Referência: America/Sao_Paulo
-- Compatível com Hostinger VPS e cPanel / phpMyAdmin (MySQL 8.0+)
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABELA DE LOJAS (SUPERMERCADOS)
CREATE TABLE IF NOT EXISTS `stores` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(50) NOT NULL COMMENT 'Identificador único amigável da loja',
  `name` VARCHAR(150) NOT NULL COMMENT 'Razão social ou nome fantasia',
  `agent_key` VARCHAR(128) NOT NULL DEFAULT '' COMMENT 'Chave de identificação do agente sincronizador (x-store-agent-key)',
  `cnpj` VARCHAR(30) DEFAULT '',
  `city` VARCHAR(100) DEFAULT '',
  `state` VARCHAR(10) DEFAULT '',
  `timezone` VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_sync_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_stores_code` (`code`),
  KEY `idx_stores_active` (`active`),
  KEY `idx_stores_agent_key` (`agent_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABELA DE USUÁRIOS DO SISTEMA
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(180) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'owner', 'manager', 'viewer') NOT NULL DEFAULT 'viewer',
  `phone` VARCHAR(30) DEFAULT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. PERMISSÕES DE ACESSO POR LOJA (RBAC)
CREATE TABLE IF NOT EXISTS `user_store_permissions` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `store_id` VARCHAR(64) NOT NULL,
  `can_view_financial` TINYINT(1) NOT NULL DEFAULT 1,
  `can_export_reports` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_store` (`user_id`, `store_id`),
  CONSTRAINT `fk_usp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_usp_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. AGENTES SINCRONIZADORES LOCAIS (CREDENCIAIS DE LOJA)
CREATE TABLE IF NOT EXISTS `store_agents` (
  `id` VARCHAR(64) NOT NULL,
  `store_id` VARCHAR(64) NOT NULL,
  `agent_token_hash` VARCHAR(128) NOT NULL COMMENT 'Hash da chave de autenticação do agente',
  `api_key_prefix` VARCHAR(32) NOT NULL COMMENT 'Prefixo legível para identificação no painel',
  `client_version` VARCHAR(30) DEFAULT '1.2.0',
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `last_ping_at` DATETIME DEFAULT NULL,
  `status` ENUM('online', 'delayed', 'offline') NOT NULL DEFAULT 'offline',
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_agent_store` (`store_id`),
  KEY `idx_agent_token` (`agent_token_hash`),
  CONSTRAINT `fk_agent_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CADASTRO DE PDVS (CAIXAS) DETECTADOS AUTOMATICAMENTE
CREATE TABLE IF NOT EXISTS `pdvs` (
  `id` VARCHAR(64) NOT NULL,
  `store_id` VARCHAR(64) NOT NULL,
  `ecf` INT NOT NULL COMMENT 'Número do PDV/ECF no VR Software',
  `label` VARCHAR(50) DEFAULT NULL COMMENT 'Ex: Caixa Rápido 01, Caixa 02',
  `model` VARCHAR(50) DEFAULT 'VR PDV',
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_sale_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pdv_store_ecf` (`store_id`, `ecf`),
  KEY `idx_pdv_store` (`store_id`),
  CONSTRAINT `fk_pdv_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. VENDAS DIÁRIAS CONSOLIDADAS POR PDV (FÓRMULAS OFICIAIS VR MASTER)
CREATE TABLE IF NOT EXISTS `sales_daily` (
  `id` VARCHAR(64) NOT NULL,
  `store_id` VARCHAR(64) NOT NULL,
  `ecf` INT NOT NULL,
  `sale_date` DATE NOT NULL,
  `cupons` INT NOT NULL DEFAULT 0 COMMENT 'COUNT(DISTINCT v.id) - calculado separadamente',
  `venda_bruta` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'SUM(vf.valor) de vendas não canceladas',
  `troco` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'SUM(COALESCE(vf.troco, 0))',
  `venda_liquida` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'venda_bruta - troco',
  `ticket_medio` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'venda_liquida / cupons',
  `last_sale_at` DATETIME DEFAULT NULL,
  `sync_version` INT NOT NULL DEFAULT 1,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sales_store_ecf_date` (`store_id`, `ecf`, `sale_date`),
  KEY `idx_sales_store_date` (`store_id`, `sale_date`),
  KEY `idx_sales_date` (`sale_date`),
  CONSTRAINT `fk_sales_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. DETALHAMENTO DE FORMAS DE PAGAMENTO POR PDV E DATA (FINALIZADORAS OFICIAIS)
CREATE TABLE IF NOT EXISTS `payment_daily` (
  `id` VARCHAR(64) NOT NULL,
  `store_id` VARCHAR(64) NOT NULL,
  `ecf` INT NOT NULL,
  `sale_date` DATE NOT NULL,
  `finalizadora_id` INT NOT NULL COMMENT 'ID da finalizadora no VR Software (f.id)',
  `finalizadora_nome` VARCHAR(80) NOT NULL COMMENT 'f.descricao (DINHEIRO, CARTAO, PIX, etc.)',
  `cupons_count` INT NOT NULL DEFAULT 0,
  `venda_bruta` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `troco` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `venda_liquida` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pay_store_ecf_date_fin` (`store_id`, `ecf`, `sale_date`, `finalizadora_id`),
  KEY `idx_pay_store_date` (`store_id`, `sale_date`),
  CONSTRAINT `fk_pay_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. DETALHAMENTO TEF (pdv.vendatef) PARA CLASSIFICAÇÃO SEM DUPLICAÇÃO DE VALORES
CREATE TABLE IF NOT EXISTS `tef_transactions_daily` (
  `id` VARCHAR(64) NOT NULL,
  `store_id` VARCHAR(64) NOT NULL,
  `ecf` INT NOT NULL,
  `sale_date` DATE NOT NULL,
  `nomecartao` VARCHAR(100) NOT NULL DEFAULT 'INDEFINIDO',
  `id_tipotef` INT NOT NULL COMMENT 'Ex: 47 = Pix TEF',
  `id_situacaotef` INT NOT NULL DEFAULT 1,
  `valor_tef` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `transacoes_count` INT NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tef_store_ecf_date_card_type` (`store_id`, `ecf`, `sale_date`, `nomecartao`, `id_tipotef`, `id_situacaotef`),
  KEY `idx_tef_store_date` (`store_id`, `sale_date`),
  CONSTRAINT `fk_tef_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. REGRAS CONFIGURÁVEIS DE CLASSIFICAÇÃO TEF (PIX, DÉBITO, CRÉDITO, BENEFÍCIOS)
CREATE TABLE IF NOT EXISTS `tef_classification_rules` (
  `id` VARCHAR(64) NOT NULL,
  `id_tipotef` INT DEFAULT NULL,
  `nomecartao_pattern` VARCHAR(100) DEFAULT NULL COMMENT 'Regex ou padrão LIKE',
  `category` ENUM('pix', 'credito', 'debito', 'alimentacao', 'refeicao', 'outros') NOT NULL,
  `descricao` VARCHAR(150) NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tef_rule_type` (`id_tipotef`),
  KEY `idx_tef_rule_cat` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TABELA DE SANGRIAS E RETIRADAS DE CAIXA (VR SOFTWARE)
CREATE TABLE IF NOT EXISTS `sangrias` (
  `id` VARCHAR(128) NOT NULL,
  `store_id` VARCHAR(64) NOT NULL DEFAULT 'store-001',
  `pdv` INT NOT NULL,
  `sale_date` DATE NOT NULL,
  `hora` VARCHAR(20) NOT NULL,
  `valor` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `motivo` VARCHAR(255) DEFAULT 'Sangria de Caixa',
  `operador` VARCHAR(100) DEFAULT 'Operador',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sangria_store_date` (`store_id`, `sale_date`),
  KEY `idx_sangria_pdv` (`pdv`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. TABELA DE CONFIGURAÇÕES DINÂMICAS DO APP (APP_CONFIG)
CREATE TABLE IF NOT EXISTS `app_config` (
  `config_key` VARCHAR(100) NOT NULL,
  `config_value` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TABELA DE TRANSAÇÕES INDIVIDUAIS DE VENDAS
CREATE TABLE IF NOT EXISTS `sales` (
  `id` VARCHAR(64) NOT NULL,
  `store_id` VARCHAR(64) NOT NULL,
  `pdv_id` VARCHAR(30) DEFAULT 'PDV-01',
  `sale_number` VARCHAR(50) NOT NULL,
  `total` DECIMAL(12,2) DEFAULT 0.00,
  `sale_date` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_store_date` (`store_id`, `sale_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. LOGS DE SINCRONIZAÇÃO E AUDITORIA DE TRANSMISSÕES DO AGENTE
CREATE TABLE IF NOT EXISTS `sync_logs` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `agent_key` VARCHAR(128) NOT NULL,
  `store_id` VARCHAR(64) DEFAULT NULL,
  `records_count` INT DEFAULT 0,
  `status` VARCHAR(30) DEFAULT 'success',
  `message` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sync_agent_key` (`agent_key`),
  KEY `idx_sync_store` (`store_id`),
  KEY `idx_sync_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. CONFIGURAÇÕES DE NOTIFICAÇÃO E ALERTAS
CREATE TABLE IF NOT EXISTS `notification_settings` (
  `id` VARCHAR(64) NOT NULL,
  `store_id` VARCHAR(64) NOT NULL,
  `offline_threshold_minutes` INT NOT NULL DEFAULT 3,
  `alert_email` VARCHAR(180) DEFAULT NULL,
  `alert_whatsapp` VARCHAR(30) DEFAULT NULL,
  `sangria_alert_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `sangria_limit_value` DECIMAL(12,2) DEFAULT 1500.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_notif_store` (`store_id`),
  CONSTRAINT `fk_notif_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. LOGS DE AUDITORIA DO SISTEMA
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `action` VARCHAR(80) NOT NULL,
  `resource` VARCHAR(80) NOT NULL,
  `details` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. CONFIGURAÇÕES DO SISTEMA E PAINEL ADMINISTRATIVO (F8)
CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` VARCHAR(80) NOT NULL,
  `setting_value` TEXT NOT NULL,
  `category` ENUM('database', 'agent', 'security', 'general') NOT NULL DEFAULT 'general',
  `description` VARCHAR(255) DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`),
  KEY `idx_settings_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- MIGRAÇÕES IDEMPOTENTES (ADICIONAR COLUNAS CASO AS TABELAS JÁ EXISTISSEM)
-- ==============================================================================

-- Adiciona agent_key na tabela stores se não existir
SET @dbname = DATABASE();
SET @tablename = "stores";
SET @columnname = "agent_key";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `stores` ADD COLUMN `agent_key` VARCHAR(128) NOT NULL DEFAULT '' AFTER `name`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Adiciona last_sync_at na tabela stores se não existir
SET @columnname = "last_sync_at";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `stores` ADD COLUMN `last_sync_at` DATETIME NULL AFTER `active`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ==============================================================================
-- INSERÇÃO DE DADOS INICIAIS SEGUROS (INSERT IGNORE)
-- ==============================================================================

-- Loja Padrão 01
INSERT IGNORE INTO `stores` (`id`, `code`, `name`, `agent_key`, `cnpj`, `city`, `state`, `timezone`, `active`) VALUES
('store-001', '001', 'Supermercado Smart Vendas - Loja 01', 'sv_live_001', '00.000.000/0001-00', 'São Paulo', 'SP', 'America/Sao_Paulo', 1);

-- Usuário Administrador Master
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `phone`, `active`) VALUES
('usr-master-jj', 'JJ Silva (Admin Master)', 'jjsilva29@gmail.com', '159159', 'admin', '(11) 99999-9999', 1);

-- Configurações Iniciais do Sistema
INSERT IGNORE INTO `system_settings` (`setting_key`, `setting_value`, `category`, `description`) VALUES
('db_mysql_config', '{"host":"localhost","port":3306,"database":"smart_vendas","user":"smartvendas_app","ssl":false}', 'database', 'Configuração de conexão ao MySQL 8 na VPS Hostinger'),
('db_vr_pg_config', '{"host":"127.0.0.1","port":5432,"database":"vr","user":"smartvendas_reader","sync_interval_seconds":10}', 'database', 'Configuração do agente local de leitura do PostgreSQL do VR'),
('admin_hotkey_enabled', 'true', 'security', 'Ativação do painel administrativo oculto por tecla F8'),
('system_version', '1.2.0', 'general', 'Versão atual do Smart Vendas'),
('timezone_default', 'America/Sao_Paulo', 'general', 'Fuso horário padrão para consolidação diária');

-- Regras Padrão de Classificação TEF
INSERT IGNORE INTO `tef_classification_rules` (`id`, `id_tipotef`, `nomecartao_pattern`, `category`, `descricao`, `active`) VALUES
('rule-pix-47', 47, '%PIX%', 'pix', 'Pix via TEF (código oficial tipotef 47)', 1),
('rule-pix-cnpj', NULL, '%PIX%', 'pix', 'Pix em Cartão/CNPJ identificado por nome', 1),
('rule-visa-cred', NULL, '%VISA CRED%', 'credito', 'Visa Crédito', 1),
('rule-master-cred', NULL, '%MASTERCARD CRED%', 'credito', 'Mastercard Crédito', 1),
('rule-elo-cred', NULL, '%ELO CRED%', 'credito', 'Elo Crédito', 1),
('rule-visa-deb', NULL, '%VISA DEB%', 'debito', 'Visa Débito', 1),
('rule-master-deb', NULL, '%MASTERCARD DEB%', 'debito', 'Mastercard Débito', 1),
('rule-elo-deb', NULL, '%ELO DEB%', 'debito', 'Elo Débito', 1),
('rule-ticket-alim', NULL, '%TICKET ALIM%', 'alimentacao', 'Ticket Alimentação', 1),
('rule-alelo-alim', NULL, '%ALELO ALIM%', 'alimentacao', 'Alelo Alimentação', 1),
('rule-sodexo-alim', NULL, '%SODEXO ALIM%', 'alimentacao', 'Sodexo / Pluxee Alimentação', 1),
('rule-vr-beneficios', NULL, '%VR BENEF%', 'alimentacao', 'VR Benefícios Alimentação', 1);

SET FOREIGN_KEY_CHECKS = 1;
