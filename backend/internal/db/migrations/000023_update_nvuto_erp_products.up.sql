-- Migration 000023: Update products suite names to Nvuto ERP and HustleX
UPDATE products SET suite = 'Nvuto ERP' WHERE name IN ('SCM', 'CRM', 'Webhosting', 'Finance', 'Mail', 'HR');
UPDATE products SET suite = 'HustleX' WHERE name = 'HustleX';
