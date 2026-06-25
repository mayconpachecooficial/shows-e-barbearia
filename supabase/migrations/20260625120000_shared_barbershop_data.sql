create policy "Public shared clients" on public.clients
  for all
  to anon
  using (user_id is null)
  with check (user_id is null);

create policy "Public shared barbers" on public.barbers
  for all
  to anon
  using (user_id is null)
  with check (user_id is null);

create policy "Public shared service records" on public.service_records
  for all
  to anon
  using (user_id is null)
  with check (user_id is null);

create policy "Public shared expenses" on public.expenses
  for all
  to anon
  using (user_id is null)
  with check (user_id is null);

create policy "Public shared products" on public.products
  for all
  to anon
  using (user_id is null)
  with check (user_id is null);

create policy "Public shared product sales" on public.product_sales
  for all
  to anon
  using (user_id is null)
  with check (user_id is null);

create policy "Public shared appointments" on public.appointments
  for all
  to anon
  using (user_id is null)
  with check (user_id is null);
