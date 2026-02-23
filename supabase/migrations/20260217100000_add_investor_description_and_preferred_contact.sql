-- Add description and preferred_contact_method columns to investors.
-- These are used by the investor profile page for self-service updates.

alter table public.investors
  add column if not exists description text,
  add column if not exists preferred_contact_method text;

comment on column public.investors.description is 'About you / investment objectives (investor-editable)';
comment on column public.investors.preferred_contact_method is 'Preferred contact: email, phone, whatsapp';
