import { revalidatePath } from "next/cache";
import {
  ApiClient,
  createDevAuthHeaders,
  demoAuthContexts,
  type MembershipRecord,
} from "@galiaf/sdk";
import { LiveChatPanel } from "./live-chat-panel";
import {
  ManagerActionsPanel,
  type ManagerActionState,
} from "./manager-actions-panel";

export const dynamic = "force-dynamic";

const managerCapabilities = [
  "Создание сотрудников и выдача доступов",
  "Управление объектами и сменами внутри своей организации",
  "Контроль переписок и операционных уведомлений",
];

function areDevPersonasEnabled(): boolean {
  const raw = process.env.GALIAF_ENABLE_DEV_PERSONAS;

  if (raw != null) {
    return raw === "true";
  }

  return process.env.NODE_ENV !== "production";
}

function createApiClient() {
  return new ApiClient({
    baseUrl: process.env.GALIAF_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1",
    defaultHeaders: createDevAuthHeaders(demoAuthContexts.managerAlpha),
  });
}

function resolveOrganizationId(workspace: {
  activeTenantId?: string;
  availableMemberships: Array<{ organizationId: string }>;
}): string {
  return (
    workspace.activeTenantId ??
    workspace.availableMemberships[0]?.organizationId ??
    "org_alpha"
  );
}

function normalizeRole(value: FormDataEntryValue | null): "employee" | "company_manager" {
  return value === "company_manager" ? "company_manager" : "employee";
}

async function createInvitationAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  "use server";

  if (!areDevPersonasEnabled()) {
    return {
      status: "error",
      message:
        "Demo personas disabled. Configure real OIDC auth or temporarily set GALIAF_ENABLE_DEV_PERSONAS=true.",
    };
  }

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const targetName = String(formData.get("targetName") ?? "").trim();
  const role = normalizeRole(formData.get("role"));

  if (!organizationId || !email) {
    return {
      status: "error",
      message: "Нужны organizationId и email для приглашения.",
    };
  }

  try {
    const api = createApiClient();

    await api.createInvitation({
      organizationId,
      email,
      targetName: targetName.length > 0 ? targetName : undefined,
      roles: [role],
    });

    revalidatePath("/");

    return {
      status: "success",
      message: `Приглашение для ${email} создано.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось создать приглашение.",
    };
  }
}

async function createEmployeeAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  "use server";

  if (!areDevPersonasEnabled()) {
    return {
      status: "error",
      message:
        "Demo personas disabled. Configure real OIDC auth or temporarily set GALIAF_ENABLE_DEV_PERSONAS=true.",
    };
  }

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = normalizeRole(formData.get("role"));

  if (!organizationId || !email || !fullName) {
    return {
      status: "error",
      message: "Нужны organizationId, email и полное имя сотрудника.",
    };
  }

  try {
    const api = createApiClient();

    await api.createOrganizationEmployee(organizationId, {
      email,
      fullName,
      roles: [role],
    });

    revalidatePath("/");

    return {
      status: "success",
      message: `Сотрудник ${fullName} добавлен в ${organizationId}.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось создать сотрудника.",
    };
  }
}

function membershipBadge(membership?: MembershipRecord) {
  if (!membership) {
    return "Без membership в активной организации";
  }

  return `${membership.roles.join(", ")} · ${membership.status}`;
}

