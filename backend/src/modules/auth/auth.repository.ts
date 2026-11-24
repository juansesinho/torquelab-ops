import { pool } from '../../db/pool';
import { UserRole } from '../../middlewares/auth';

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
}

export type PublicUser = Omit<UserRecord, 'password_hash'>;

export const authRepository = {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const res = await pool.query<UserRecord>(
      `SELECT id, name, email, password_hash, role, created_at
       FROM users
       WHERE email = $1`,
      [email]
    );
    return res.rows[0] ?? null;
  },

  async findById(id: number): Promise<PublicUser | null> {
    const res = await pool.query<PublicUser>(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );
    return res.rows[0] ?? null;
  },

  async createUser(
    name: string,
    email: string,
    passwordHash: string,
    role: UserRole = 'client'
  ): Promise<PublicUser> {
    const res = await pool.query<PublicUser>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash, role]
    );
    return res.rows[0];
  },

  async createClient(name: string, email: string, passwordHash: string): Promise<PublicUser> {
    return this.createUser(name, email, passwordHash, 'client');
  },

  async listByRole(role: UserRole): Promise<Array<Pick<PublicUser, 'id' | 'name' | 'email' | 'role'>>> {
    const res = await pool.query<Pick<PublicUser, 'id' | 'name' | 'email' | 'role'>>(
      `SELECT id, name, email, role
       FROM users
       WHERE role = $1
       ORDER BY name ASC`,
      [role]
    );
    return res.rows;
  },
};
