"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { RoomModal, RoomTypeOption, RoomInitial } from "./room-modal";

export function RoomRowActions({
  room,
  roomTypes,
}: {
  room: RoomInitial;
  roomTypes: RoomTypeOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Xoá phòng "${room.name}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        alert(body.error ?? "Xoá thất bại");
        return;
      }
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex gap-1 justify-end">
        <button
          onClick={() => setEditing(true)}
          className="btn-ghost p-1.5"
          title="Sửa"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn-ghost p-1.5 text-red-600 hover:bg-red-50"
          title="Xoá"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {editing && (
        <RoomModal
          mode="edit"
          initial={room}
          roomTypes={roomTypes}
          onClose={() => setEditing(false)}
          onDone={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
