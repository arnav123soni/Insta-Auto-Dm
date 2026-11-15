/**
 * Local dev seed — creates the owner user + workspace that the app uses
 * when LOCAL_OWNER_ID is set in .env (no login required).
 *
 * Run once:  npm run db:seed
 * Or via:    docker compose exec web npm run db:seed
 */
import { prisma } from "../lib/db/client";

const LOCAL_OWNER_ID = process.env.LOCAL_OWNER_ID ?? "local-owner-id";
const LOCAL_OWNER_EMAIL =
  process.env.LOCAL_OWNER_EMAIL ?? "owner@instareply.local";
const LOCAL_OWNER_NAME = process.env.LOCAL_OWNER_NAME ?? "InstaReply Owner";

async function main() {
  console.log("🌱  Seeding local owner user…");

  // Upsert the user
  const user = await prisma.user.upsert({
    where: { id: LOCAL_OWNER_ID },
    update: { name: LOCAL_OWNER_NAME, email: LOCAL_OWNER_EMAIL },
    create: {
      id: LOCAL_OWNER_ID,
      name: LOCAL_OWNER_NAME,
      email: LOCAL_OWNER_EMAIL,
      emailVerified: new Date(),
    },
  });

  console.log(`✅  User: ${user.email} (${user.id})`);

  // Check if they already have a workspace
  const existing = await prisma.workspaceMember.findFirst({
    where: { userId: LOCAL_OWNER_ID },
    include: { workspace: true },
  });

  if (existing) {
    console.log(`✅  Workspace already exists: ${existing.workspace.name}`);
    return;
  }

  // Create a workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: `${LOCAL_OWNER_NAME}'s workspace`,
      ownerId: LOCAL_OWNER_ID,
      members: {
        create: {
          userId: LOCAL_OWNER_ID,
          role: "OWNER",
        },
      },
    },
  });

  console.log(`✅  Workspace created: ${workspace.name} (${workspace.id})`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

