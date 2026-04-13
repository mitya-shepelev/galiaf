"use client";

import { useActionState } from "react";

export interface AdminActionState {
  status: "idle" | "success" | "error";
  message: string;
}

interface AdminActionsPanelProps {
  createOrganizationAction: (
    state: AdminActionState,
    formData: FormData,
  ) => Promise<AdminActionState>;
}

const initialState: AdminActionState = {
  status: "idle",
  message: "",
};

function renderStatus(state: AdminActionState) {
  if (state.status === "idle" || state.message.length === 0) {
    return null;
  }

  return (
    <p
      style={{
        margin: "12px 0 0",
        color: state.status === "success" ? "var(--accent)" : "#b04444",
      }}
    >
      {state.message}
    </p>
  );
}

function fieldStyle() {
  return {
    width: "100%",
    borderRadius: "12px",
    border: "1px solid var(--line)",
    padding: "12px 14px",
    background: "rgba(255, 255, 255, 0.92)",
    color: "var(--text)",
  } as const;
}

function submitStyle(disabled: boolean) {
  return {
    border: "none",
    borderRadius: "999px",
    padding: "12px 18px",
    background: disabled ? "rgba(12, 143, 103, 0.35)" : "var(--accent)",
    color: "#ffffff",
    fontWeight: 600,
    cursor: disabled ? "wait" : "pointer",
  } as const;
}

export function AdminActionsPanel({
  createOrganizationAction,
}: AdminActionsPanelProps) {
  const [state, formAction, pending] = useActionState(
    createOrganizationAction,
    initialState,
  );

  return (
    <section
      style={{
        marginTop: "16px",
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: "24px",
        padding: "24px",
      }}
    >
      <p style={{ color: "var(--muted)", marginTop: 0 }}>Добавить организацию</p>
      <form
        action={formAction}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 1fr) 180px auto",
          gap: "12px",
          alignItems: "center",
        }}
      >
        <input
          aria-label="Название организации"
          name="name"
          placeholder="Новая организация"
          required
          style={fieldStyle()}
          type="text"
        />
        <select
          aria-label="Статус организации"
          defaultValue="active"
          name="status"
          style={fieldStyle()}
        >
          <option value="active">active</option>
          <option value="suspended">suspended</option>
        </select>
        <button disabled={pending} style={submitStyle(pending)} type="submit">
          {pending ? "Создаем..." : "Создать организацию"}
        </button>
      </form>
      {renderStatus(state)}
    </section>
  );
}
