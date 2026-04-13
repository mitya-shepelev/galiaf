import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Pool, type QueryResult, type QueryResultRow } from "pg";

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool!: Pool;

  public async onModuleInit(): Promise<void> {
    this.pool = new Pool({
      host: requireEnv("DATABASE_HOST", "/Applications/ServBay/tmp"),
      port: Number(requireEnv("DATABASE_PORT", "5432")),
      database: requireEnv("DATABASE_NAME", "galiaf"),
      user: requireEnv("DATABASE_USER", "dmitrijsepelev"),
      password: requireEnv("DATABASE_PASSWORD"),
      max: 10,
    });

    await this.query("select 1");
    await this.bootstrapSchema();
    await this.seedDemoData();

    this.logger.log("PostgreSQL connection established and schema ensured.");
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  public async query<T extends QueryResultRow>(
    sql: string,
    values: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, values);
  }

  public async healthcheck(): Promise<"ok" | "error"> {
    try {
      await this.query("select 1");
      return "ok";
    } catch {
      return "error";
    }
  }

  private async bootstrapSchema(): Promise<void> {
    await this.query(`
      create table if not exists organizations (
        id text primary key,
        name text not null,
        status text not null check (status in ('active', 'suspended')),
        created_at timestamptz not null default now()
      );

      create table if not exists users (
        id text primary key,
        external_auth_subject text not null unique,
        email text not null unique,
        full_name text not null,
        status text not null check (status in ('active', 'blocked')),
        created_at timestamptz not null default now()
      );

      create table if not exists memberships (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        organization_id text not null references organizations(id) on delete cascade,
        roles text[] not null,
        status text not null check (status in ('active', 'revoked')),
        invited_by_user_id text references users(id) on delete set null,
        created_at timestamptz not null default now(),
        unique (user_id, organization_id)
      );

      create table if not exists invitations (
        id text primary key,
        organization_id text not null references organizations(id) on delete cascade,
        email text not null,
        target_name text,
        roles text[] not null,
        status text not null check (status in ('pending', 'accepted', 'revoked', 'expired')),
        invited_by_user_id text not null references users(id) on delete cascade,
        accepted_by_user_id text references users(id) on delete set null,
        expires_at timestamptz not null,
        created_at timestamptz not null default now()
      );
    `);
  }

  private async seedDemoData(): Promise<void> {
    await this.query(
      `insert into organizations (id, name, status)
       values
         ('org_alpha', 'Alpha Security', 'active'),
         ('org_bravo', 'Bravo Logistics', 'active')
       on conflict (id) do update
       set name = excluded.name,
           status = excluded.status`,
    );

    await this.query(
      `insert into users (id, external_auth_subject, email, full_name, status)
       values
         ('user_admin', 'demo-admin', 'admin@galiaf.local', 'Platform Admin', 'active'),
         ('user_manager_alpha', 'demo-manager-alpha', 'manager.alpha@galiaf.local', 'Manager Alpha', 'active'),
         ('user_employee_alpha', 'demo-employee-alpha', 'employee.alpha@galiaf.local', 'Employee Alpha', 'active')
       on conflict (id) do update
       set external_auth_subject = excluded.external_auth_subject,
           email = excluded.email,
           full_name = excluded.full_name,
           status = excluded.status`,
    );

    await this.query(
      `insert into memberships (id, user_id, organization_id, roles, status, invited_by_user_id)
       values
         ('membership_alpha_manager', 'user_manager_alpha', 'org_alpha', array['company_manager'], 'active', 'user_admin'),
         ('membership_alpha_employee', 'user_employee_alpha', 'org_alpha', array['employee'], 'active', 'user_manager_alpha')
       on conflict (user_id, organization_id) do update
       set roles = excluded.roles,
           status = excluded.status,
           invited_by_user_id = excluded.invited_by_user_id`,
    );

    await this.query(
      `insert into invitations (
         id, organization_id, email, target_name, roles, status, invited_by_user_id, expires_at
       )
       values (
         'invite_alpha_pending',
         'org_alpha',
         'new.employee@galiaf.local',
         'New Employee',
         array['employee'],
         'pending',
         'user_manager_alpha',
         now() + interval '7 days'
       )
       on conflict (id) do update
       set email = excluded.email,
           target_name = excluded.target_name,
           roles = excluded.roles,
           status = excluded.status,
           invited_by_user_id = excluded.invited_by_user_id,
           expires_at = excluded.expires_at`,
    );
  }
}
