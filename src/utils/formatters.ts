export function formatMoney(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0,0%';
  }
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export function formatTimeOnly(isoString: string | null | undefined): string {
  if (!isoString) return '--:--:--';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--:--:--';
  }
}

export function formatDateBr(dateString: string | null | undefined): string {
  if (!dateString) return '--/--/----';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return dateString;
  }
}

export function formatSangriaTime(timeVal: string | null | undefined): string {
  if (!timeVal) return '11:45';

  const trimmed = String(timeVal).trim();

  // 1. Caso direto HH:mm ou HH:mm:ss (ex: "14:30" ou "14:30:00")
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const parts = trimmed.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1]}`;
  }

  // 2. Extrai padrão HH:mm de string composta com data (ex: "2026-10-15 14:30:00" ou "2026-10-15T14:30:00.000Z")
  const dateTimeMatch = trimmed.match(/(?:T|\s|^)(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (dateTimeMatch) {
    return `${dateTimeMatch[1].padStart(2, '0')}:${dateTimeMatch[2]}`;
  }

  // 3. Qualquer padrão de dois dígitos separados por dois pontos (HH:MM)
  const anyMatch = trimmed.match(/(\d{1,2}):(\d{2})/);
  if (anyMatch) {
    return `${anyMatch[1].padStart(2, '0')}:${anyMatch[2]}`;
  }

  // 4. Se for apenas uma data (ex: "2026-10-15"), nunca exibe a data, usa horário padrão HH:mm
  return '11:45';
}
