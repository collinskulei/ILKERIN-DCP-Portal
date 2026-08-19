-- Auto-recalculate an application's completion_pct whenever its documents change,
-- and a read-optimized view the dashboard queries for the board/list views.

create function recalc_application_completion() returns trigger as $$
declare
  target_application_id uuid;
  total_count int;
  verified_count int;
begin
  target_application_id := coalesce(new.application_id, old.application_id);

  select count(*), count(*) filter (where status = 'verified')
    into total_count, verified_count
    from documents
    where application_id = target_application_id;

  update applications
    set completion_pct = case
      when total_count = 0 then 0
      else round(100.0 * verified_count / total_count)
    end
    where id = target_application_id;

  return null;
end;
$$ language plpgsql;

create trigger documents_recalc_completion
  after insert or delete or update of status on documents
  for each row execute function recalc_application_completion();

-- Board/list view: one row per application with client info and the counts
-- needed for progress + "necessary notifications" (overdue tasks, expiring
-- documents, unresolved CBK queries) without the frontend having to run
-- several queries per card.
create view application_board with (security_invoker = true) as
select
  a.id as application_id,
  a.client_id,
  a.stage,
  a.status as application_status,
  a.completion_pct,
  a.updated_at,
  c.company_name,
  c.case_manager_id,
  p.full_name as case_manager_name,
  count(d.id) as total_items,
  count(d.id) filter (where d.status = 'verified') as verified_items,
  count(d.id) filter (where d.status = 'missing') as missing_items,
  count(d.id) filter (where d.status = 'received') as pending_review_items,
  count(d.id) filter (
    where d.expiry_date is not null
      and d.expiry_date <= current_date + interval '14 days'
      and d.status <> 'expired'
  ) as expiring_soon_items,
  count(t.id) filter (where t.status = 'open') as open_tasks,
  count(t.id) filter (where t.status = 'open' and t.due_date < current_date) as overdue_tasks,
  count(cc.id) filter (where cc.response_status <> 'responded') as pending_cbk_queries
from applications a
join clients c on c.id = a.client_id
left join profiles p on p.id = c.case_manager_id
left join documents d on d.application_id = a.id
left join tasks t on t.application_id = a.id
left join cbk_correspondence cc on cc.application_id = a.id
group by a.id, a.client_id, a.stage, a.status, a.completion_pct, a.updated_at,
  c.company_name, c.case_manager_id, p.full_name;
