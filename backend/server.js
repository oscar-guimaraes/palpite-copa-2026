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

start();const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Dados em memória
let usuarios = [
  {
    id: 1,
    nome: 'Administrador',
    email: 'admin@palpitecopa.com',
    senha: 'admin123',
    role: 'ADMIN',
    ativo: true,
    telefone: '(00) 00000-0000',
    tipoChavePix: 'EMAIL',
    chavePix: 'admin@palpitecopa.com'
  }
];

let confrontos = [
  {
    id: 1,
    selecaoA: 'Brasil',
    selecaoB: 'Sérvia',
    dataHora: '2026-06-15T15:00',
    local: 'Maracanã - RJ',
    valorSugerido: 12,
    status: 'ABERTO',
    palpitesAbertos: true,
    golsTimeA: null,
    golsTimeB: null
  },
  {
    id: 2,
    selecaoA: 'Argentina',
    selecaoB: 'México',
    dataHora: '2026-06-18T18:00',
    local: 'Estádio Azteca',
    valorSugerido: 10,
    status: 'ENCERRADO',
    palpitesAbertos: false,
    golsTimeA: 3,
    golsTimeB: 2
  }
];

let palpites = [
  { id: 1, usuarioId: 1, confrontoId: 2, golsTimeA: 3, golsTimeB: 2, pontos: 3, createdAt: new Date() },
  { id: 2, usuarioId: 2, confrontoId: 2, golsTimeA: 2, golsTimeB: 3, pontos: 0, createdAt: new Date() }
];

let proximoId = { usuario: 3, confronto: 3, palpite: 3 };

// Função de pontuação
function calcularPontos(palpiteA, palpiteB, realA, realB) {
  if (palpiteA === realA && palpiteB === realB) return 3;
  
  const palpiteResultado = palpiteA > palpiteB ? 'VITORIA_A' : palpiteA < palpiteB ? 'VITORIA_B' : 'EMPATE';
  const realResultado = realA > realB ? 'VITORIA_A' : realA < realB ? 'VITORIA_B' : 'EMPATE';
  
  if (palpiteResultado === realResultado) return 1;
  return 0;
}

// Atualizar pontos
function atualizarPontosConfronto(confrontoId, realA, realB) {
  palpites.forEach(p => {
    if (p.confrontoId === confrontoId) {
      p.pontos = calcularPontos(p.golsTimeA, p.golsTimeB, realA, realB);
    }
  });
}

// ROTAS
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  const usuario = usuarios.find(u => u.email === email && u.senha === senha && u.ativo !== false);
  if (usuario) {
    res.json({ success: true, usuario: { id: usuario.id, nome: usuario.nome, role: usuario.role } });
  } else {
    res.status(401).json({ success: false });
  }
});

app.post('/api/cadastro', (req, res) => {
  const { nome, email, senha, telefone, tipoChavePix, chavePix } = req.body;
  if (usuarios.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'Email já cadastrado' });
  }
  
  usuarios.push({
    id: proximoId.usuario++,
    nome, email, senha, role: 'USER', ativo: true,
    telefone, tipoChavePix, chavePix
  });
  res.json({ success: true });
});

// Admin - Usuários
app.get('/api/admin/usuarios', (req, res) => {
  res.json(usuarios.map(u => ({ ...u, senha: undefined })));
});

