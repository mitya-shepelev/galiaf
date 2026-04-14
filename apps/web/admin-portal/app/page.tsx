import { revalidatePath } from "next/cache";
import {
  ApiError,
  type AuditEventRecord,
  type MembershipRecord,
} from "@galiaf/sdk";
import {
  AdminActionsPanel,
  type AdminActionState,
} from "./admin-actions-panel";
import {
  areDevPersonasEnabled,
  resolveAdminAuth,
} from "./auth";

export const dynamic = "force-dynamic";

const adminSections = [
  "Управление организациями",
  "Глобальные настройки платформы",
  "Аудит действий и журнал событий",
  "Контроль доступности backend и chat сервисов",
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeOrganizationStatus(
  value: FormDataEntryValue | null,
): "active" | "suspended" {
  return value === "suspended" ? "suspended" : "active";
}

function countActiveMemberships(
  memberships: MembershipRecord[],
  organizationId: string,
): number {
  return memberships.filter(
    (membership) =>
      membership.organizationId === organizationId && membership.status === "active",
  ).length;
}

function formatAuditAction(action: AuditEventRecord["action"]): string {
  switch (action) {
    case "organization_created":
      return "Организация создана";
    case "organization_employee_provisioned":
      return "Сотрудник provisioned";
    case "invitation_created":
      return "Приглашение создано";
    case "invitation_revoked":
      return "Приглашение отозвано";
    case "invitation_accepted":
      return "Приглашение принято";
    case "membership_roles_updated":
      return "Роли membership обновлены";
    case "membership_revoked":
      return "Membership отозван";
    case "auth_context_switch_requested":
      return "Запрошено переключение auth context";
    case "admin_bootstrap_viewed":
      return "Просмотрен admin bootstrap";
    case "audit_events_viewed":
      return "Просмотрен audit log";
    default:
      return action;
  }
}

async function createOrganizationAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  "use server";

  if (!areDevPersonasEnabled()) {
    const auth = await resolveAdminAuth();

    if (auth.kind === "login-required") {
      return {
        status: "error",
        message: "Нужна активная OIDC-сессия. Выполни вход заново.",
      };
    }
  }

  const name = String(formData.get("name") ?? "").trim();
  const status = normalizeOrganizationStatus(formData.get("status"));

  if (!name) {
    return {
      status: "error",
      message: "Название организации обязательно.",
    };
  }

  try {
    const auth = await resolveAdminAuth();

    if (auth.kind === "login-required") {
      return {
        status: "error",
        message: "Нужна активная OIDC-сессия. Выполни вход заново.",
      };
    }

    await auth.api.createOrganization({
      name,
      status,
    });

    revalidatePath("/");

    return {
      status: "success",
      message: `Организация "${name}" создана.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось создать организацию.",
    };
  }
}

export default async function AdminPortalPage() {
  const auth = await resolveAdminAuth();

  if (auth.kind === "login-required") {
    return (
      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "72px 24px" }}>
        <p style={{ color: "var(--accent)", marginBottom: "12px" }}>
          Platform Admin
        </p>
        <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", margin: 0 }}>
          Нужен вход через OIDC.
        </h1>
        <article
          style={{
            marginTop: "24px",
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "24px",
            padding: "24px",
          }}
        >
          Для production окружения этот кабинет больше не использует demo persona.
          Перейди на реальный login flow и начни с авторизации через identity
          provider.
          <div style={{ marginTop: "18px" }}>
            <a href="/auth/login?returnTo=/" style={{ color: "var(--accent)" }}>
              Войти через OIDC
            </a>
          </div>
        </article>
      </main>
    );
  }

  try {
    const [
      health,
      session,
      bootstrap,
      organizations,
      users,
      memberships,
      adminProfile,
      auditEvents,
    ] = await Promise.all([
      auth.api.getHealth(),
      auth.api.getSession(),
      auth.api.getAdminBootstrap(),
      auth.api.listOrganizations(),
      auth.api.listUsers(),
      auth.api.listMemberships(),
      auth.api.getCurrentUser(),
      auth.api.listAuditEvents({ limit: 8 }),
    ]);
  const activeMemberships = memberships.filter(
    (membership) => membership.status === "active",
  );

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "72px 24px" }}>
      <p style={{ color: "var(--accent)", marginBottom: "12px" }}>
        Platform Admin
      </p>
      <h1 style={{ fontSize: "clamp(2.5rem, 7vw, 4.5rem)", margin: 0 }}>
        Единый центр управления платформой.
      </h1>
      <p style={{ marginTop: "14px" }}>
        Режим авторизации: {auth.kind === "dev" ? "dev persona" : "OIDC session"} ·{" "}
        <a href="/auth/logout" style={{ color: "var(--accent)" }}>
          выйти
        </a>
      </p>
      <section
        style={{
          marginTop: "28px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        {[
          `Организаций: ${organizations.length}`,
          `Пользователей: ${users.length}`,
          `Активных membership: ${activeMemberships.length}`,
          `Redis: ${health.redis} · PostgreSQL: ${health.database}`,
        ].map((item) => (
          <article
            key={item}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "20px",
              padding: "20px",
            }}
          >
            <p style={{ margin: 0 }}>{item}</p>
          </article>
        ))}
      </section>
      <AdminActionsPanel createOrganizationAction={createOrganizationAction} />
      <section
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "16px",
        }}
      >
        <article
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "24px",
            padding: "24px",
          }}
        >
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Платформенные зоны</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            {adminSections.map((section) => (
              <article
                key={section}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "18px",
                  padding: "16px",
                }}
              >
                {section}
              </article>
            ))}
          </div>
        </article>
        <article
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "24px",
            padding: "24px",
          }}
        >
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Текущая сессия</p>
          <p style={{ marginBottom: "8px" }}>{session.subject}</p>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>
            Роли: {session.effectiveRoles.join(", ")}
          </p>
          <p style={{ margin: "18px 0 8px" }}>
            Профиль: {adminProfile.user.fullName}
          </p>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>
            {adminProfile.user.email}
          </p>
          <p style={{ marginTop: "18px", marginBottom: "8px" }}>
            Разрешенные зоны: {bootstrap.allowedAreas.join(", ")}
          </p>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>
            Проверка сервиса: {formatDate(health.timestamp)}
          </p>
        </article>
      </section>
      <section
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        <article
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "24px",
            padding: "24px",
          }}
        >
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Организации</p>
          <div style={{ display: "grid", gap: "12px" }}>
            {organizations.length === 0 ? (
              <article
                style={{
                  border: "1px dashed var(--line)",
                  borderRadius: "16px",
                  padding: "16px",
                  color: "var(--muted)",
                }}
              >
                В платформе пока нет организаций. Можно создать первую через форму выше.
              </article>
            ) : null}
            {organizations.map((organization) => (
              <article
                key={organization.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div>
                  <strong>{organization.name}</strong>
                  <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                    {organization.id}
                  </p>
                  <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                    Активных назначений: {countActiveMemberships(memberships, organization.id)}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong>{organization.status}</strong>
                  <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                    {formatDate(organization.createdAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </article>
        <article
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "24px",
            padding: "24px",
          }}
        >
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Пользователи платформы
          </p>
          <div style={{ display: "grid", gap: "12px" }}>
            {users.length === 0 ? (
              <article
                style={{
                  border: "1px dashed var(--line)",
                  borderRadius: "16px",
                  padding: "16px",
                  color: "var(--muted)",
                }}
              >
                Пользователи еще не появились. Они будут видны после первого входа или provisioning.
              </article>
            ) : null}
            {users.map((user) => {
              const userMemberships = activeMemberships.filter(
                (membership) => membership.userId === user.id,
              );

              return (
                <article
                  key={user.id}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "16px",
                    padding: "14px",
                  }}
                >
                  <strong>{user.fullName}</strong>
                  <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>{user.email}</p>
                  <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                    Активных membership: {userMemberships.length}
                  </p>
                  <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                    Статус: {user.status}
                  </p>
                </article>
              );
            })}
          </div>
        </article>
      </section>
      <section
        style={{
          marginTop: "16px",
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: "24px",
          padding: "24px",
        }}
      >
        <p style={{ color: "var(--muted)", marginTop: 0 }}>Последние audit события</p>
        <div style={{ display: "grid", gap: "12px" }}>
          {auditEvents.length === 0 ? (
            <article
              style={{
                border: "1px dashed var(--line)",
                borderRadius: "16px",
                padding: "16px",
                color: "var(--muted)",
              }}
            >
              Audit trail пока пуст. События появятся после действий в админке, manager flow и переключения контекста.
            </article>
          ) : null}
          {auditEvents.map((event) => (
            <article
              key={event.id}
              style={{
                border: "1px solid var(--line)",
                borderRadius: "16px",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <strong>{formatAuditAction(event.action)}</strong>
                  <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                    {event.entityType}:{event.entityId}
                  </p>
                </div>
                <p style={{ margin: 0, color: "var(--muted)", textAlign: "right" }}>
                  {formatDate(event.createdAt)}
                </p>
              </div>
              <p style={{ margin: "10px 0 0", color: "var(--muted)" }}>
                Актор: {event.actorName ?? event.actorEmail ?? event.actorSubject}
              </p>
              <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                Роли: {event.actorRoles.join(", ") || "n/a"}
              </p>
              <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                Организация: {event.organizationId ?? "platform"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return (
        <main style={{ maxWidth: "960px", margin: "0 auto", padding: "72px 24px" }}>
          <p style={{ color: "var(--accent)", marginBottom: "12px" }}>
            Platform Admin
          </p>
          <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", margin: 0 }}>
            Сессия истекла или стала недействительной.
          </h1>
          <article
            style={{
              marginTop: "24px",
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "24px",
              padding: "24px",
            }}
          >
            API вернул `401`. Для безопасного production-потока кабинет не падает в
            demo persona, а просит повторную авторизацию.
            <div style={{ marginTop: "18px", display: "flex", gap: "16px" }}>
              <a href="/auth/login?returnTo=/" style={{ color: "var(--accent)" }}>
                Войти заново
              </a>
              <a href="/auth/logout" style={{ color: "var(--accent)" }}>
                Очистить сессию
              </a>
            </div>
          </article>
        </main>
      );
    }

    throw error;
  }
}
