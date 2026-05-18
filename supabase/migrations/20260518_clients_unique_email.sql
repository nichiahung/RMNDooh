-- Enforce unique contact_email on clients table
ALTER TABLE clients
  ADD CONSTRAINT clients_contact_email_unique UNIQUE (contact_email);
