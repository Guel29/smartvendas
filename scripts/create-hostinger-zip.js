import { execSync } from 'child_process';
import path from 'path';

console.log('--- Executando construtor de pacotes Hostinger compatível (POSIX Standard) ---');
try {
  execSync('python3 scripts/create-hostinger-packages.py', { stdio: 'inherit' });
  console.log('--- Pacotes gerados com sucesso! ---');
} catch (err) {
  console.error('Erro ao gerar pacotes:', err);
  process.exit(1);
}
