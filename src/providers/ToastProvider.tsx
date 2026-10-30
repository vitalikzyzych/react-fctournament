import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";

import { Toast } from "primereact/toast";

type Severity = "success" | "info" | "warn" | "error";

interface IToastApi {
  show: (severity: Severity, summary: string, detail?: string) => void;
}

const ToastContext = createContext<IToastApi | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const toast = useRef<Toast>(null);

  const show = useCallback(
    (severity: Severity, summary: string, detail?: string) => {
      toast.current?.show({
        severity,
        summary,
        detail,
        life: severity === "error" ? 6000 : 2000,
      });
    },
    []
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      <Toast ref={toast} position="bottom-center" />
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): IToastApi => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
};
