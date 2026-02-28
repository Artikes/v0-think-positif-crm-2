-- Add missing DELETE policy for profiles table
-- Only admins can delete profiles (other than their own)
CREATE POLICY "Admins can delete profiles" ON profiles
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
