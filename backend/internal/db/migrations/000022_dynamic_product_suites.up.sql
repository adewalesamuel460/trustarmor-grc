-- Migration 000022: Remove strict check constraint on products.suite
-- Allows products to belong to any suite (e.g. ERP, Nvuto, FinTech, Infrastructure, Security, etc.)

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_suite_check;
