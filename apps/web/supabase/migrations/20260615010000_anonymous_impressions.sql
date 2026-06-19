-- Allow anonymous extension users to record impressions.
-- user_id was typed as UUID with a foreign key to auth.users,
-- but Prism extension generates anonymous identifiers that are
-- not Supabase auth users. Change the column to TEXT, drop the
-- foreign key constraint, and remove any RLS policies that depend
-- on the column type while keeping the not-null rule.

DROP POLICY IF EXISTS "Users can view own impressions" ON public.impressions;
DROP POLICY IF EXISTS "Users can insert own impressions" ON public.impressions;

ALTER TABLE public.impressions
  DROP CONSTRAINT IF EXISTS impressions_user_id_fkey;

ALTER TABLE public.impressions
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
