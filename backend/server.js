const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Função para criar tabelas
async function criarTabelas() {
  try {
    console.log('📦 Criando tabelas...');
    
    await prisma.$executeRawUnsafe(`
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
    `);
    
    await prisma.$executeRawUnsafe(`
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
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Palpite" (
        id SERIAL PRIMARY KEY,
        "usuarioId" INTEGER NOT NULL,
        "confrontoId" INTEGER NOT NULL,
        "golsTimeA" INTEGER NOT NULL,
        "golsTimeB" INTEGER NOT NULL,
        pontos INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ Tabelas criadas/verificadas');
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
  }
}

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor funcionando!' });
});

app.get('/api/confrontos', async (req, res) => {
  try {
    const confrontos = await prisma.confronto.findMany();
    res.json(confrontos);
  } catch (error) {
    console.error('Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ranking', async (req, res) => {
  res.json([]);
});

// Inicialização
async function start() {
  await criarTabelas();
  const PORT = process.env.PORT || 3333;
  // Rota de cadastro
app.post('/api/cadastro', async (req, res) => {
  const { nome, email, senha, telefone, tipoChavePix, chavePix } = req.body;
  try {
    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha,
        cpf: '000.000.000-00',
        telefone,
        tipoChavePix,
        chavePix,
        role: 'USER',
        ativo: true
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Rota de login
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const usuario = await prisma.usuario.findFirst({
      where: { email, senha, ativo: true }
    });
    if (usuario) {
      res.json({ success: true, usuario: { id: usuario.id, nome: usuario.nome, role: usuario.role } });
    } else {
      res.status(401).json({ success: false });
    }
  } catch (error) {
    res.status(500).json({ success: false });
  }
});  
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
}

start();