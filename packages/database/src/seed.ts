import { prisma } from "./index.js";

async function main() {
  console.log("Seed data is represented in the API demo store for feature 01.");
  console.log("After feature 02, this script will populate PostgreSQL through Prisma.");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