app.put('/api/admin/usuarios/:id', (req, res) => {
  const u = usuarios.find(u => u.id == req.params.id);
  if (u) {
    if (req.body.nome) u.nome = req.body.nome;
    if (req.body.email) u.email = req.body.email;
    if (req.body.senha) u.senha = req.body.senha;
    if (req.body.tipoChavePix) u.tipoChavePix = req.body.tipoChavePix;
    if (req.body.chavePix) u.chavePix = req.body.chavePix;
    if (req.body.ativo !== undefined) u.ativo = req.body.ativo;
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

app.delete('/api/admin/usuarios/:id', (req, res) => {
  const index = usuarios.findIndex(u => u.id == req.params.id);
  if (index !== -1 && usuarios[index].role !== 'ADMIN') {
    usuarios.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false });
  }
});

// Confrontos
app.get('/api/confrontos', (req, res) => res.json(confrontos));

app.post('/api/admin/confrontos', (req, res) => {
  const { selecaoA, selecaoB, dataHora, local, valorSugerido } = req.body;
  const novo = {
    id: proximoId.confronto++,
    selecaoA, selecaoB, dataHora, local, valorSugerido,
    status: 'ABERTO', palpitesAbertos: true, golsTimeA: null, golsTimeB: null
  };
  confrontos.push(novo);
  res.json({ success: true, confronto: novo });
});

app.put('/api/admin/confrontos/:id', (req, res) => {
  const c = confrontos.find(c => c.id == req.params.id);
  if (c) {
    if (req.body.selecaoA) c.selecaoA = req.body.selecaoA;
    if (req.body.selecaoB) c.selecaoB = req.body.selecaoB;
    if (req.body.dataHora) c.dataHora = req.body.dataHora;
    if (req.body.local) c.local = req.body.local;
    if (req.body.valorSugerido) c.valorSugerido = req.body.valorSugerido;
    if (req.body.palpitesAbertos !== undefined) c.palpitesAbertos = req.body.palpitesAbertos;
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

// Definir resultado (permite edição mesmo após encerrado)
app.put('/api/admin/confrontos/:id/resultado', (req, res) => {
  const c = confrontos.find(c => c.id == req.params.id);
  if (c) {
    const { golsTimeA, golsTimeB } = req.body;
    c.golsTimeA = golsTimeA;
    c.golsTimeB = golsTimeB;
    c.status = 'ENCERRADO';
    c.palpitesAbertos = false;
    atualizarPontosConfronto(parseInt(req.params.id), golsTimeA, golsTimeB);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

app.delete('/api/admin/confrontos/:id', (req, res) => {
  const index = confrontos.findIndex(c => c.id == req.params.id);
  if (index !== -1) {
    confrontos.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

// Palpites
app.post('/api/palpites', (req, res) => {
  const { usuarioId, confrontoId, golsTimeA, golsTimeB } = req.body;
  const confronto = confrontos.find(c => c.id == confrontoId);
  
  if (!confronto || confronto.status === 'ENCERRADO') {
    return res.status(400).json({ success: false, message: 'Confronto encerrado' });
  }
  if (!confronto.palpitesAbertos) {
    return res.status(400).json({ success: false, message: 'Palpites fechados' });
  }
  if (palpites.find(p => p.usuarioId === usuarioId && p.confrontoId === confrontoId)) {
    return res.status(400).json({ success: false, message: 'Você já palpou' });
  }
  
  let pontos = 0;
  if (confronto.golsTimeA !== null && confronto.golsTimeB !== null) {
    pontos = calcularPontos(golsTimeA, golsTimeB, confronto.golsTimeA, confronto.golsTimeB);
  }
  
  palpites.push({
    id: proximoId.palpite++,
    usuarioId, confrontoId, golsTimeA, golsTimeB, pontos, createdAt: new Date()
  });
  res.json({ success: true });
});

app.get('/api/palpites/:confrontoId', (req, res) => {
  const result = palpites.filter(p => p.confrontoId == req.params.confrontoId).map(p => {
    const usuario = usuarios.find(u => u.id === p.usuarioId);
    return {
      ...p,
      usuarioNome: usuario?.nome,
      chavePix: usuario?.chavePix,
      tipoChavePix: usuario?.tipoChavePix
    };
  });
  res.json(result);
});

// Ranking
app.get('/api/ranking', (req, res) => {
  const pontosPorUsuario = {};
  palpites.forEach(p => {
    if (!pontosPorUsuario[p.usuarioId]) pontosPorUsuario[p.usuarioId] = 0;
    pontosPorUsuario[p.usuarioId] += p.pontos;
  });
  
  const ranking = Object.keys(pontosPorUsuario).map(uid => {
    const u = usuarios.find(u => u.id == uid);
    return {
      id: uid,
      nome: u?.nome || 'Usuário',
      pontos: pontosPorUsuario[uid],
      pontosPlacar: palpites.filter(p => p.usuarioId == uid && p.pontos === 3).length,
      pontosResultado: palpites.filter(p => p.usuarioId == uid && p.pontos === 1).length
    };
  }).sort((a, b) => b.pontos - a.pontos);
  
  res.json(ranking);
});

app.listen(3333, () => {
  console.log('🚀 Servidor rodando em http://localhost:3333');
  console.log('📝 Admin: admin@palpitecopa.com / admin123');
});
