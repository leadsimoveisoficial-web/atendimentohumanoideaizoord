DROP POLICY "Kitchen screen reads orders" ON public.orders;
DROP POLICY "Kitchen screen updates status" ON public.orders;
CREATE POLICY "Kitchen admins read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Kitchen admins update status" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin') AND status IN ('novo','preparando','pronto','entregue'));
