-- Down migration 000023
UPDATE products SET suite = 'ERP' WHERE name IN ('SCM', 'CRM', 'Webhosting', 'HustleX');
UPDATE products SET suite = 'Nvuto' WHERE name IN ('Finance', 'Mail', 'HR');
