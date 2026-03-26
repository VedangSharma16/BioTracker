declare module "express-mysql-session" {
  import session from "express-session";

  type StoreFactory = new (options: Record<string, unknown>, connection?: unknown) => session.Store;

  export default function expressMySqlSession(sessionModule: typeof session): StoreFactory;
}
