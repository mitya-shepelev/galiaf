"use client";

import { useActionState } from "react";

export interface ManagerActionState {
  status: "idle" | "success" | "error";
  message: string;
}

interface ManagerActionsPanelProps {
  organizationId: string;
  createInvitationAction: (
    state: ManagerActionState,
    formData: FormData,
  ) => Promise<ManagerActionState>;
  createEmployeeAction: (
    state: ManagerActionState,
    formData: FormData,
  ) => Promise<ManagerActionState>;
}

const initialState: ManagerActionState = {
  status: "idle",
  message: "",
};

function renderStatus(state: ManagerActionState) {
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

export function ManagerActionsPanel({
  organizationId,
  createInvitationAction,
  createEmployeeAction,
}: ManagerActionsPanelProps) {
  const [inviteState, inviteFormAction, invitePending] = useActionState(
    createInvitationAction,
    initialState,
  );
  const [employeeState, employeeFormAction, employeePending] = useActionState(
    createEmployeeAction,
    initialState,
  );

  return (
    <section
      style={{
        marginTop: "16px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "16px",
      }}
    >
      <article
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: "20px",
          padding: "22px",
        }}
      >
        <p style={{ color: "var(--muted)", marginTop: 0 }}>Пригласить сотрудника</p>
        <form action={inviteFormAction} style={{ display: "grid", gap: "12px" }}>
          <input type="hidden" name="organizationId" value={organizationId} />
          <input
            aria-label="Email приглашения"
            name="email"
            placeholder="employee@galiaf.local"
            required
            style={fieldStyle()}
            type="email"
          />
          <input
            aria-label="Имя приглашенного"
            name="targetName"
            placeholder="Имя сотрудника"
            style={fieldStyle()}
            type="text"
          />
          <select
            aria-label="Роль приглашения"
            defaultValue="employee"
            name="role"
            style={fieldStyle()}
          >
            <option value="employee">employee</option>
            <option value="company_manager">company_manager</option>
          </select>
          <button disabled={invitePending} style={submitStyle(invitePending)} type="submit">
            {invitePending ? "Создаем приглашение..." : "Создать приглашение"}
          </button>
        </form>
        {renderStatus(inviteState)}
      </article>
      <article
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: "20px",
          padding: "22px",
        }}
      >
        <p style={{ color: "var(--muted)", marginTop: 0 }}>Добавить сотрудника сразу</p>
        <form action={employeeFormAction} style={{ display: "grid", gap: "12px" }}>
          <input type="hidden" name="organizationId" value={organizationId} />
          <input
            aria-label="Email сотрудника"
            name="email"
            placeholder="new.employee@galiaf.local"
            required
            style={fieldStyle()}
            type="email"
          />
          <input
            aria-label="Полное имя сотрудника"
            name="fullName"
            placeholder="Полное имя"
            required
            style={fieldStyle()}
            type="text"
          />
          <select
            aria-label="Роль сотрудника"
            defaultValue="employee"
            name="role"
            style={fieldStyle()}
          >
            <option value="employee">employee</option>
            <option value="company_manager">company_manager</option>
          </select>
          <button
            disabled={employeePending}
            style={submitStyle(employeePending)}
            type="submit"
          >
            {employeePending ? "Выдаем доступ..." : "Создать сотрудника"}
          </button>
        </form>
        {renderStatus(employeeState)}
      </article>
    </section>
  );
}