export default async function ManagerCabinetPage() {
  if (!areDevPersonasEnabled()) {
    return (
      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "72px 24px" }}>
        <p style={{ color: "var(--accent)", marginBottom: "10px" }}>
          Company Manager
        </p>
        <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", margin: 0 }}>
          Demo personas отключены.
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
          Этот кабинет больше не должен неявно работать через demo manager persona в
          production. Настрой реальный OIDC flow или временно укажи
          `GALIAF_ENABLE_DEV_PERSONAS=true` только для изолированного debug-окружения.
        </article>
      </main>
    );
  }

  const api = createApiClient();
  const chatBaseUrl = process.env.GALIAF_CHAT_BASE_URL ?? "http://127.0.0.1:4010";
  const [session, workspace, organizations, users, managerProfile] = await Promise.all([
    api.getSession(),
    api.getWorkspace(),
    api.listOrganizations(),
    api.listUsers(),
    api.getCurrentUser(),
  ]);
  const currentOrganizationId = resolveOrganizationId(workspace);
  const [memberships, invitations] = await Promise.all([
    api.listMemberships(currentOrganizationId),
    api.listInvitations(currentOrganizationId),
  ]);
  const membershipByUserId = new Map(
    memberships.map((membership) => [membership.userId, membership]),
  );
  const scopedUsers = users.filter((user) => membershipByUserId.has(user.id));

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "72px 24px" }}>
      <p style={{ color: "var(--accent)", marginBottom: "10px" }}>
        Company Manager
      </p>
      <h1 style={{ fontSize: "clamp(2.3rem, 6vw, 4.2rem)", margin: 0 }}>
        Кабинет руководителя с live tenant-операциями.
      </h1>
      <section
        style={{
          marginTop: "28px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
        }}
      >
        {managerCapabilities.map((item) => (
          <article
            key={item}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "18px",
              padding: "20px",
              backdropFilter: "blur(10px)",
            }}
          >
            {item}
          </article>
        ))}
      </section>
      <section
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {[
          `Активная организация: ${currentOrganizationId}`,
          `Пользователей в контуре: ${scopedUsers.length}`,
          `Участников: ${memberships.length}`,
          `Инвайтов: ${invitations.length}`,
        ].map((item) => (
          <article
            key={item}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "18px",
              padding: "18px",
            }}
          >
            {item}
          </article>
        ))}
      </section>
      <ManagerActionsPanel
        createEmployeeAction={createEmployeeAction}
        createInvitationAction={createInvitationAction}
        organizationId={currentOrganizationId}
      />
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
            borderRadius: "20px",
            padding: "22px",
          }}
        >
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Сессия</p>
          <p style={{ marginBottom: "8px" }}>{session.subject}</p>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>
            Роли: {session.effectiveRoles.join(", ")}
          </p>
          <p style={{ marginTop: "18px", marginBottom: "8px" }}>
            Доступные membership-контексты
          </p>
          <div style={{ display: "grid", gap: "8px" }}>
            {workspace.availableMemberships.length === 0 ? (
              <div
                style={{
                  border: "1px dashed var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                  color: "var(--muted)",
                }}
              >
                У текущего manager context пока нет доступных membership.
              </div>
            ) : null}
            {workspace.availableMemberships.map((membership) => (
              <div
                key={membership.organizationId}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                }}
              >
                {membership.organizationId}: {membership.roles.join(", ")}
              </div>
            ))}
          </div>
          <p style={{ marginTop: "18px", marginBottom: "8px" }}>
            DB-backed профиль менеджера
          </p>
          <div style={{ display: "grid", gap: "8px" }}>
            {managerProfile.resolvedOrganizations.length === 0 ? (
              <div
                style={{
                  border: "1px dashed var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                  color: "var(--muted)",
                }}
              >
                В базе пока не найдено организаций, связанных с текущим менеджером.
              </div>
            ) : null}
            {managerProfile.resolvedOrganizations.map((organization) => (
              <div
                key={organization.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                }}
              >
                {organization.name} · {organization.id}
              </div>
            ))}
          </div>
        </article>
        <article
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "20px",
            padding: "22px",
          }}
        >
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Организации</p>
          <div style={{ display: "grid", gap: "10px" }}>
            {organizations.length === 0 ? (
              <div
                style={{
                  border: "1px dashed var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                  color: "var(--muted)",
                }}
              >
                В активном контуре пока нет организаций для просмотра.
              </div>
            ) : null}
            {organizations.map((organization) => (
              <div
                key={organization.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                }}
              >
                <strong>{organization.name}</strong>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  {organization.id} · {organization.status}
                </p>
              </div>
            ))}
          </div>
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
            borderRadius: "20px",
            padding: "22px",
          }}
        >
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Команда организации</p>
          <div style={{ display: "grid", gap: "10px" }}>
            {scopedUsers.length === 0 ? (
              <div
                style={{
                  border: "1px dashed var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                  color: "var(--muted)",
                }}
              >
                В активной организации пока нет сотрудников.
              </div>
            ) : null}
            {scopedUsers.map((user) => (
              <div
                key={user.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                }}
              >
                <strong>{user.fullName}</strong>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  {user.email}
                </p>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  {membershipBadge(membershipByUserId.get(user.id))}
                </p>
              </div>
            ))}
          </div>
        </article>
        <article
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "20px",
            padding: "22px",
          }}
        >
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Ожидающие приглашения
          </p>
          <div style={{ display: "grid", gap: "10px" }}>
            {invitations.length === 0 ? (
              <div
                style={{
                  border: "1px dashed var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                  color: "var(--muted)",
                }}
              >
                Для активной организации нет ожидающих приглашений.
              </div>
            ) : null}
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                }}
              >
                <strong>{invitation.email}</strong>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  {invitation.roles.join(", ")} · {invitation.status}
                </p>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  Истекает: {new Date(invitation.expiresAt).toLocaleString("ru-RU")}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
      <LiveChatPanel
        chatBaseUrl={chatBaseUrl}
        identity={{
          ...demoAuthContexts.managerAlpha,
          issuer: "dev-bypass",
          audiences: [],
          scopes: [],
          effectiveRoles: ["company_manager"],
          rawClaims: {},
        }}
        roomId={`org:${currentOrganizationId}`}
        subtitle="Минимальный live chat client для smoke-проверки manager/employee потока."
        title="Live Chat"
      />
    </main>
  );
}
