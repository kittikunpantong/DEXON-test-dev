"use client";

import { cloneElement, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";

import { createLine, deleteLine, updateLine } from "@/app/actions";
import { LineForm, type LineDefaults } from "@/components/forms";
import { buttonCompactDanger, buttonCompactPrimary, buttonDanger, buttonPrimary, buttonSecondary } from "@/components/ui";

type DialogChildProps = {
  onCancel?: () => void;
  variant?: "inline" | "dialog";
};

export function Modal({
  open,
  title,
  kicker,
  description,
  size = "md",
  tone = "default",
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  kicker?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "danger";
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable =
      panelRef.current?.querySelector<HTMLElement>("input, textarea, select") ??
      panelRef.current?.querySelector<HTMLElement>("button");
    focusable?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="modal-root">
      <div className={`modal-panel ${size} ${tone === "danger" ? "danger" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panelRef}>
        <div className="modal-head">
          <div>
            {kicker ? <p className="modal-kicker">{kicker}</p> : null}
            <h2 id={titleId}>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>,
    document.body,
  );
}

export function FormModal({
  label,
  className,
  kicker,
  title,
  description,
  size = "md",
  children,
}: {
  label: string;
  className: string;
  kicker?: string;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  children: ReactElement<DialogChildProps>;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <Modal open={open} kicker={kicker} title={title} description={description} size={size} onClose={close}>
        {open ? cloneElement(children, { onCancel: close, variant: "dialog" }) : null}
      </Modal>
    </>
  );
}

export function DeleteButton({
  action,
  label,
  title,
  message,
  className,
}: {
  action: () => Promise<void>;
  label: string;
  title: string;
  message: string;
  className: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <Modal open={open} tone="danger" size="sm" kicker="Confirm delete" title={title} description={message} onClose={() => setOpen(false)}>
        <form action={action} className="flex flex-wrap gap-3">
          <ConfirmDelete />
          <button type="button" className={buttonSecondary} onClick={() => setOpen(false)}>
            Cancel
          </button>
        </form>
      </Modal>
    </>
  );
}

function ConfirmDelete() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={buttonDanger} disabled={pending}>
      {pending ? "Deleting" : "Confirm delete"}
    </button>
  );
}

export function ClickIsolate({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex flex-wrap justify-end gap-2 ${className}`} onClick={(event) => event.stopPropagation()}>
      {children}
    </span>
  );
}

export function AddLineButton({ label = "Add line", className = buttonPrimary }: { label?: string; className?: string }) {
  return (
    <FormModal
      label={label}
      className={className}
      kicker="New line"
      title="Add line"
      description="Thickness, corrosion rate, and remaining life are calculated after save. Do not enter them by hand."
      size="lg"
    >
      <LineForm action={createLine} submitLabel="Save line" />
    </FormModal>
  );
}

export function LineInfoButton({
  record,
  facts,
  className,
  label = "Line data",
}: {
  record: LineDefaults;
  facts: Array<{ label: string; value: string }>;
  className: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  function close() {
    setOpen(false);
    setEditing(false);
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <Modal
        open={open}
        size="lg"
        kicker="Line data"
        title={editing ? "Edit line" : record.lineNumber}
        description={
          editing
            ? "Changing the line number also updates its CMLs, test points, and thickness history"
            : "Corrosion allowance is stored, and is not added into required thickness"
        }
        onClose={editing ? () => setEditing(false) : close}
      >
        {editing ? (
          <LineForm
            action={updateLine.bind(null, record.lineNumber)}
            defaults={record}
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            variant="dialog"
          />
        ) : (
          <div className="grid gap-4">
            <dl className="grid gap-px bg-[var(--hairline)] sm:grid-cols-2">
              {facts.map((fact) => (
                <div key={fact.label} className="bg-white px-4 py-3">
                  <dt className="text-[11px] font-bold tracking-[0.8px] text-[var(--muted)] uppercase">{fact.label}</dt>
                  <dd className="mt-1 text-sm font-light text-[var(--ink)]">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={buttonCompactPrimary} onClick={() => setEditing(true)}>
                Edit
              </button>
              <DeleteButton
                action={deleteLine.bind(null, record.lineNumber)}
                label="Delete line"
                className={buttonCompactDanger}
                title={`Delete line ${record.lineNumber}`}
                message="CMLs, test points, and thickness history on this line will also be deleted. This cannot be undone."
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export function EditLineButton({ record, className = buttonPrimary }: { record: LineDefaults; className?: string }) {
  return (
    <FormModal
      label="Edit line"
      className={className}
      kicker="Edit line"
      title={record.lineNumber}
      description="Changing the line number also updates its CMLs, test points, and thickness history"
      size="lg"
    >
      <LineForm action={updateLine.bind(null, record.lineNumber)} defaults={record} submitLabel="Save changes" />
    </FormModal>
  );
}
