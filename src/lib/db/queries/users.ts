import "server-only";

import { getDb, type Database } from "../client.ts";
import { hashPassword } from "@/lib/auth/password.ts";
import { parsePostcode } from "@/lib/geo/postcode.ts";

export type UserRecord = {
  id: string;
  email: string;
  password_hash: string;
  role: "customer" | "tradesperson" | "admin";
  full_name: string;
  phone: string | null;
  postcode: string | null;
  postcode_outward: string | null;
  status: "active" | "suspended" | "deleted";
};

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const db = await getDb();
  const [row] = await db.query<UserRecord>(
    `select id, email, password_hash, role, full_name, phone, postcode,
            postcode_outward, status
       from users where lower(email) = lower($1)`,
    [email],
  );
  return row ?? null;
}

export async function emailTaken(email: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.query("select 1 from users where lower(email) = lower($1)", [email]);
  return rows.length > 0;
}

export type CreateUserInput = {
  email: string;
  password: string;
  role: "customer" | "tradesperson";
  fullName: string;
  phone: string;
  postcode: string;
};

/**
 * Creates a user and the profile row for their role.
 *
 * Runs in a transaction so a user can never exist without its profile. Accepts
 * an optional transaction so callers that create a user and a job together
 * (the combined post-a-job signup) stay atomic.
 */
export async function createUser(
  input: CreateUserInput,
  tx?: Database,
): Promise<{ id: string } | { error: "email_taken" }> {
  const db = tx ?? (await getDb());
  const run = async (conn: Database): Promise<{ id: string } | { error: "email_taken" }> => {
    const existing = await conn.query("select 1 from users where lower(email) = lower($1)", [
      input.email,
    ]);
    if (existing.length > 0) return { error: "email_taken" };

    const parts = parsePostcode(input.postcode);
    const passwordHash = await hashPassword(input.password);

    const [user] = await conn.query<{ id: string }>(
      `insert into users (email, password_hash, role, full_name, phone, postcode, postcode_outward)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id`,
      [
        input.email.toLowerCase(),
        passwordHash,
        input.role,
        input.fullName,
        input.phone,
        parts?.formatted ?? input.postcode,
        parts?.outward ?? null,
      ],
    );
    if (!user) throw new Error("User insert returned no row");

    if (input.role === "customer") {
      await conn.query("insert into customer_profiles (user_id) values ($1)", [user.id]);
    } else {
      await conn.query("insert into tradesperson_profiles (user_id) values ($1)", [user.id]);
    }

    return { id: user.id };
  };

  return tx ? run(tx) : db.transaction(run);
}

export async function updateUserContact(
  userId: string,
  input: { fullName: string; phone: string; postcode: string },
): Promise<void> {
  const db = await getDb();
  const parts = parsePostcode(input.postcode);
  await db.query(
    `update users
        set full_name = $2, phone = $3, postcode = $4, postcode_outward = $5, updated_at = now()
      where id = $1`,
    [userId, input.fullName, input.phone, parts?.formatted ?? input.postcode, parts?.outward ?? null],
  );
}
