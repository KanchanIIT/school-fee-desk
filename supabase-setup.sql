create table if not exists public.students (
  id text primary key, user_id uuid not null default auth.uid(), "admissionNo" text, name text not null, "className" text not null,
  "parentName" text, phone text, "monthlyFee" numeric default 0, active boolean default true, "createdAt" timestamptz, "updatedAt" timestamptz
);
create table if not exists public.payments (
  id text primary key, user_id uuid not null default auth.uid(), "studentId" text not null, "className" text not null, "receiptNo" text not null,
  "paymentDate" date not null, "feeType" text not null, "feeMonth" text, amount numeric not null, method text, "referenceNo" text, "createdAt" timestamptz
);
alter table public.students enable row level security;
alter table public.payments enable row level security;
drop policy if exists students_owner on public.students;
create policy students_owner on public.students for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists payments_owner on public.payments;
create policy payments_owner on public.payments for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
insert into storage.buckets (id,name,public) values ('invoices','invoices',true) on conflict (id) do update set public=true;
drop policy if exists invoice_upload on storage.objects;
create policy invoice_upload on storage.objects for insert to authenticated with check (bucket_id='invoices' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists invoice_update on storage.objects;
create policy invoice_update on storage.objects for update to authenticated using (bucket_id='invoices' and (storage.foldername(name))[1]=auth.uid()::text);