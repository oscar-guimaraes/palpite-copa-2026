const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Criando tabelas...');
  
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Usuario" (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      cpf TEXT UNIQUE NOT NULL,
      telefone TEXT NOT NULL,
      "tipoChavePix" TEXT NOT NULL,
      "chavePix" TEXT NOT NULL,
      role TEXT DEFAULT 'USER',
      ativo BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
  `;
  
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Confronto" (
      id SERIAL PRIMARY KEY,
      "selecaoA" TEXT NOT NULL,
      "selecaoB" TEXT NOT NULL,
      "dataHora" TIMESTAMP NOT NULL,
      local TEXT NOT NULL,
      "valorSugerido" DOUBLE PRECISION NOT NULL,
      "golsTimeA" INTEGER,
      "golsTimeB" INTEGER,
      status TEXT DEFAULT 'ABERTO',
      "palpitesAbertos" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
  `;
  
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Palpite" (
      id SERIAL PRIMARY KEY,
      "usuarioId" INTEGER NOT NULL,
      "confrontoId" INTEGER NOT NULL,
      "golsTimeA" INTEGER NOT NULL,
      "golsTimeB" INTEGER NOT NULL,
      pontos INTEGER DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT NOW()
    );
  `;
  
  console.log('Tabelas criadas com sucesso!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());