import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { chatDatabaseMigrations } from "./chat-database.migrations.js";

interface ChatDatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  adminDatabase: string;
}

function resolveEnv(name: string, fallback?: string): string | undefined {
  return process.env[name] ?? fallback;
}

function requireConfig(name: string, value?: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function createPool(config: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}) {
  return new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    max: 10,
  });
}

@Injectable()
export class ChatDatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatDatabaseService.name);
  private pool!: Pool;

  public async onModuleInit(): Promise<void> {
    const config = this.resolveConfig();

    await this.ensureDatabaseExists(config);
    this.pool = createPool(config);
    await this.query("select 1");
    await this.runMigrations();

    this.logger.log(
      `Chat PostgreSQL connection established and migrations applied for ${config.database}.`,
    );
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

  private resolveConfig(): ChatDatabaseConfig {
    const host = resolveEnv(
      "CHAT_DATABASE_HOST",
      resolveEnv("DATABASE_HOST", "/Applications/ServBay/tmp"),
    );
    const port = Number(resolveEnv("CHAT_DATABASE_PORT", resolveEnv("DATABASE_PORT", "5432")));
    const user = resolveEnv("CHAT_DATABASE_USER", resolveEnv("DATABASE_USER", "dmitrijsepelev"));
    const password = requireConfig(
      "CHAT_DATABASE_PASSWORD",
      resolveEnv("CHAT_DATABASE_PASSWORD", resolveEnv("DATABASE_PASSWORD")),
    );
    const database = requireConfig(
      "CHAT_DATABASE_NAME",
      resolveEnv("CHAT_DATABASE_NAME", "galiaf_chat"),
    );
    const adminDatabase = requireConfig(
      "CHAT_DATABASE_ADMIN_NAME",
      resolveEnv("CHAT_DATABASE_ADMIN_NAME", "postgres"),
    );

    return {
      host: requireConfig("CHAT_DATABASE_HOST", host),
      port,
      user: requireConfig("CHAT_DATABASE_USER", user),
      password,
      database,
      adminDatabase,
    };
  }

  private async ensureDatabaseExists(config: ChatDatabaseConfig): Promise<void> {
    const adminPool = createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.adminDatabase,
    });

    try {
      const existing = await adminPool.query<{ exists: 1 }>(
        `select 1 as exists
         from pg_database
         where datname = $1`,
        [config.database],
      );

      if (existing.rowCount && existing.rowCount > 0) {
        return;
      }

      await adminPool.query(`create database ${quoteIdentifier(config.database)}`);
      this.logger.log(`Created chat database ${config.database}.`);
    } finally {
      await adminPool.end();
    }
  }

  private async runMigrations(): Promise<void> {
    await this.query(`
      create table if not exists schema_migrations (
        id text primary key,
        applied_at timestamptz not null default now()
      );
    `);

    for (const migration of chatDatabaseMigrations) {
      const alreadyApplied = await this.query<{ id: string }>(
        `select id
         from schema_migrations
         where id = $1`,
        [migration.id],
      );

      if (alreadyApplied.rowCount && alreadyApplied.rowCount > 0) {
        continue;
      }

      const client = await this.pool.connect();

      try {
        await client.query("begin");
        await client.query(migration.sql);
        await client.query(
          `insert into schema_migrations (id)
           values ($1)`,
          [migration.id],
        );
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    }
  }
}
