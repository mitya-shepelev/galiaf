import { Pool } from "pg";

function readEnv(name, fallback) {
  const value = process.env[name] ?? fallback;

  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseDays(rawValue) {
  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < 1 || value > 3650) {
    throw new Error("Retention days must be an integer between 1 and 3650.");
  }

  return value;
}

function readRetentionDays() {
  const args = process.argv.slice(2).filter((item) => item !== "--");
  const flag = args.find((item) => item.startsWith("--days="));

  if (!flag) {
    return 90;
  }

  return parseDays(flag.slice("--days=".length));
}

const retentionDays = readRetentionDays();
const databaseHost = process.env.DATABASE_HOST ?? "/Applications/ServBay/tmp";
const databasePort = Number(process.env.DATABASE_PORT ?? "5432");
const databaseName = readEnv("DATABASE_NAME", "galiaf");
const databaseUser = readEnv("DATABASE_USER", "dmitrijsepelev");
const databasePassword = readEnv("DATABASE_PASSWORD", undefined);

const pool = new Pool({
  host: databaseHost,
  port: databasePort,
  database: databaseName,
  user: databaseUser,
  password: databasePassword,
  max: 1,
});

async function main() {
  const result = await pool.query(
    `delete from audit_events
     where created_at < now() - ($1::text || ' days')::interval`,
    [String(retentionDays)],
  );

  console.log(
    JSON.stringify(
      {
        status: "ok",
        retentionDays,
        deletedCount: result.rowCount ?? 0,
        databaseHost,
        databaseName,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
