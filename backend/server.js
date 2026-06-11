const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// Cria as tabelas automaticamente se não existirem
async function initDatabase() {
  try {
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
    
    console.log('✅ Banco de dados inicializado');
  } catch (error) {
    console.error('Erro ao criar tabelas:', error.message);
  }
}

// Chama a função antes de iniciar o servidor
initDatabase();

app.use(cors());
app.use(express.json());

// ==== ROTAS DE AUTENTICAÇÃO ====
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  const usuario = await prisma.usuario.findFirst({
    where: { email, senha, ativo: true }
  });
  if (usuario) {
    res.json({ success: true, usuario: { id: usuario.id, nome: usuario.nome, role: usuario.role } });
  } else {
    res.status(401).json({ success: false });
  }
});

app.post('/api/cadastro', async (req, res) => {
  const { nome, email, senha, telefone, tipoChavePix, chavePix } = req.body;
  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) return res.status(400).json({ success: false, message: 'Email já cadastrado' });
  
  const usuario = await prisma.usuario.create({
    data: { nome, email, senha, cpf: '000.000.000-00', telefone, tipoChavePix, chavePix, role: 'USER' }
  });
  res.json({ success: true });
});

// ==== ADMIN - USUÁRIOS ====
app.get('/api/admin/usuarios', async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nome: true, email: true, role: true, ativo: true, telefone: true, tipoChavePix: true, chavePix: true }
  });
  res.json(usuarios);
});

app.put('/api/admin/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, tipoChavePix, chavePix, ativo } = req.body;
  const data = { nome, email, tipoChavePix, chavePix, ativo };
  if (senha) data.senha = senha;
  await prisma.usuario.update({ where: { id: parseInt(id) }, data });
  res.json({ success: true });
});

app.delete('/api/admin/usuarios/:id', async (req, res) => {
  await prisma.usuario.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true });
});

// ==== CONFRONTOS ====
app.get('/api/confrontos', async (req, res) => {
  const confrontos = await prisma.confronto.findMany();
  res.json(confrontos);
});

app.post('/api/admin/confrontos', async (req, res) => {
  const { selecaoA, selecaoB, dataHora, local, valorSugerido } = req.body;
  const confronto = await prisma.confronto.create({
    data: { selecaoA, selecaoB, dataHora: new Date(dataHora), local, valorSugerido }
  });
  res.json({ success: true, confronto });
});

app.put('/api/admin/confrontos/:id', async (req, res) => {
  const { id } = req.params;
  const { selecaoA, selecaoB, dataHora, local, valorSugerido, palpitesAbertos } = req.body;
  await prisma.confronto.update({
    where: { id: parseInt(id) },
    data: { selecaoA, selecaoB, dataHora: new Date(dataHora), local, valorSugerido, palpitesAbertos }
  });
  res.json({ success: true });
});

app.put('/api/admin/confrontos/:id/resultado', async (req, res) => {
  const { id } = req.params;
  const { golsTimeA, golsTimeB } = req.body;
  await prisma.confronto.update({
    where: { id: parseInt(id) },
    data: { golsTimeA, golsTimeB, status: 'ENCERRADO', palpitesAbertos: false }
  });
  
  // Atualizar pontos dos palpites
  const palpites = await prisma.palpite.findMany({ where: { confrontoId: parseInt(id) } });
  for (const palpite of palpites) {
    let pontos = 0;
    if (palpite.golsTimeA === golsTimeA && palpite.golsTimeB === golsTimeB) pontos = 3;
    else {
      const palpiteResultado = palpite.golsTimeA > palpite.golsTimeB ? 'VITORIA_A' : palpite.golsTimeA < palpite.golsTimeB ? 'VITORIA_B' : 'EMPATE';
      const realResultado = golsTimeA > golsTimeB ? 'VITORIA_A' : golsTimeA < golsTimeB ? 'VITORIA_B' : 'EMPATE';
      if (palpiteResultado === realResultado) pontos = 1;
    }
    await prisma.palpite.update({ where: { id: palpite.id }, data: { pontos } });
  }
  res.json({ success: true });
});

app.delete('/api/admin/confrontos/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  await prisma.palpite.deleteMany({ where: { confrontoId: id } });
  await prisma.confronto.delete({ where: { id } });
  res.json({ success: true });
});

// ==== PALPITES ====
app.post('/api/palpites', async (req, res) => {
  const { usuarioId, confrontoId, golsTimeA, golsTimeB } = req.body;
  const confronto = await prisma.confronto.findUnique({ where: { id: confrontoId } });
  if (!confronto || confronto.status === 'ENCERRADO') return res.status(400).json({ success: false, message: 'Confronto encerrado' });
  if (!confronto.palpitesAbertos) return res.status(400).json({ success: false, message: 'Palpites fechados' });
  
  const existente = await prisma.palpite.findFirst({ where: { usuarioId, confrontoId } });
  if (existente) return res.status(400).json({ success: false, message: 'Você já palpou' });
  
  let pontos = 0;
  if (confronto.golsTimeA !== null && confronto.golsTimeB !== null) {
    if (golsTimeA === confronto.golsTimeA && golsTimeB === confronto.golsTimeB) pontos = 3;
    else {
      const palpiteResultado = golsTimeA > golsTimeB ? 'VITORIA_A' : golsTimeA < golsTimeB ? 'VITORIA_B' : 'EMPATE';
      const realResultado = confronto.golsTimeA > confronto.golsTimeB ? 'VITORIA_A' : confronto.golsTimeA < confronto.golsTimeB ? 'VITORIA_B' : 'EMPATE';
      if (palpiteResultado === realResultado) pontos = 1;
    }
  }
  
  await prisma.palpite.create({ data: { usuarioId, confrontoId, golsTimeA, golsTimeB, pontos } });
  res.json({ success: true });
});

app.get('/api/palpites/:confrontoId', async (req, res) => {
  const palpites = await prisma.palpite.findMany({
    where: { confrontoId: parseInt(req.params.confrontoId) },
    include: { usuario: { select: { nome: true, chavePix: true, tipoChavePix: true } } }
  });
  const result = palpites.map(p => ({ ...p, usuarioNome: p.usuario.nome, chavePix: p.usuario.chavePix, tipoChavePix: p.usuario.tipoChavePix }));
  res.json(result);
});

// ==== RANKING ====
app.get('/api/ranking', async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    include: { palpites: true }
  });
  
  const ranking = usuarios
    .map(u => {
      const pontos = u.palpites.reduce((sum, p) => sum + p.pontos, 0);
      const pontosPlacar = u.palpites.filter(p => p.pontos === 3).length;
      const pontosResultado = u.palpites.filter(p => p.pontos === 1).length;
      return { id: u.id, nome: u.nome, pontos, pontosPlacar, pontosResultado, totalPalpites: u.palpites.length };
    })
    .filter(r => r.totalPalpites > 0)
    .sort((a, b) => b.pontos - a.pontos);
  
  res.json(ranking);
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
