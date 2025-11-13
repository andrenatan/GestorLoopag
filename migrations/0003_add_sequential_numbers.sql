-- Add sequential number columns to clients, systems, and employees tables
ALTER TABLE "clients" ADD COLUMN "client_number" integer;
ALTER TABLE "systems" ADD COLUMN "system_number" integer;
ALTER TABLE "employees" ADD COLUMN "employee_number" integer;

-- Populate client_number with sequential numbers per user
WITH numbered_clients AS (
  SELECT 
    id,
    auth_user_id,
    ROW_NUMBER() OVER (PARTITION BY auth_user_id ORDER BY id) as row_num
  FROM clients
)
UPDATE clients
SET client_number = numbered_clients.row_num
FROM numbered_clients
WHERE clients.id = numbered_clients.id;

-- Populate system_number with sequential numbers per user
WITH numbered_systems AS (
  SELECT 
    id,
    auth_user_id,
    ROW_NUMBER() OVER (PARTITION BY auth_user_id ORDER BY id) as row_num
  FROM systems
)
UPDATE systems
SET system_number = numbered_systems.row_num
FROM numbered_systems
WHERE systems.id = numbered_systems.id;

-- Populate employee_number with sequential numbers per user
WITH numbered_employees AS (
  SELECT 
    id,
    auth_user_id,
    ROW_NUMBER() OVER (PARTITION BY auth_user_id ORDER BY id) as row_num
  FROM employees
)
UPDATE employees
SET employee_number = numbered_employees.row_num
FROM numbered_employees
WHERE employees.id = numbered_employees.id;

-- Make the columns NOT NULL after populating
ALTER TABLE "clients" ALTER COLUMN "client_number" SET NOT NULL;
ALTER TABLE "systems" ALTER COLUMN "system_number" SET NOT NULL;
ALTER TABLE "employees" ALTER COLUMN "employee_number" SET NOT NULL;
