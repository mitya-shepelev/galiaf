export interface ChatDatabaseMigration {
  id: string;
  sql: string;
}

export const chatDatabaseMigrations: ChatDatabaseMigration[] = [
  {
    id: "0001_chat_messages",
    sql: `
      create table if not exists chat_messages (
        id text primary key,
        room_id text not null,
        author_subject text not null,
        author_name text,
        text text not null,
        created_at timestamptz not null default now(),
        delivery_status text not null check (delivery_status in ('queued', 'delivered'))
      );

      create index if not exists chat_messages_room_created_idx
        on chat_messages (room_id, created_at desc);
    `,
  },
  {
    id: "0002_chat_message_receipts",
    sql: `
      create table if not exists chat_message_receipts (
        message_id text not null references chat_messages(id) on delete cascade,
        subject text not null,
        delivered_at timestamptz,
        read_at timestamptz,
        primary key (message_id, subject)
      );

      create index if not exists chat_message_receipts_message_idx
        on chat_message_receipts (message_id);
    `,
  },
  {
    id: "0003_chat_notification_outbox",
    sql: `
      create table if not exists chat_notification_outbox (
        id text primary key,
        event_type text not null check (
          event_type in ('room_message_created', 'message_delivered', 'message_read')
        ),
        room_id text not null,
        message_id text not null references chat_messages(id) on delete cascade,
        actor_subject text not null,
        payload jsonb not null default '{}'::jsonb,
        status text not null default 'pending' check (
          status in ('pending', 'dispatched', 'failed')
        ),
        attempts integer not null default 0,
        last_error text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        dispatched_at timestamptz
      );

      create index if not exists chat_notification_outbox_status_created_idx
        on chat_notification_outbox (status, created_at asc);
    `,
  },
  {
    id: "0004_chat_notification_outbox_dispatching",
    sql: `
      alter table chat_notification_outbox
        drop constraint if exists chat_notification_outbox_status_check;

      alter table chat_notification_outbox
        add constraint chat_notification_outbox_status_check check (
          status in ('pending', 'dispatching', 'dispatched', 'failed')
        );

      create unique index if not exists chat_notification_outbox_dedupe_idx
        on chat_notification_outbox (event_type, message_id, actor_subject);

      create index if not exists chat_notification_outbox_dispatching_updated_idx
        on chat_notification_outbox (status, updated_at asc);
    `,
  },
];
