"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { RoomModal, RoomTypeOption } from "./room-modal";

export function NewRoomButton({ roomTypes }: { roomTypes: RoomTypeOption[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="w-4 h-4" />
        Thêm phòng
      </button>
      {open && (
        <RoomModal
          mode="create"
          roomTypes={roomTypes}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
