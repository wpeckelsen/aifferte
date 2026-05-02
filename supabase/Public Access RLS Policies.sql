drop policy if exists "allow_all_for_secret_key" on processed_emails;
drop policy if exists "workspace_select" on processed_emails;

drop policy if exists "allow_all_for_secret_key" on email_processing_snapshots;
drop policy if exists "workspace_select" on email_processing_snapshots;

drop policy if exists "allow_all_for_secret_key" on email_processing_events;
drop policy if exists "workspace_select" on email_processing_events;

drop policy if exists "allow_all_for_secret_key" on knowledge_chunks;
drop policy if exists "workspace_select" on knowledge_chunks;

create policy "workspace_select" on processed_emails
  for select to authenticated
  using (workspace_id = auth.uid()::text);

create policy "workspace_select" on email_processing_snapshots
  for select to authenticated
  using (workspace_id = auth.uid()::text);

create policy "workspace_select" on email_processing_events
  for select to authenticated
  using (workspace_id = auth.uid()::text);

create policy "workspace_select" on knowledge_chunks
  for select to authenticated
  using (workspace_id = auth.uid()::text);