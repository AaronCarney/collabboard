import { toast } from "sonner";

export type ToastType = "success" | "error" | "info" | "warning";

export function showToast(message: string, type: ToastType = "info"): void {
  switch (type) {
    case "success":
      toast.success(message);
      break;
    case "error":
      toast.error(message);
      break;
    case "warning":
      toast.warning(message);
      break;
    case "info":
    default:
      toast.info(message);
      break;
  }
}

export function showActionToast(
  message: string,
  action: { label: string; onClick: () => void }
): void {
  toast(message, { action });
}
