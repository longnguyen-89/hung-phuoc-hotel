-- Keep the new split room statuses aligned with legacy flows that still write rooms.status.
create or replace function public.fn_sync_room_legacy_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.occupancy_status := case new.status::text
      when 'occupied' then 'occupied'::room_occupancy_status
      when 'maintenance' then 'out_of_order'::room_occupancy_status
      else 'vacant'::room_occupancy_status
    end;

    new.housekeeping_status := case new.status::text
      when 'dirty' then 'dirty'::room_housekeeping_status
      when 'cleaning' then 'cleaning'::room_housekeeping_status
      when 'maintenance' then 'maintenance'::room_housekeeping_status
      else 'clean'::room_housekeeping_status
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_rooms_sync_legacy_status on public.rooms;
create trigger trg_rooms_sync_legacy_status
before insert or update of status on public.rooms
for each row
execute function public.fn_sync_room_legacy_status();

update public.rooms
set
  occupancy_status = case status::text
    when 'occupied' then 'occupied'::room_occupancy_status
    when 'maintenance' then 'out_of_order'::room_occupancy_status
    else 'vacant'::room_occupancy_status
  end,
  housekeeping_status = case status::text
    when 'dirty' then 'dirty'::room_housekeeping_status
    when 'cleaning' then 'cleaning'::room_housekeeping_status
    when 'maintenance' then 'maintenance'::room_housekeeping_status
    else 'clean'::room_housekeeping_status
  end;
