import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import './workspace-dialog.css';

type Props = { title: string; onDismiss: () => void; children: ReactNode };

export default function WorkspaceDialog({ title, onDismiss, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    headingRef.current?.focus();
    return () => {
      dialog.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog className="dialog" ref={dialogRef} aria-labelledby="workspace-dialog-heading"
      onCancel={event => { event.preventDefault(); onDismiss(); }}>
      <button className="close" type="button" onClick={onDismiss} aria-label="Close"><X /></button>
      <h2 id="workspace-dialog-heading" ref={headingRef} tabIndex={-1}>{title}</h2>
      {children}
    </dialog>
  );
}
