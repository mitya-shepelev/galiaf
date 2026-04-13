import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import type { QueryResult, QueryResultRow } from "pg";
import type {
  InvitationRecord,
  MembershipRecord,
  OrganizationRecord,
  UserRecord,
} from "./domain.types.js";
import { DatabaseService } from "../platform/database.service.js";

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function expectSingleRow<T extends QueryResultRow>(
  result: QueryResult<T>,
  context: string,
): T {
  const row = result.rows[0];

  if (!row) {
    throw new InternalServerErrorException(
      `Expected a row from ${context}, but query returned nothing.`,
    );
  }

  return row;
}

function mapOrganizationRow(row: {
  id: string;
  name: string;
  status: OrganizationRecord["status"];
  created_at: string;
}): OrganizationRecord {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapUserRow(row: {
  id: string;
  external_auth_subject: string;
  email: string;
  full_name: string;
  status: UserRecord["status"];
  created_at: string;
}): UserRecord {
  return {
    id: row.id,
    externalAuthSubject: row.external_auth_subject,
    email: row.email,
    fullName: row.full_name,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapMembershipRow(row: {
  id: string;
  user_id: string;
  organization_id: string;
  roles: MembershipRecord["roles"];
  status: MembershipRecord["status"];
  invited_by_user_id: string | null;
  created_at: string;
}): MembershipRecord {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    roles: row.roles,
    status: row.status,
    invitedByUserId: row.invited_by_user_id ?? undefined,
    createdAt: row.created_at,
  };
}

function mapInvitationRow(row: {
  id: string;
  organization_id: string;
  email: string;
  target_name: string | null;
  roles: InvitationRecord["roles"];
  status: InvitationRecord["status"];
  invited_by_user_id: string;
  accepted_by_user_id: string | null;
  expires_at: string;
  created_at: string;
}): InvitationRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    targetName: row.target_name ?? undefined,
    roles: row.roles,
    status: row.status,
    invitedByUserId: row.invited_by_user_id,
    acceptedByUserId: row.accepted_by_user_id ?? undefined,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

@Injectable()
export class DomainStoreService {
  public constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}

  public async getOrganizations(): Promise<OrganizationRecord[]> {
    const result = await this.database.query<{
      id: string;
      name: string;
      status: OrganizationRecord["status"];
      created_at: string;
    }>(
      `select id, name, status, created_at
       from organizations
       order by created_at asc`,
    );

    return result.rows.map(mapOrganizationRow);
  }

  public async getUsers(): Promise<UserRecord[]> {
    const result = await this.database.query<{
      id: string;
      external_auth_subject: string;
      email: string;
      full_name: string;
      status: UserRecord["status"];
      created_at: string;
    }>(
      `select id, external_auth_subject, email, full_name, status, created_at
       from users
       order by created_at asc`,
    );

    return result.rows.map(mapUserRow);
  }

  public async getMemberships(): Promise<MembershipRecord[]> {
    const result = await this.database.query<{
      id: string;
      user_id: string;
      organization_id: string;
      roles: MembershipRecord["roles"];
      status: MembershipRecord["status"];
      invited_by_user_id: string | null;
      created_at: string;
    }>(
      `select id, user_id, organization_id, roles, status, invited_by_user_id, created_at
       from memberships
       order by created_at asc`,
    );

    return result.rows.map(mapMembershipRow);
  }

  public async getInvitations(): Promise<InvitationRecord[]> {
    const result = await this.database.query<{
      id: string;
      organization_id: string;
      email: string;
      target_name: string | null;
      roles: InvitationRecord["roles"];
      status: InvitationRecord["status"];
      invited_by_user_id: string;
      accepted_by_user_id: string | null;
      expires_at: string;
      created_at: string;
    }>(
      `select id, organization_id, email, target_name, roles, status,
              invited_by_user_id, accepted_by_user_id, expires_at, created_at
       from invitations
       order by created_at asc`,
    );

    return result.rows.map(mapInvitationRow);
  }

  public async createOrganization(input: {
    name: string;
    status?: OrganizationRecord["status"];
  }): Promise<OrganizationRecord> {
    const result = await this.database.query<{
      id: string;
      name: string;
      status: OrganizationRecord["status"];
      created_at: string;
    }>(
      `insert into organizations (id, name, status)
       values ($1, $2, $3)
       returning id, name, status, created_at`,
      [createId("org"), input.name, input.status ?? "active"],
    );

    return mapOrganizationRow(expectSingleRow(result, "createOrganization"));
  }

  public async findUserById(userId: string): Promise<UserRecord | undefined> {
    const result = await this.database.query<{
      id: string;
      external_auth_subject: string;
      email: string;
      full_name: string;
      status: UserRecord["status"];
      created_at: string;
    }>(
      `select id, external_auth_subject, email, full_name, status, created_at
       from users
       where id = $1`,
      [userId],
    );

    const row = result.rows[0];

    if (!row) {
      return undefined;
    }

    return mapUserRow(row);
  }

  public async findUserBySubject(
    subject: string,
  ): Promise<UserRecord | undefined> {
    const result = await this.database.query<{
      id: string;
      external_auth_subject: string;
      email: string;
      full_name: string;
      status: UserRecord["status"];
      created_at: string;
    }>(
      `select id, external_auth_subject, email, full_name, status, created_at
       from users
       where external_auth_subject = $1`,
      [subject],
    );

    const row = result.rows[0];

    if (!row) {
      return undefined;
    }

    return mapUserRow(row);
  }

  public async findUserByEmail(email: string): Promise<UserRecord | undefined> {
    const result = await this.database.query<{
      id: string;
      external_auth_subject: string;
      email: string;
      full_name: string;
      status: UserRecord["status"];
      created_at: string;
    }>(
      `select id, external_auth_subject, email, full_name, status, created_at
       from users
       where lower(email) = lower($1)`,
      [email],
    );

    const row = result.rows[0];

    if (!row) {
      return undefined;
    }

    return mapUserRow(row);
  }

  public async upsertUserFromIdentity(input: {
    subject: string;
    email: string;
    fullName: string;
  }): Promise<UserRecord> {
    const existingBySubject = await this.findUserBySubject(input.subject);

    if (existingBySubject) {
      const updated = await this.database.query<{
        id: string;
        external_auth_subject: string;
        email: string;
        full_name: string;
        status: UserRecord["status"];
        created_at: string;
      }>(
        `update users
         set email = $2,
             full_name = $3
         where id = $1
         returning id, external_auth_subject, email, full_name, status, created_at`,
        [existingBySubject.id, input.email, input.fullName],
      );

      return mapUserRow(expectSingleRow(updated, "upsertUserFromIdentity:updateBySubject"));
    }

    const existingByEmail = await this.findUserByEmail(input.email);

    if (existingByEmail) {
      const updated = await this.database.query<{
        id: string;
        external_auth_subject: string;
        email: string;
        full_name: string;
        status: UserRecord["status"];
        created_at: string;
      }>(
        `update users
         set external_auth_subject = $2,
             full_name = $3
         where id = $1
         returning id, external_auth_subject, email, full_name, status, created_at`,
        [existingByEmail.id, input.subject, input.fullName],
      );

      return mapUserRow(expectSingleRow(updated, "upsertUserFromIdentity:updateByEmail"));
    }

    const inserted = await this.database.query<{
      id: string;
      external_auth_subject: string;
      email: string;
      full_name: string;
      status: UserRecord["status"];
      created_at: string;
    }>(
      `insert into users (id, external_auth_subject, email, full_name, status)
       values ($1, $2, $3, $4, 'active')
       returning id, external_auth_subject, email, full_name, status, created_at`,
      [createId("user"), input.subject, input.email, input.fullName],
    );

    return mapUserRow(expectSingleRow(inserted, "upsertUserFromIdentity:insert"));
  }

  public async createMembership(input: {
    userId: string;
    organizationId: string;
    roles: MembershipRecord["roles"];
    invitedByUserId?: string;
  }): Promise<MembershipRecord> {
    const result = await this.database.query<{
      id: string;
      user_id: string;
      organization_id: string;
      roles: MembershipRecord["roles"];
      status: MembershipRecord["status"];
      invited_by_user_id: string | null;
      created_at: string;
    }>(
      `insert into memberships (id, user_id, organization_id, roles, status, invited_by_user_id)
       values ($1, $2, $3, $4, 'active', $5)
       on conflict (user_id, organization_id) do update
       set roles = excluded.roles,
           status = 'active',
           invited_by_user_id = excluded.invited_by_user_id
       returning id, user_id, organization_id, roles, status, invited_by_user_id, created_at`,
      [
        createId("membership"),
        input.userId,
        input.organizationId,
        input.roles,
        input.invitedByUserId ?? null,
      ],
    );

    return mapMembershipRow(expectSingleRow(result, "createMembership"));
  }

  public async updateMembershipRoles(
    membershipId: string,
    roles: MembershipRecord["roles"],
  ): Promise<MembershipRecord | undefined> {
    const result = await this.database.query<{
      id: string;
      user_id: string;
      organization_id: string;
      roles: MembershipRecord["roles"];
      status: MembershipRecord["status"];
      invited_by_user_id: string | null;
      created_at: string;
    }>(
      `update memberships
       set roles = $2
       where id = $1
       returning id, user_id, organization_id, roles, status, invited_by_user_id, created_at`,
      [membershipId, roles],
    );

    const row = result.rows[0];

    if (!row) {
      return undefined;
    }

    return mapMembershipRow(row);
  }

  public async revokeMembership(
    membershipId: string,
  ): Promise<MembershipRecord | undefined> {
    const result = await this.database.query<{
      id: string;
      user_id: string;
      organization_id: string;
      roles: MembershipRecord["roles"];
      status: MembershipRecord["status"];
      invited_by_user_id: string | null;
      created_at: string;
    }>(
      `update memberships
       set status = 'revoked'
       where id = $1
       returning id, user_id, organization_id, roles, status, invited_by_user_id, created_at`,
      [membershipId],
    );

    const row = result.rows[0];

    if (!row) {
      return undefined;
    }

    return mapMembershipRow(row);
  }

  public async createInvitation(input: {
    organizationId: string;
    email: string;
    targetName?: string;
    roles: InvitationRecord["roles"];
    invitedByUserId: string;
    expiresAt?: string;
  }): Promise<InvitationRecord> {
    const result = await this.database.query<{
      id: string;
      organization_id: string;
      email: string;
      target_name: string | null;
      roles: InvitationRecord["roles"];
      status: InvitationRecord["status"];
      invited_by_user_id: string;
      accepted_by_user_id: string | null;
      expires_at: string;
      created_at: string;
    }>(
      `insert into invitations (
         id, organization_id, email, target_name, roles, status, invited_by_user_id, expires_at
       )
       values ($1, $2, $3, $4, $5, 'pending', $6, coalesce($7, now() + interval '7 days'))
       returning id, organization_id, email, target_name, roles, status,
                 invited_by_user_id, accepted_by_user_id, expires_at, created_at`,
      [
        createId("invite"),
        input.organizationId,
        input.email,
        input.targetName ?? null,
        input.roles,
        input.invitedByUserId,
        input.expiresAt ?? null,
      ],
    );

    return mapInvitationRow(expectSingleRow(result, "createInvitation"));
  }

  public async findInvitationById(
    invitationId: string,
  ): Promise<InvitationRecord | undefined> {
    const result = await this.database.query<{
      id: string;
      organization_id: string;
      email: string;
      target_name: string | null;
      roles: InvitationRecord["roles"];
      status: InvitationRecord["status"];
      invited_by_user_id: string;
      accepted_by_user_id: string | null;
      expires_at: string;
      created_at: string;
    }>(
      `select id, organization_id, email, target_name, roles, status,
              invited_by_user_id, accepted_by_user_id, expires_at, created_at
       from invitations
       where id = $1`,
      [invitationId],
    );

    const row = result.rows[0];

    if (!row) {
      return undefined;
    }

    return mapInvitationRow(row);
  }

  public async updateInvitation(
    invitationId: string,
    patch: Partial<InvitationRecord>,
  ): Promise<InvitationRecord | undefined> {
    const result = await this.database.query<{
      id: string;
      organization_id: string;
      email: string;
      target_name: string | null;
      roles: InvitationRecord["roles"];
      status: InvitationRecord["status"];
      invited_by_user_id: string;
      accepted_by_user_id: string | null;
      expires_at: string;
      created_at: string;
    }>(
      `update invitations
       set status = coalesce($2, status),
           accepted_by_user_id = coalesce($3, accepted_by_user_id),
           expires_at = coalesce($4, expires_at)
       where id = $1
       returning id, organization_id, email, target_name, roles, status,
                 invited_by_user_id, accepted_by_user_id, expires_at, created_at`,
      [
        invitationId,
        patch.status ?? null,
        patch.acceptedByUserId ?? null,
        patch.expiresAt ?? null,
      ],
    );

    const row = result.rows[0];

    if (!row) {
      return undefined;
    }

    return mapInvitationRow(row);
  }
}
