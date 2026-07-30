-- Down migration for 000022
ALTER TABLE products ADD CONSTRAINT products_suite_check CHECK (suite IN ('ERP', 'Nvuto'));
