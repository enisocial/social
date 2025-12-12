-- Security fix: Create RPC functions for admin operations and marketplace validation

-- 1. RPC for promoting user to admin
CREATE OR REPLACE FUNCTION promote_to_admin_rpc(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check admin authorization
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  -- Prevent self-promotion
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot promote yourself';
  END IF;
  
  -- Insert admin role
  INSERT INTO user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log action
  PERFORM log_admin_action('PROMOTE_TO_ADMIN', 'user', target_user_id, '{}'::jsonb);
END;
$$;

-- 2. RPC for deleting user
CREATE OR REPLACE FUNCTION delete_user_rpc(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check admin authorization
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  -- Prevent self-deletion
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;
  
  -- Log action first
  PERFORM log_admin_action('DELETE_USER', 'user', target_user_id, '{}'::jsonb);
  
  -- Delete profile (cascade will handle related data)
  DELETE FROM profiles WHERE id = target_user_id;
END;
$$;

-- 3. RPC for deleting post
CREATE OR REPLACE FUNCTION delete_post_rpc(target_post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check admin authorization
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  -- Log action first
  PERFORM log_admin_action('DELETE_POST', 'post', target_post_id, '{}'::jsonb);
  
  -- Delete post
  DELETE FROM posts WHERE id = target_post_id;
END;
$$;

-- 4. RPC for deleting comment
CREATE OR REPLACE FUNCTION delete_comment_rpc(target_comment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check admin authorization
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  -- Log action first
  PERFORM log_admin_action('DELETE_COMMENT', 'comment', target_comment_id, '{}'::jsonb);
  
  -- Delete comment
  DELETE FROM comments WHERE id = target_comment_id;
END;
$$;

-- 5. RPC for suspending user
CREATE OR REPLACE FUNCTION suspend_user_rpc(
  p_user_id UUID,
  p_reason TEXT,
  p_duration_days INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check admin authorization
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  -- Validate duration
  IF p_duration_days <= 0 OR p_duration_days > 365 THEN
    RAISE EXCEPTION 'Invalid suspension duration: must be between 1 and 365 days';
  END IF;
  
  -- Prevent self-suspension
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot suspend yourself';
  END IF;
  
  -- Update profile atomically
  UPDATE profiles
  SET 
    status = 'suspended',
    ban_reason = p_reason,
    ban_until = NOW() + (p_duration_days || ' days')::INTERVAL
  WHERE id = p_user_id;
  
  -- Log action
  PERFORM log_admin_action('SUSPEND_USER', 'user', p_user_id, 
    jsonb_build_object('reason', p_reason, 'days', p_duration_days));
END;
$$;

-- 6. RPC for creating validated marketplace order
CREATE OR REPLACE FUNCTION create_marketplace_order_rpc(
  p_product_id UUID,
  p_seller_id UUID,
  p_quantity INTEGER,
  p_total_price NUMERIC,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_price NUMERIC;
  v_expected_price NUMERIC;
  v_order_id UUID;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Validate quantity
  IF p_quantity <= 0 OR p_quantity > 1000 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 1000';
  END IF;
  
  -- Validate price is positive
  IF p_total_price <= 0 THEN
    RAISE EXCEPTION 'Price must be positive';
  END IF;
  
  -- Validate message length
  IF p_message IS NOT NULL AND length(p_message) > 1000 THEN
    RAISE EXCEPTION 'Message must be less than 1000 characters';
  END IF;
  
  -- Get product price and verify product exists
  SELECT price INTO v_product_price
  FROM marketplace_products
  WHERE id = p_product_id AND status = 'available';
  
  IF v_product_price IS NULL THEN
    RAISE EXCEPTION 'Product not found or not available';
  END IF;
  
  -- Verify price matches (allow 1 cent tolerance for rounding)
  v_expected_price := v_product_price * p_quantity;
  IF ABS(p_total_price - v_expected_price) > 0.01 THEN
    RAISE EXCEPTION 'Price mismatch: expected %, got %', v_expected_price, p_total_price;
  END IF;
  
  -- Create order
  INSERT INTO marketplace_orders (
    product_id,
    buyer_id,
    seller_id,
    quantity,
    total_price,
    message,
    status
  ) VALUES (
    p_product_id,
    auth.uid(),
    p_seller_id,
    p_quantity,
    p_total_price,
    p_message,
    'pending'
  )
  RETURNING id INTO v_order_id;
  
  RETURN v_order_id;
END;
$$;

-- 7. Add CHECK constraints to marketplace_orders
ALTER TABLE marketplace_orders
DROP CONSTRAINT IF EXISTS check_quantity_positive,
DROP CONSTRAINT IF EXISTS check_quantity_max,
DROP CONSTRAINT IF EXISTS check_price_positive,
DROP CONSTRAINT IF EXISTS check_message_length;

ALTER TABLE marketplace_orders
ADD CONSTRAINT check_quantity_positive CHECK (quantity > 0),
ADD CONSTRAINT check_quantity_max CHECK (quantity <= 1000),
ADD CONSTRAINT check_price_positive CHECK (total_price > 0),
ADD CONSTRAINT check_message_length CHECK (message IS NULL OR length(message) <= 1000);

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION promote_to_admin_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION delete_post_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION delete_comment_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION suspend_user_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION create_marketplace_order_rpc TO authenticated;