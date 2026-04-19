create policy "allow_all_for_secret_key" on processed_emails
  for all using (true) with check (true);

create policy "allow_all_for_secret_key" on email_processing_snapshots
  for all using (true) with check (true);

create policy "allow_all_for_secret_key" on email_processing_events
  for all using (true) with check (true);

create policy "allow_all_for_secret_key" on knowledge_chunks
  for all using (true) with check (true);