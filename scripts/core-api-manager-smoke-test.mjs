const apiBaseUrl =
  process.env.CORE_API_URL ?? "http://127.0.0.1:4000/api/v1";
const organizationId = process.env.CORE_API_ORGANIZATION_ID ?? "org_alpha";
const timestamp = Date.now();

const managerIdentity = {
  sub: "demo-manager-alpha",
  email: "manager.alpha@galiaf.local",
  name: "Manager Alpha",
  issuer: "dev-bypass",
  audiences: [],
  scopes: [],
  clientId: "galiaf-manager-cabinet",
  activeTenantId: organizationId,
  platformRoles: [],
  tenantMemberships: [
    {
      organizationId,
      roles: ["company_manager"],
    },
  ],
};

function createEmployeeIdentity(subject, email, fullName) {
  return {
    sub: subject,
    email,
    name: fullName,
    issuer: "dev-bypass",
    audiences: [],
    scopes: [],
    clientId: "galiaf-employee-cabinet",
    activeTenantId: organizationId,
    platformRoles: [],
    tenantMemberships: [
      {
        organizationId,
        roles: ["employee"],
      },
    ],
  };
}

function createHeaders(identity, withJsonBody = false) {
  const headers = {
    accept: "application/json",
    "x-dev-auth-context": JSON.stringify(identity),
  };

  if (withJsonBody) {
    headers["content-type"] = "application/json";
  }

  return headers;
}

async function apiRequest(pathname, options = {}) {
  const response = await fetch(`${apiBaseUrl}${pathname}`, options);
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const invitedEmail = `invited.employee.${timestamp}@galiaf.local`;
  const provisionedEmail = `provisioned.employee.${timestamp}@galiaf.local`;
  const invitedSubject = `demo-invited-${timestamp}`;
  const provisionedSubject = `demo-provisioned-${timestamp}`;

  const health = await apiRequest("/health");
  assert(health.ok, `Healthcheck failed with status ${health.status}.`);

  const invitationResponse = await apiRequest("/invitations", {
    method: "POST",
    headers: createHeaders(managerIdentity, true),
    body: JSON.stringify({
      organizationId,
      email: invitedEmail,
      targetName: "Invited Employee",
      roles: ["employee"],
    }),
  });
  assert(
    invitationResponse.ok,
    `Manager invitation create failed: ${JSON.stringify(invitationResponse.body)}`,
  );

  const invitation = invitationResponse.body;
  const invitedIdentity = createEmployeeIdentity(
    invitedSubject,
    invitedEmail,
    "Invited Employee",
  );

  const acceptedResponse = await apiRequest(`/invitations/${invitation.id}/accept`, {
    method: "POST",
    headers: createHeaders(invitedIdentity),
  });
  assert(
    acceptedResponse.ok,
    `Invitation accept failed: ${JSON.stringify(acceptedResponse.body)}`,
  );

  const invitedProfileResponse = await apiRequest("/users/me", {
    headers: createHeaders(invitedIdentity),
  });
  assert(
    invitedProfileResponse.ok,
    `Invited employee profile failed: ${JSON.stringify(invitedProfileResponse.body)}`,
  );

  const invitedProfile = invitedProfileResponse.body;
  assert(
    invitedProfile.resolvedMemberships.some(
      (membership) =>
        membership.organizationId === organizationId &&
        membership.roles.includes("employee") &&
        membership.status === "active",
    ),
    "Accepted invitation did not produce an active employee membership.",
  );

  const invitedWorkspaceResponse = await apiRequest("/access/workspace", {
    headers: createHeaders(invitedIdentity),
  });
  assert(
    invitedWorkspaceResponse.ok,
    `Employee workspace failed: ${JSON.stringify(invitedWorkspaceResponse.body)}`,
  );

  const invitedUsersResponse = await apiRequest("/users", {
    headers: createHeaders(invitedIdentity),
  });
  assert(
    invitedUsersResponse.status === 403,
    `Employee /users should be forbidden, got ${invitedUsersResponse.status}.`,
  );

  const provisionedResponse = await apiRequest(
    `/organizations/${organizationId}/employees`,
    {
      method: "POST",
      headers: createHeaders(managerIdentity, true),
      body: JSON.stringify({
        email: provisionedEmail,
        fullName: "Provisioned Employee",
        roles: ["employee"],
      }),
    },
  );
  assert(
    provisionedResponse.ok,
    `Manager employee provisioning failed: ${JSON.stringify(provisionedResponse.body)}`,
  );

  const provisionedIdentity = createEmployeeIdentity(
    provisionedSubject,
    provisionedEmail,
    "Provisioned Employee",
  );
  const provisionedProfileResponse = await apiRequest("/users/me", {
    headers: createHeaders(provisionedIdentity),
  });
  assert(
    provisionedProfileResponse.ok,
    `Provisioned employee profile failed: ${JSON.stringify(provisionedProfileResponse.body)}`,
  );

  const provisionedProfile = provisionedProfileResponse.body;
  assert(
    provisionedProfile.resolvedOrganizations.some(
      (organization) => organization.id === organizationId,
    ),
    "Provisioned employee does not see the granted organization in DB-backed profile.",
  );

  const managerUsersResponse = await apiRequest("/users", {
    headers: createHeaders(managerIdentity),
  });
  assert(
    managerUsersResponse.ok,
    `Manager users list failed: ${JSON.stringify(managerUsersResponse.body)}`,
  );

  const managerMembershipsResponse = await apiRequest(
    `/memberships?organizationId=${encodeURIComponent(organizationId)}`,
    {
      headers: createHeaders(managerIdentity),
    },
  );
  assert(
    managerMembershipsResponse.ok,
    `Manager memberships list failed: ${JSON.stringify(managerMembershipsResponse.body)}`,
  );

  console.log(
    JSON.stringify(
      {
        status: "ok",
        organizationId,
        invitationId: invitation.id,
        acceptedInvitationMembershipId: acceptedResponse.body.membership.id,
        provisionedMembershipId: provisionedResponse.body.membership.id,
        invitedProfile: {
          userId: invitedProfile.user.id,
          resolvedMemberships: invitedProfile.resolvedMemberships.length,
          resolvedOrganizations: invitedProfile.resolvedOrganizations.length,
        },
        provisionedProfile: {
          userId: provisionedProfile.user.id,
          resolvedMemberships: provisionedProfile.resolvedMemberships.length,
          resolvedOrganizations: provisionedProfile.resolvedOrganizations.length,
        },
        managerView: {
          users: managerUsersResponse.body.length,
          memberships: managerMembershipsResponse.body.length,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
