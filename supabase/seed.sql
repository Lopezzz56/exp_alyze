-- Seed script for ExpAlyze
-- Run this in the Supabase SQL editor after creating a user in the UI.

DO $$
DECLARE
    target_user_id UUID;
    mock_account_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    -- Try to find the first user in the auth.users table
    SELECT id INTO target_user_id FROM auth.users LIMIT 1;
    
    -- If no user exists, notify and exit
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'No user found in auth.users. Please sign up a user in the UI first, then run this seed script.';
        RETURN;
    END IF;
    
    -- Delete existing data for that user to avoid duplicate key violations
    DELETE FROM transactions WHERE account_id IN (SELECT id FROM bank_accounts WHERE user_id = target_user_id);
    DELETE FROM bank_accounts WHERE user_id = target_user_id;

    -- Insert mock bank account
    INSERT INTO bank_accounts (id, account_number, bank_name, balance, user_id)
    VALUES (mock_account_id, '9190100910001', 'Kotak Mahindra Bank', 610700.00, target_user_id);

    -- Insert realistic Indian IFA credits & debits (credits from AMCs/Insurers, debits as Pass-Through)
    INSERT INTO transactions (account_id, transaction_date, raw_narration, reference_no, withdrawal_dr, deposit_cr, balance, payment_rail, clean_entity, revenue_stream, flow_type, is_pass_through, is_settled)
    VALUES
    (mock_account_id, '2026-07-02', 'ACH-DR-LIC OF INDIA-58849', 'TXN50012', 75000.00, 0.00, 100000.00, 'NACH', 'Life Insurance Corporation', 'Life Insurance', 'PASS_THROUGH_TRANSIT', true, false),
    (mock_account_id, '2026-07-05', 'NEFT-SBIMF-COMMISSION-JUL', 'TXN50013', 0.00, 125000.00, 225000.00, 'NEFT', 'SBI Mutual Fund', 'Mutual Funds', 'BUSINESS_INCOME', false, false),
    (mock_account_id, '2026-07-07', 'UPI/314159/PAY-TO-LIC/REF-90', 'TXN50014', 15000.00, 0.00, 210000.00, 'UPI', 'Life Insurance Corporation', 'Life Insurance', 'PASS_THROUGH_TRANSIT', true, false),
    (mock_account_id, '2026-07-10', 'IMPS-ADITYA BIRLA SUN LIFE-COMM', 'TXN50015', 0.00, 45000.00, 255000.00, 'IMPS', 'Aditya Birla Sun Life AMC', 'Mutual Funds', 'BUSINESS_INCOME', false, false),
    (mock_account_id, '2026-07-12', 'UPI-FRANK-AVEL-KOTAK811-TRANSFER', 'TXN50016', 20000.00, 0.00, 235000.00, 'UPI', 'Internal Transfer', 'Internal Transfer', 'INTERNAL_TRANSFER', false, false),
    (mock_account_id, '2026-07-15', 'NEFT-PRUDENT CORP-DISTRIBUTION', 'TXN50017', 0.00, 310000.00, 545000.00, 'NEFT', 'Prudent Corporate Advisory', 'Mutual Funds', 'BUSINESS_INCOME', false, false),
    (mock_account_id, '2026-07-18', 'ACH-DR-LIC OF INDIA-61102', 'TXN50018', 25000.00, 0.00, 520000.00, 'NACH', 'Life Insurance Corporation', 'Life Insurance', 'PASS_THROUGH_TRANSIT', true, false),
    (mock_account_id, '2026-07-20', 'UPI-STAR HEALTH-COMMISSION', 'TXN50019', 0.00, 18500.00, 538500.00, 'UPI', 'Star Health Insurance', 'General Insurance', 'BUSINESS_INCOME', false, false),
    (mock_account_id, '2026-07-22', 'NEFT-NJ INDIA INVEST-SUB-BROKER', 'TXN50020', 0.00, 68000.00, 606500.00, 'NEFT', 'NJ India Invest Pvt Ltd', 'Sub-Brokerage', 'BUSINESS_INCOME', false, false),
    (mock_account_id, '2026-07-25', 'IMPS-UPSTOX-BROKERAGE-REF', 'TXN50021', 0.00, 14200.00, 620700.00, 'IMPS', 'Upstox / RKSV Securities', 'Equity Brokerage', 'BUSINESS_INCOME', false, false),
    (mock_account_id, '2026-07-28', 'UPI-FRANK-ATM-WITHDRAWAL', 'TXN50022', 10000.00, 0.00, 610700.00, 'ATM', 'ATM Withdrawal', 'General Outflow', 'PERSONAL_EXPENSE', false, false);

    RAISE NOTICE 'Seed completed successfully for user ID: %', target_user_id;
END $$;
