do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'investor_thesis_return_style'
  ) then
    create type public.investor_thesis_return_style as enum ('income', 'appreciation', 'balanced');
  end if;
end
$$;

alter table public.investors
  add column if not exists thesis_return_style public.investor_thesis_return_style,
  add column if not exists thesis_hold_period text,
  add column if not exists thesis_preferred_exits text[],
  add column if not exists thesis_notes text;
