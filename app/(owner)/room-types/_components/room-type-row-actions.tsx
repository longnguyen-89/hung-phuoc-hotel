"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { RoomTypeModal } from "./room-type-modal";

type RoomType = {
  id: string;
  code: string;
  name: string;
  price_per_day: number;
  price_per_hour: number;
  price_overnight: number;
  capacity: number;
  max_capacity: number;
  description: string | null;
  business_status: "active" | "inactive" | "selling_service";
};

export function RoomTypeRowActions({ type }: { type: RoomType }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Xoá hạng phòng "${type.name}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/room-types/${type.id}`, { method: "DELETE" });
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
        <RoomTypeModal
          mode="edit"
          initial={type}
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
