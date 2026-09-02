-- ExpAlyze PostgreSQL Supabase Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. BANK ACCOUNTS
create table if not exists bank_accounts (
    id uuid default gen_random_uuid() primary key,
    account_number text not null,
    bank_name text not null,
    balance numeric(15, 2) default 0.00 not null,
    user_id uuid references auth.users(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for bank_accounts
alter table bank_accounts enable row level security;

create policy "bank_accounts_all"
    on bank_accounts for all
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);


-- 2. TRANSACTIONS
create table if not exists transactions (
    id uuid default gen_random_uuid() primary key,
    account_id uuid references bank_accounts(id) on delete cascade not null,
    transaction_date date not null,
    raw_narration text not null,
    reference_no text,
    withdrawal_dr numeric(15, 2) default 0.00 not null,
    deposit_cr numeric(15, 2) default 0.00 not null,
    balance numeric(15, 2),
    payment_rail text not null,
    clean_entity text not null,
    revenue_stream text not null,
    flow_type text not null,
    is_pass_through boolean default false not null,
    is_settled boolean default false not null,
    custom_tag text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Unique constraint on non-nullable columns to prevent duplicate transactions on multiple uploads
    constraint uniq_txn unique (account_id, transaction_date, raw_narration, withdrawal_dr, deposit_cr)
);

-- Enable RLS for transactions
alter table transactions enable row level security;

create policy "transactions_all"
    on transactions for all
    to authenticated
    using (
        exists (
            select 1 from bank_accounts 
            where bank_accounts.id = transactions.account_id 
            and bank_accounts.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from bank_accounts 
            where bank_accounts.id = transactions.account_id 
            and bank_accounts.user_id = auth.uid()
        )
    );


-- 3. USER ENTITY RULES
create table if not exists user_entity_rules (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    pattern text not null,
    clean_entity text not null,
    revenue_stream text not null,
    flow_type text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for user_entity_rules
alter table user_entity_rules enable row level security;

create policy "user_rules_all"
    on user_entity_rules for all
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Indexes for query optimization
create index if not exists idx_transactions_account_id on transactions(account_id);
create index if not exists idx_transactions_date on transactions(transaction_date);
create index if not exists idx_transactions_clean_entity on transactions(clean_entity);
create index if not exists idx_transactions_is_pass_through on transactions(is_pass_through);
