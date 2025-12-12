DELETE FROM messages WHERE content LIKE 'Test message%';
DELETE FROM notifications WHERE type = 'friend_request' AND metadata->>'test' = 'true';
DELETE FROM friend_requests WHERE status = 'pending' AND created_at > now() - interval '1 hour';

DO $$
DECLARE
    current_user_id uuid;
    existing_users uuid[];
    selected_user uuid;
    conv_id uuid;
BEGIN
    SELECT id INTO current_user_id FROM profiles LIMIT 1;

    SELECT array_agg(id) INTO existing_users
    FROM profiles
    WHERE id != current_user_id
    LIMIT 5;

    IF array_length(existing_users, 1) >= 3 THEN
        FOREACH selected_user IN ARRAY existing_users[1:3] LOOP
            INSERT INTO conversations (type) VALUES ('dm') RETURNING id INTO conv_id;

            INSERT INTO conversation_participants (conversation_id, user_id) VALUES
            (conv_id, current_user_id),
            (conv_id, selected_user);

            INSERT INTO messages (conversation_id, sender_id, content, read) VALUES
            (conv_id, selected_user, 'Test 1', false),
            (conv_id, selected_user, 'Test 2', false),
            (conv_id, selected_user, 'Test 3', false),
            (conv_id, selected_user, 'Test 4', false);
        END LOOP;

        INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES
        (existing_users[1], current_user_id, 'pending'),
        (existing_users[2], current_user_id, 'pending');

        INSERT INTO notifications (user_id, type, metadata, read) VALUES
        (current_user_id, 'friend_request', jsonb_build_object('follower_id', existing_users[1], 'test', 'true'), false),
        (current_user_id, 'friend_request', jsonb_build_object('follower_id', existing_users[2], 'test', 'true'), false);
    END IF;
END $$;
