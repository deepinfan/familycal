import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = process.env.DEFAULT_ROLE_PASSWORD ?? "123456";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123456";

const initialRoles = [
  { name: "爷爷", nameEn: "Grandpa" },
  { name: "奶奶", nameEn: "Grandma" },
  { name: "外公", nameEn: "Maternal Grandpa" },
  { name: "外婆", nameEn: "Maternal Grandma" },
  { name: "爸爸", nameEn: "Dad" },
  { name: "妈妈", nameEn: "Mom" },
  { name: "大菲佣", nameEn: "Helper A" },
  { name: "二菲佣", nameEn: "Helper B" }
];

async function main() {
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const existingAdmin = await prisma.role.findFirst({ where: { isAdmin: true }, select: { id: true } });
  if (existingAdmin) {
    await prisma.role.update({
      where: { id: existingAdmin.id },
      data: { name: "管理员", nameEn: "Administrator", isAdmin: true, passwordHash: adminHash }
    });
  } else {
    await prisma.role.create({
      data: {
        name: "管理员",
        nameEn: "Administrator",
        isAdmin: true,
        passwordHash: adminHash
      }
    });
  }

  const roleHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  for (const role of initialRoles) {
    const existingRole = await prisma.role.findFirst({ where: { name: role.name, isAdmin: false }, select: { id: true } });
    if (existingRole) {
      await prisma.role.update({
        where: { id: existingRole.id },
        data: {
          name: role.name,
          nameEn: role.nameEn
        }
      });
    } else {
      await prisma.role.create({
        data: {
          name: role.name,
          nameEn: role.nameEn,
          passwordHash: roleHash,
          isAdmin: false
        }
      });
    }
  }
  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
