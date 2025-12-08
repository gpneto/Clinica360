/**
 * Script para importar procedimentos odontológicos da planilha Excel para o Firestore
 * Execute este script uma vez para popular o template no Firestore
 * 
 * Uso: npx ts-node scripts/import-dental-procedures.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Configuração do Firebase usando variáveis de ambiente
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validar configuração
if (!firebaseConfig.projectId) {
  console.error('❌ Erro: NEXT_PUBLIC_FIREBASE_PROJECT_ID não está definido nas variáveis de ambiente.');
  console.error('   Certifique-se de ter um arquivo .env.local com as configurações do Firebase.');
  process.exit(1);
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface ProcedimentoTemplate {
  nome: string;
  duracaoMin: number;
  precoCentavos: number;
  ativo: boolean;
  createdAt: Date;
}

async function importProcedimentos() {
  try {
    console.log('Iniciando importação de procedimentos odontológicos...');

    // Verificar se já existem templates
    const templatesQuery = query(
      collection(db, 'dental_procedures_templates'),
      where('ativo', '==', true)
    );
    const existingDocs = await getDocs(templatesQuery);
    
    if (existingDocs.size > 0) {
      console.log(`⚠️  Já existem ${existingDocs.size} procedimentos no template.`);
      console.log('Deseja continuar mesmo assim? (S/N)');
      // Em produção, você pode adicionar uma confirmação aqui
    }

    // Ler a planilha Excel
    const filePath = path.join(process.cwd(), 'lista_procedimentos.xlsx');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    console.log(`📊 Encontrados ${data.length} registros na planilha`);

    // Processar e salvar no Firestore
    let imported = 0;
    let skipped = 0;

    for (const row of data) {
      // A planilha tem apenas a coluna "Nome"
      const nome = row['Nome'] || row['nome'] || '';

      if (!nome || nome.trim() === '') {
        skipped++;
        continue;
      }

      const procedimento: ProcedimentoTemplate = {
        nome: String(nome).trim(),
        duracaoMin: 60, // Valor padrão
        precoCentavos: 0, // Valor padrão (pode ser ajustado depois)
        ativo: true,
        createdAt: new Date(),
      };

      try {
        await addDoc(collection(db, 'dental_procedures_templates'), procedimento);
        imported++;
        console.log(`✓ Importado: ${procedimento.nome}`);
      } catch (error) {
        console.error(`✗ Erro ao importar ${procedimento.nome}:`, error);
        skipped++;
      }
    }

    console.log('\n✅ Importação concluída!');
    console.log(`   Importados: ${imported}`);
    console.log(`   Ignorados: ${skipped}`);
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    process.exit(1);
  }
}

// Executar importação
importProcedimentos()
  .then(() => {
    console.log('Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });

