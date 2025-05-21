import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../utils/bcrypt";

dotenv.config();
const prisma = new PrismaClient();

const createUser = async () => {
  const randomPassword = Math.random().toString(36).substring(2, 15);
  const hashedPassword = await hashPassword(randomPassword);

  await prisma.user.create({
    data: {
      name: "Admin",
      email: "subashchandraboseravi45@gmail.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created", "pass:", randomPassword);
};

createUser()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
