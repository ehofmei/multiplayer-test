import { createPortal } from "react-dom";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";

/** Native dialogs provide focus containment, Escape, and return focus to the opener. */
export function AppPanel({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const modal = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const dialog = modal.current!;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [open]);
  return createPortal(
    <dialog
      ref={modal}
      className="app-panel"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button className="quiet" autoFocus onClick={onClose}>
          Close
        </button>
      </header>
      <div className="panel-content">{children}</div>
    </dialog>,
    document.body,
  );
}

export function GameHelp({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="quiet game-help-button" onClick={() => setOpen(true)}>
        Controls & help
      </button>
      <AppPanel
        title="Controls & help"
        open={open}
        onClose={() => setOpen(false)}
      >
        {children}
      </AppPanel>
    </>
  );
}

/** Container units fit the court immediately, including during rotation and text changes. */
export function GameSurface({
  children,
  ratio = 1,
}: {
  children: ReactNode;
  ratio?: number;
}) {
  return (
    <div
      className="game-surface"
      style={{ "--surface-ratio": ratio } as CSSProperties}
    >
      <div className="surface-fit">{children}</div>
    </div>
  );
}
