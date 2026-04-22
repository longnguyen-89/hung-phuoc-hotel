import { cn } from "@/lib/utils/cn";
import { RoomStatus, TaskStatus, TaskPriority, BookingStatus } from "@/lib/types";

const taskColors: Record<TaskStatus, string> = {
  pending: "bg-slate-100 text-slate-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-800",
  pending_review: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const taskLabels: Record<TaskStatus, string> = {
  pending: "Chờ gán",
  assigned: "Đã gán",
  in_progress: "Đang dọn",
  pending_review: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã huỷ",
};

const roomColors: Record<RoomStatus, string> = {
  available: "bg-green-100 text-green-700",
  occupied: "bg-blue-100 text-blue-700",
  cleaning: "bg-yellow-100 text-yellow-800",
  dirty: "bg-red-100 text-red-700",
  maintenance: "bg-slate-100 text-slate-600",
};

const roomLabels: Record<RoomStatus, string> = {
  available: "Sẵn sàng",
  occupied: "Có khách",
  cleaning: "Đang dọn",
  dirty: "Cần dọn",
  maintenance: "Bảo trì",
};

const priorityColors: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-800 pulse-red",
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Thấp",
  normal: "Thường",
  high: "Cao",
  critical: "KHẨN",
};

const bookingColors: Record<BookingStatus, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  checked_in: "bg-green-100 text-green-700",
  checked_out: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};

const bookingLabels: Record<BookingStatus, string> = {
  upcoming: "Sắp tới",
  checked_in: "Đang ở",
  checked_out: "Đã ra",
  cancelled: "Đã huỷ",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <span className={cn("badge", taskColors[status])}>{taskLabels[status]}</span>;
}

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  return <span className={cn("badge", roomColors[status])}>{roomLabels[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={cn("badge", priorityColors[priority])}>{priorityLabels[priority]}</span>
  );
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={cn("badge", bookingColors[status])}>{bookingLabels[status]}</span>
  );
}
