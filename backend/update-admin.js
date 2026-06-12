const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const admin = await prisma.usuario.update({
      where: { email: 'admin@palpitecopa.com' },
      data: { role: 'ADMIN' }
    });
    console.log('✅ Admin atualizado:', admin.email, '- Role:', admin.role);
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();