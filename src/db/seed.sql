INSERT INTO participants (telex_user_id, full_name, email, program_name, completion_date)
VALUES ('telex-user-123', 'Jane Developer', 'jane.dev@example.com', 'Telex Bootcamp', '2025-10-01')
ON CONFLICT (telex_user_id) DO NOTHING;
