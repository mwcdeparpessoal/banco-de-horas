/**
 * Utilitários de Cálculo de Tempo para Ponto Eletrônico (de acordo com CLT)
 */

// 1. Converter string "HH:MM" ou "HH:MM:SS" para minutos inteiros
export function hhmmToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

// 2. Converter minutos inteiros para string "HH:MM" (suporta valores negativos para banco de horas)
export function minutesToHHMM(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined || isNaN(totalMinutes)) return '00:00';
  const isNegative = totalMinutes < 0;
  const absMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = Math.round(absMinutes % 60);
  
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  
  return `${isNegative ? '-' : ''}${formattedHours}:${formattedMinutes}`;
}

// 3. Obter overlap de minutos entre dois intervalos [A, B] e [X, Y]
function getOverlapMinutes(a, b, x, y) {
  return Math.max(0, Math.min(b, y) - Math.max(a, x));
}

// 4. Calcular minutos de Adicional Noturno em um intervalo (22:00 às 05:00)
// Das 22h (1320 min) às 24h (1440 min) e das 00h (0 min) às 05h (300 min)
export function getNightClockMinutes(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  
  const start = hhmmToMinutes(startStr);
  const end = hhmmToMinutes(endStr);
  
  // Se o fim for menor que o início, significa que cruzou a meia-noite (ex: 22:00 às 05:00)
  if (end < start) {
    // Parte 1: Início até Meia-noite (1440 min)
    const nightPart1 = getOverlapMinutes(start, 1440, 1320, 1440); // Overlap com 22h-24h
    // Parte 2: Meia-noite até Fim
    const nightPart2 = getOverlapMinutes(0, end, 0, 300); // Overlap com 00h-05h
    return nightPart1 + nightPart2;
  } else {
    // Intervalo no mesmo dia (ex: 04:00 às 08:00)
    const nightPart1 = getOverlapMinutes(start, end, 1320, 1440); // Overlap com 22h-24h
    const nightPart2 = getOverlapMinutes(start, end, 0, 300); // Overlap com 00h-05h
    return nightPart1 + nightPart2;
  }
}

// 5. Converter minutos normais noturnos (relógio) para horas noturnas reduzidas
// Fator de conversão CLT: 1h relógio (60 min) = 1.142857h noturna (68.57 min)
// Ou seja, multiplicamos os minutos relógio por 1.142857 (8/7)
export function applyNightReduction(minutes) {
  return Math.round(minutes * (8 / 7));
}

/**
 * Realiza todos os cálculos diários de ponto com base nas marcações
 * @param {Object} registro - Objeto contendo entrada_1, saida_1, entrada_2, saida_2, falta, feriado, horas_previstas_minutos
 * @returns {Object} - Objeto com os valores calculados em minutos
 */
export function calcularPontoDiario(registro) {
  const {
    entrada_1,
    saida_1,
    entrada_2,
    saida_2,
    falta,
    feriado,
    horas_previstas_minutos
  } = registro;

  const resultado = {
    total_trabalhado: 0,
    adicional_noturno: 0,
    hora_extra_50: 0,
    hora_extra_100: 0,
    intrajornada: 0,
    atraso: 0
  };

  // Se for falta, não trabalhou nada e o atraso é o total previsto
  if (falta) {
    resultado.atraso = horas_previstas_minutos || 0;
    return resultado;
  }

  // Verificar se tem marcações válidas
  const e1 = hhmmToMinutes(entrada_1);
  const s1 = hhmmToMinutes(saida_1);
  const e2 = hhmmToMinutes(entrada_2);
  const s2 = hhmmToMinutes(saida_2);

  // Período 1 (Manhã) e Período 2 (Tarde)
  let p1Minutes = 0;
  if (entrada_1 && saida_1) {
    p1Minutes = s1 < e1 ? (1440 - e1) + s1 : s1 - e1;
  }
  
  let p2Minutes = 0;
  if (entrada_2 && saida_2) {
    p2Minutes = s2 < e2 ? (1440 - e2) + s2 : s2 - e2;
  }

  const clockMinutesTrabalhados = p1Minutes + p2Minutes;
  resultado.total_trabalhado = clockMinutesTrabalhados;

  // Se não trabalhou e não é falta, retorna zerado
  if (clockMinutesTrabalhados === 0) {
    resultado.atraso = horas_previstas_minutos || 0;
    return resultado;
  }

  // --- CALCULO ADICIONAL NOTURNO (REDUZIDO) ---
  const nightClockMinutes1 = getNightClockMinutes(entrada_1, saida_1);
  const nightClockMinutes2 = getNightClockMinutes(entrada_2, saida_2);
  const totalNightClockMinutes = nightClockMinutes1 + nightClockMinutes2;
  resultado.adicional_noturno = applyNightReduction(totalNightClockMinutes);

  // --- CONTROLE DE INTRAJORNADA ---
  // Calculado se houver intervalo (entre saída 1 e entrada 2)
  if (saida_1 && entrada_2) {
    const intervalMinutes = e2 < s1 ? (1440 - s1) + e2 : e2 - s1;
    // Se o intervalo for menor que 60 minutos (1 hora)
    if (intervalMinutes < 60) {
      resultado.intrajornada = 60 - intervalMinutes;
    }
  }

  // --- HORA EXTRA E ATRASO ---
  const previstas = horas_previstas_minutos || 0;

  if (feriado) {
    // Se for feriado, todo o tempo trabalhado é Hora Extra 100%
    resultado.hora_extra_100 = clockMinutesTrabalhados;
    resultado.hora_extra_50 = 0;
    resultado.atraso = 0; // Feriado não gera atraso
  } else {
    // Dia normal
    if (clockMinutesTrabalhados > previstas) {
      resultado.hora_extra_50 = clockMinutesTrabalhados - previstas;
      resultado.atraso = 0;
    } else if (clockMinutesTrabalhados < previstas) {
      resultado.hora_extra_50 = 0;
      resultado.atraso = previstas - clockMinutesTrabalhados;
    } else {
      resultado.hora_extra_50 = 0;
      resultado.atraso = 0;
    }
  }

  return resultado;
}
