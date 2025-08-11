import prisma from "../prisma";

async function main() {
  // Delete all PaymentIntent rows
  await prisma.paymentIntent.deleteMany({});
  console.log('✅ All PaymentIntent records deleted');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
