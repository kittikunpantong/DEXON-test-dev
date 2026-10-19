"use client";

import { useActionState } from "react";
import type { ActionState } from "@/server/actions";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({
  action,
  submitLabel,
  children,
  className,
}: {
  action: Action;
  submitLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className={className}>
      {children}
      {state.error ? <p className="form-error">{state.error}</p> : null}
      <div className="actions" style={{ marginTop: 24 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving" : submitLabel}
        </button>
      </div>
    </form>
  );
}
