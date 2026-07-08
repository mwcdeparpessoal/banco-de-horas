import { supabase } from './supabase';
import { calcularPontoDiario, minutesToHHMM, hhmmToMinutes } from '../utils/timeCalculations';

// Verifica se o Supabase está propriamente configurado
const useSupabase = 
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  import.meta.env.VITE_SUPABASE_URL !== 'YOUR_SUPABASE_URL';

console.log(useSupabase ? '🚀 Conectado ao Supabase remoto' : '💾 Usando armazenamento local (Mock DB)');

// ==========================================
// MOCK DATABASE INITIALIZER (LocalStorage)
// ==========================================
const initMockDB = () => {
  if (localStorage.getItem('pe_initialized')) return;

  const mockEmpresas = [
    { id: 'emp-123', nome: 'Minha Empresa Tech Ltda', cnpj: '12.345.678/0001-90' }
  ];

  const mockFuncionarios = [
    { id: 'func-1', empresa_id: 'emp-123', nome: 'Ricardo Silva', email: 'ricardo@empresa.com', data_admissao: '2025-01-10', ativo: true },
    { id: 'func-2', empresa_id: 'emp-123', nome: 'Mariana Costa', email: 'mariana@empresa.com', data_admissao: '2025-05-15', ativo: true },
    { id: 'func-3', empresa_id: 'emp-123', nome: 'Carlos Eduardo', email: 'carlos@empresa.com', data_admissao: '2025-11-20', ativo: true }
  ];

  const mockJornadas = [
    // Ricardo: Seg-Sex 8h, Sáb 4h
    { id: 'j-1-0', funcionario_id: 'func-1', dia_semana: 0, horas_previstas: '00:00' },
    { id: 'j-1-1', funcionario_id: 'func-1', dia_semana: 1, horas_previstas: '08:00' },
    { id: 'j-1-2', funcionario_id: 'func-1', dia_semana: 2, horas_previstas: '08:00' },
    { id: 'j-1-3', funcionario_id: 'func-1', dia_semana: 3, horas_previstas: '08:00' },
    { id: 'j-1-4', funcionario_id: 'func-1', dia_semana: 4, horas_previstas: '08:00' },
    { id: 'j-1-5', funcionario_id: 'func-1', dia_semana: 5, horas_previstas: '08:00' },
    { id: 'j-1-6', funcionario_id: 'func-1', dia_semana: 6, horas_previstas: '04:00' },
    
    // Mariana: Seg-Sex 8h, Sáb 0h
    { id: 'j-2-0', funcionario_id: 'func-2', dia_semana: 0, horas_previstas: '00:00' },
    { id: 'j-2-1', funcionario_id: 'func-2', dia_semana: 1, horas_previstas: '08:00' },
    { id: 'j-2-2', funcionario_id: 'func-2', dia_semana: 2, horas_previstas: '08:00' },
    { id: 'j-2-3', funcionario_id: 'func-2', dia_semana: 3, horas_previstas: '08:00' },
    { id: 'j-2-4', funcionario_id: 'func-2', dia_semana: 4, horas_previstas: '08:00' },
    { id: 'j-2-5', funcionario_id: 'func-2', dia_semana: 5, horas_previstas: '08:00' },
    { id: 'j-2-6', funcionario_id: 'func-2', dia_semana: 6, horas_previstas: '00:00' },

    // Carlos: Seg-Sex 8h, Sáb 4h
    { id: 'j-3-0', funcionario_id: 'func-3', dia_semana: 0, horas_previstas: '00:00' },
    { id: 'j-3-1', funcionario_id: 'func-3', dia_semana: 1, horas_previstas: '08:00' },
    { id: 'j-3-2', funcionario_id: 'func-3', dia_semana: 2, horas_previstas: '08:00' },
    { id: 'j-3-3', funcionario_id: 'func-3', dia_semana: 3, horas_previstas: '08:00' },
    { id: 'j-3-4', funcionario_id: 'func-3', dia_semana: 4, horas_previstas: '08:00' },
    { id: 'j-3-5', funcionario_id: 'func-3', dia_semana: 5, horas_previstas: '08:00' },
    { id: 'j-3-6', funcionario_id: 'func-3', dia_semana: 6, horas_previstas: '04:00' }
  ];

  const mockFeriados = [
    { id: 'fer-1', empresa_id: 'emp-123', data: '2026-05-01', descricao: 'Dia do Trabalho', recorrente_anual: true },
    { id: 'fer-2', empresa_id: 'emp-123', data: '2026-09-07', descricao: 'Independência do Brasil', recorrente_anual: true },
    { id: 'fer-3', empresa_id: 'emp-123', data: '2026-12-25', descricao: 'Natal', recorrente_anual: true }
  ];

  const mockBancoSaldos = [
    { funcionario_id: 'func-1', saldo_acumulado: 120 }, // 2 horas positivas
    { funcionario_id: 'func-2', saldo_acumulado: 0 },
    { funcionario_id: 'func-3', saldo_acumulado: -30 }  // 30 min negativos
  ];

  const mockCompetencias = [
    { id: 'comp-1', funcionario_id: 'func-1', mes: 5, ano: 2026, fechado: true, pagar_horas_extras: false, saldo_banco_anterior: 0, saldo_banco_atual: 120 },
    { id: 'comp-2', funcionario_id: 'func-1', mes: 6, ano: 2026, fechado: false, pagar_horas_extras: false, saldo_banco_anterior: 120, saldo_banco_atual: 120 }
  ];

  // Pré-preencher alguns registros de ponto para Ricardo em Maio/2026
  const mockRegistros = [];
  // Exemplo de folha pré-cadastrada:
  // Dia 04/05/2026 (Segunda): 08:00 às 12:00 e 13:00 às 17:00 (Jornada normal de 8h)
  mockRegistros.push({
    id: 'r-1',
    funcionario_id: 'func-1',
    data: '2026-05-04',
    entrada_1: '08:00',
    saida_1: '12:00',
    entrada_2: '13:00',
    saida_2: '17:00',
    falta: false,
    feriado: false,
    total_trabalhado: 480,
    adicional_noturno: 0,
    hora_extra_50: 0,
    hora_extra_100: 0,
    intrajornada: 0,
    atraso: 0,
    observacao: 'Jornada normal'
  });
  
  // Dia 05/05/2026 (Terça): Fez hora extra (saiu às 19:00, 2h extras)
  mockRegistros.push({
    id: 'r-2',
    funcionario_id: 'func-1',
    data: '2026-05-05',
    entrada_1: '08:00',
    saida_1: '12:00',
    entrada_2: '13:00',
    saida_2: '19:00',
    falta: false,
    feriado: false,
    total_trabalhado: 600,
    adicional_noturno: 0,
    hora_extra_50: 120,
    hora_extra_100: 0,
    intrajornada: 0,
    atraso: 0,
    observacao: 'Horas extras realizadas'
  });

  // Dia 06/05/2026 (Quarta): Atraso de 30 min (saiu às 16:30)
  mockRegistros.push({
    id: 'r-3',
    funcionario_id: 'func-1',
    data: '2026-05-06',
    entrada_1: '08:00',
    saida_1: '12:00',
    entrada_2: '13:00',
    saida_2: '16:30',
    falta: false,
    feriado: false,
    total_trabalhado: 450,
    adicional_noturno: 0,
    hora_extra_50: 0,
    hora_extra_100: 0,
    intrajornada: 0,
    atraso: 30,
    observacao: 'Saída antecipada autorizada'
  });

  // Dia 07/05/2026 (Quinta): Intervalo reduzido (45 minutos)
  mockRegistros.push({
    id: 'r-4',
    funcionario_id: 'func-1',
    data: '2026-05-07',
    entrada_1: '08:00',
    saida_1: '12:00',
    entrada_2: '12:45',
    saida_2: '16:45',
    falta: false,
    feriado: false,
    total_trabalhado: 480,
    adicional_noturno: 0,
    hora_extra_50: 0,
    hora_extra_100: 0,
    intrajornada: 15,
    atraso: 0,
    observacao: 'Almoço rápido'
  });

  // Dia 01/05/2026 (Sexta) - FERIADO (Dia do Trabalho): Trabalhou 4 horas
  mockRegistros.push({
    id: 'r-5',
    funcionario_id: 'func-1',
    data: '2026-05-01',
    entrada_1: '08:00',
    saida_1: '12:00',
    entrada_2: '',
    saida_2: '',
    falta: false,
    feriado: true,
    total_trabalhado: 240,
    adicional_noturno: 0,
    hora_extra_50: 0,
    hora_extra_100: 240,
    intrajornada: 0,
    atraso: 0,
    observacao: 'Trabalho no feriado'
  });

  // Salvar tudo no localStorage
  localStorage.setItem('pe_empresas', JSON.stringify(mockEmpresas));
  localStorage.setItem('pe_funcionarios', JSON.stringify(mockFuncionarios));
  localStorage.setItem('pe_jornadas', JSON.stringify(mockJornadas));
  localStorage.setItem('pe_feriados', JSON.stringify(mockFeriados));
  localStorage.setItem('pe_banco_saldos', JSON.stringify(mockBancoSaldos));
  localStorage.setItem('pe_competencias', JSON.stringify(mockCompetencias));
  localStorage.setItem('pe_registros', JSON.stringify(mockRegistros));
  localStorage.setItem('pe_initialized', 'true');
};

initMockDB();

// Garantir que as solicitações de cadastro existam no LocalStorage
if (!localStorage.getItem('pe_solicitacoes')) {
  const mockSolicitacoes = [
    { id: 'sol-1', nome_empresa: 'Futura Contabilidade S/C', cnpj: '33.444.555/0001-22', email_solicitante: 'contato@futura.com.br', data_solicitacao: '2026-07-08', status: 'pendente' }
  ];
  localStorage.setItem('pe_solicitacoes', JSON.stringify(mockSolicitacoes));
}


// Helpers para ler/escrever do localStorage
const getLocal = (key) => JSON.parse(localStorage.getItem(key)) || [];
const setLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// ==========================================
// DB SERVICE INTERFACE
// ==========================================
export const dbService = {
  // --- GESTÃO DE EMPRESA ---
  async getEmpresa() {
    if (useSupabase) {
      const { data, error } = await supabase.from('empresas').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    } else {
      const empresas = getLocal('pe_empresas');
      return empresas[0] || null;
    }
  },

  async cadastrarEmpresa(nome, cnpj) {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('empresas')
        .insert([{ nome, cnpj }])
        .select()
        .single();
      if (error) throw error;
      
      // Associar usuário atual à empresa no perfil
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await supabase
          .from('perfis')
          .update({ empresa_id: data.id })
          .eq('id', userData.user.id);
      }
      return data;
    } else {
      const empresas = getLocal('pe_empresas');
      const novaEmpresa = { id: 'emp-' + Date.now(), nome, cnpj };
      empresas.push(novaEmpresa);
      setLocal('pe_empresas', empresas);
      return novaEmpresa;
    }
  },

  // --- GESTÃO DE FUNCIONÁRIOS ---
  async getFuncionarios() {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      return data;
    } else {
      return getLocal('pe_funcionarios').filter(f => f.ativo);
    }
  },

  async salvarFuncionario(funcionario) {
    if (useSupabase) {
      const empresa = await this.getEmpresa();
      if (!empresa) throw new Error('Crie uma empresa antes de adicionar funcionários.');
      
      const payload = { ...funcionario, empresa_id: empresa.id };
      let result;
      if (payload.id) {
        const { data, error } = await supabase
          .from('funcionarios')
          .update(payload)
          .eq('id', payload.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('funcionarios')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        result = data;
      }
      return result;
    } else {
      const funcionarios = getLocal('pe_funcionarios');
      const jornadas = getLocal('pe_jornadas');
      const saldos = getLocal('pe_banco_saldos');
      
      if (funcionario.id) {
        const idx = funcionarios.findIndex(f => f.id === funcionario.id);
        if (idx !== -1) {
          funcionarios[idx] = { ...funcionarios[idx], ...funcionario };
        }
      } else {
        funcionario.id = 'func-' + Date.now();
        funcionario.empresa_id = 'emp-123';
        funcionario.ativo = true;
        funcionarios.push(funcionario);

        // Inicializar banco de horas saldo
        saldos.push({ funcionario_id: funcionario.id, saldo_acumulado: 0 });

        // Inicializar jornadas previstas padrão (Seg-Sex 8h, Sáb 4h)
        for (let i = 0; i <= 6; i++) {
          jornadas.push({
            id: `j-${funcionario.id}-${i}`,
            funcionario_id: funcionario.id,
            dia_semana: i,
            horas_previstas: i === 0 ? '00:00' : (i === 6 ? '04:00' : '08:00')
          });
        }
      }
      setLocal('pe_funcionarios', funcionarios);
      setLocal('pe_jornadas', jornadas);
      setLocal('pe_banco_saldos', saldos);
      return funcionario;
    }
  },

  async excluirFuncionario(id) {
    if (useSupabase) {
      const { error } = await supabase.from('funcionarios').update({ ativo: false }).eq('id', id);
      if (error) throw error;
    } else {
      const funcionarios = getLocal('pe_funcionarios');
      const idx = funcionarios.findIndex(f => f.id === id);
      if (idx !== -1) {
        funcionarios[idx].ativo = false; // Inativar em vez de excluir fisicamente
        setLocal('pe_funcionarios', funcionarios);
      }
    }
  },

  // --- JORNADAS PREVISTAS ---
  async getJornadas(funcionarioId) {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('jornadas_previstas')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .order('dia_semana', { ascending: true });
      if (error) throw error;
      return data;
    } else {
      return getLocal('pe_jornadas').filter(j => j.funcionario_id === funcionarioId);
    }
  },

  async salvarJornadas(funcionarioId, jornadasAtualizadas) {
    if (useSupabase) {
      // Upsert das jornadas
      const { error } = await supabase
        .from('jornadas_previstas')
        .upsert(
          jornadasAtualizadas.map(j => ({
            id: j.id || undefined,
            funcionario_id: funcionarioId,
            dia_semana: j.dia_semana,
            horas_previstas: j.horas_previstas
          }))
        );
      if (error) throw error;
    } else {
      const jornadas = getLocal('pe_jornadas');
      jornadasAtualizadas.forEach(ju => {
        const idx = jornadas.findIndex(j => j.funcionario_id === funcionarioId && j.dia_semana === ju.dia_semana);
        if (idx !== -1) {
          jornadas[idx].horas_previstas = ju.horas_previstas;
        } else {
          jornadas.push({
            id: `j-${funcionarioId}-${ju.dia_semana}`,
            funcionario_id: funcionarioId,
            dia_semana: ju.dia_semana,
            horas_previstas: ju.horas_previstas
          });
        }
      });
      setLocal('pe_jornadas', jornadas);
    }
  },

  // --- GESTÃO DE FERIADOS ---
  async getFeriados() {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('feriados')
        .select('*')
        .order('data', { ascending: true });
      if (error) throw error;
      return data;
    } else {
      return getLocal('pe_feriados');
    }
  },

  async salvarFeriado(feriado) {
    if (useSupabase) {
      const empresa = await this.getEmpresa();
      if (!empresa) throw new Error('Crie uma empresa antes.');
      const payload = { ...feriado, empresa_id: empresa.id };
      if (payload.id) {
        const { data, error } = await supabase.from('feriados').update(payload).eq('id', payload.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from('feriados').insert([payload]).select().single();
        if (error) throw error;
        return data;
      }
    } else {
      const feriados = getLocal('pe_feriados');
      if (feriado.id) {
        const idx = feriados.findIndex(f => f.id === feriado.id);
        if (idx !== -1) feriados[idx] = feriado;
      } else {
        feriado.id = 'fer-' + Date.now();
        feriado.empresa_id = 'emp-123';
        feriados.push(feriado);
      }
      setLocal('pe_feriados', feriados);
      return feriado;
    }
  },

  async excluirFeriado(id) {
    if (useSupabase) {
      const { error } = await supabase.from('feriados').delete().eq('id', id);
      if (error) throw error;
    } else {
      const feriados = getLocal('pe_feriados');
      const filtrados = feriados.filter(f => f.id !== id);
      setLocal('pe_feriados', filtrados);
    }
  },

  // --- REGISTROS DE PONTO ---
  async getRegistrosMes(funcionarioId, mes, ano) {
    // Retorna todos os registros salvos
    let registrosSalvos = [];
    if (useSupabase) {
      // Buscar do Supabase filtrando por data de início e fim do mês
      const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const endDate = new Date(ano, mes, 0).toISOString().split('T')[0]; // Último dia do mês
      
      const { data, error } = await supabase
        .from('registros_ponto')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .gte('data', startDate)
        .lte('data', endDate);
      if (error) throw error;
      registrosSalvos = data || [];
    } else {
      const allRegs = getLocal('pe_registros');
      registrosSalvos = allRegs.filter(r => {
        if (r.funcionario_id !== funcionarioId) return false;
        const [rAno, rMes] = r.data.split('-').map(Number);
        return rMes === mes && rAno === ano;
      });
    }

    // Gerar lista de todos os dias do mês
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const feriados = await this.getFeriados();
    const jornadas = await this.getJornadas(funcionarioId);

    const folhaCompleta = [];
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const dataObj = new Date(ano, mes - 1, dia);
      const diaSemana = dataObj.getDay(); // 0 a 6
      
      // Achar jornada prevista pra esse dia de semana
      const jornadaDia = jornadas.find(j => j.dia_semana === diaSemana);
      const horasPrevistasStr = jornadaDia ? jornadaDia.horas_previstas : '08:00';
      const horasPrevistasMin = hhmmToMinutes(horasPrevistasStr);

      // Verificar se é feriado
      const ehFeriado = feriados.some(f => {
        const fData = new Date(f.data);
        if (f.recorrente_anual) {
          return fData.getMonth() + 1 === mes && fData.getDate() === dia;
        }
        return f.data === dataStr;
      });

      const salvo = registrosSalvos.find(r => r.data === dataStr);

      if (salvo) {
        folhaCompleta.push({
          ...salvo,
          dia_semana: diaSemana,
          horas_previstas_minutos: horasPrevistasMin,
          horas_previstas_str: horasPrevistasStr,
          feriado: salvo.feriado || ehFeriado // Se foi salvo como feriado ou está no cadastro
        });
      } else {
        folhaCompleta.push({
          id: null,
          funcionario_id: funcionarioId,
          data: dataStr,
          dia_semana: diaSemana,
          entrada_1: '',
          saida_1: '',
          entrada_2: '',
          saida_2: '',
          falta: false,
          feriado: ehFeriado,
          horas_previstas_minutos: horasPrevistasMin,
          horas_previstas_str: horasPrevistasStr,
          total_trabalhado: 0,
          adicional_noturno: 0,
          hora_extra_50: 0,
          hora_extra_100: 0,
          intrajornada: 0,
          atraso: 0,
          observacao: ''
        });
      }
    }

    return folhaCompleta;
  },

  async salvarRegistroDiario(registro) {
    // Primeiro calcula os valores do dia baseado nas entradas
    const calculated = calcularPontoDiario(registro);
    const payload = {
      funcionario_id: registro.funcionario_id,
      data: registro.data,
      entrada_1: registro.entrada_1 || null,
      saida_1: registro.saida_1 || null,
      entrada_2: registro.entrada_2 || null,
      saida_2: registro.saida_2 || null,
      falta: registro.falta,
      feriado: registro.feriado,
      observacao: registro.observacao || '',
      
      // Inserir os minutos calculados no payload
      // No Supabase salvamos no formato interval ou inteiro. Para simplificar, convertemos para interval:
      total_trabalhado: minutesToHHMM(calculated.total_trabalhado) + ':00',
      adicional_noturno: minutesToHHMM(calculated.adicional_noturno) + ':00',
      hora_extra_50: minutesToHHMM(calculated.hora_extra_50) + ':00',
      hora_extra_100: minutesToHHMM(calculated.hora_extra_100) + ':00',
      intrajornada: minutesToHHMM(calculated.intrajornada) + ':00',
      atraso: minutesToHHMM(calculated.atraso) + ':00'
    };

    if (useSupabase) {
      const { data, error } = await supabase
        .from('registros_ponto')
        .upsert(payload, { onConflict: 'funcionario_id,data' })
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        total_trabalhado: hhmmToMinutes(data.total_trabalhado),
        adicional_noturno: hhmmToMinutes(data.adicional_noturno),
        hora_extra_50: hhmmToMinutes(data.hora_extra_50),
        hora_extra_100: hhmmToMinutes(data.hora_extra_100),
        intrajornada: hhmmToMinutes(data.intrajornada),
        atraso: hhmmToMinutes(data.atraso)
      };
    } else {
      const registros = getLocal('pe_registros');
      const idx = registros.findIndex(r => r.funcionario_id === registro.funcionario_id && r.data === registro.data);
      
      const itemSalvo = {
        id: registro.id || 'reg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        ...payload,
        // No localStorage guardamos como minutos inteiros pra facilitar soma directa no front-end
        total_trabalhado: calculated.total_trabalhado,
        adicional_noturno: calculated.adicional_noturno,
        hora_extra_50: calculated.hora_extra_50,
        hora_extra_100: calculated.hora_extra_100,
        intrajornada: calculated.intrajornada,
        atraso: calculated.atraso
      };

      if (idx !== -1) {
        registros[idx] = itemSalvo;
      } else {
        registros.push(itemSalvo);
      }
      setLocal('pe_registros', registros);
      return itemSalvo;
    }
  },

  // --- COMPETÊNCIAS E BANCO DE HORAS ---
  async getCompetencia(funcionarioId, mes, ano) {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('competencias_fechamento')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .eq('mes', mes)
        .eq('ano', ano)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        return {
          ...data,
          saldo_banco_anterior: hhmmToMinutes(data.saldo_banco_anterior),
          saldo_banco_atual: hhmmToMinutes(data.saldo_banco_atual)
        };
      }
      return null;
    } else {
      const comps = getLocal('pe_competencias');
      const comp = comps.find(c => c.funcionario_id === funcionarioId && c.mes === mes && c.ano === ano);
      return comp || null;
    }
  },

  async getBancoHorasSaldo(funcionarioId) {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('banco_horas_saldo')
        .select('saldo_acumulado')
        .eq('funcionario_id', funcionarioId)
        .maybeSingle();
      if (error) throw error;
      return data ? hhmmToMinutes(data.saldo_acumulado) : 0;
    } else {
      const saldos = getLocal('pe_banco_saldos');
      const s = saldos.find(sd => sd.funcionario_id === funcionarioId);
      return s ? s.saldo_acumulado : 0;
    }
  },

  async fecharCompetencia(funcionarioId, mes, ano, pagarHorasExtras, saldoMesMinutos) {
    // Obter saldo acumulado atual (anterior ao fechamento)
    const saldoBancoAnterior = await this.getBancoHorasSaldo(funcionarioId);
    
    // Se pagarHorasExtras for FALSE, as Horas Extras 50% entram pro banco.
    // Atrasos sempre são debitados do banco de horas, faltas também.
    // Hora extra 100% (feriados/domingos) no modelo de banco de horas brasileiro padrão também podem ir pro banco ou ser pagas, 
    // mas de acordo com a CLT, a compensação é feita de forma acordada.
    // Vamos calcular a alteração do saldo para este mês:
    // Saldo do Mês = Hora Extra 50% (se não pagar) + Hora Extra 100% (se não pagar) - Atrasos - Faltas (Convertidas em atraso)
    // De acordo com a CLT, se for pro banco, soma extras e subtrai atrasos.
    
    let variacaoSaldo = 0;
    
    // Pegar todos os registros de ponto do mês para somar
    const registros = await this.getRegistrosMes(funcionarioId, mes, ano);
    let totalExtras50 = 0;
    let totalAtrasos = 0;
    
    registros.forEach(r => {
      // Usar a conversão dependendo de como os registros foram retornados (Supabase = minutos, Local = minutos)
      const extra50 = typeof r.hora_extra_50 === 'string' ? hhmmToMinutes(r.hora_extra_50) : (r.hora_extra_50 || 0);
      const atraso = typeof r.atraso === 'string' ? hhmmToMinutes(r.atraso) : (r.atraso || 0);
      totalExtras50 += extra50;
      totalAtrasos += atraso;
    });

    if (!pagarHorasExtras) {
      // Se não pagar, HE entra como crédito
      variacaoSaldo += totalExtras50;
    }
    // Atraso sempre debita do banco
    variacaoSaldo -= totalAtrasos;

    const novoSaldoAcumulado = saldoBancoAnterior + variacaoSaldo;

    if (useSupabase) {
      // 1. Salvar fechamento
      const payload = {
        funcionario_id: funcionarioId,
        mes,
        ano,
        fechado: true,
        pagar_horas_extras: pagarHorasExtras,
        saldo_banco_anterior: minutesToHHMM(saldoBancoAnterior) + ':00',
        saldo_banco_atual: minutesToHHMM(novoSaldoAcumulado) + ':00'
      };

      const { error: compError } = await supabase
        .from('competencias_fechamento')
        .upsert(payload, { onConflict: 'funcionario_id,mes,ano' });
      if (compError) throw compError;

      // 2. Atualizar saldo do banco de horas do funcionário
      const { error: saldoError } = await supabase
        .from('banco_horas_saldo')
        .upsert({
          funcionario_id: funcionarioId,
          saldo_acumulado: minutesToHHMM(novoSaldoAcumulado) + ':00',
          updated_at: new Date().toISOString()
        });
      if (saldoError) throw saldoError;
    } else {
      const comps = getLocal('pe_competencias');
      const saldos = getLocal('pe_banco_saldos');

      const compIdx = comps.findIndex(c => c.funcionario_id === funcionarioId && c.mes === mes && c.ano === ano);
      const compPayload = {
        id: 'comp-' + Date.now(),
        funcionario_id: funcionarioId,
        mes,
        ano,
        fechado: true,
        pagar_horas_extras: pagarHorasExtras,
        saldo_banco_anterior: saldoBancoAnterior,
        saldo_banco_atual: novoSaldoAcumulado
      };

      if (compIdx !== -1) comps[compIdx] = compPayload;
      else comps.push(compPayload);

      const saldoIdx = saldos.findIndex(s => s.funcionario_id === funcionarioId);
      if (saldoIdx !== -1) {
        saldos[saldoIdx].saldo_acumulado = novoSaldoAcumulado;
      } else {
        saldos.push({ funcionario_id: funcionarioId, saldo_acumulado: novoSaldoAcumulado });
      }

      setLocal('pe_competencias', comps);
      setLocal('pe_banco_saldos', saldos);
    }

    return novoSaldoAcumulado;
  },

  async reabrirCompetencia(funcionarioId, mes, ano) {
    const comp = await this.getCompetencia(funcionarioId, mes, ano);
    if (!comp) return;

    // Se reabrir, precisamos desfazer a variação do saldo no banco de horas acumulado
    const saldoAtual = await this.getBancoHorasSaldo(funcionarioId);
    const saldoBancoAnterior = comp.saldo_banco_anterior; // O saldo anterior ao fechar este mês
    const variacao = comp.saldo_banco_atual - saldoBancoAnterior;
    
    // Novo saldo é o atual menos o que foi adicionado neste mês
    const novoSaldo = saldoAtual - variacao;

    if (useSupabase) {
      // 1. Deletar fechamento da competência
      const { error: compError } = await supabase
        .from('competencias_fechamento')
        .delete()
        .eq('funcionario_id', funcionarioId)
        .eq('mes', mes)
        .eq('ano', ano);
      if (compError) throw compError;

      // 2. Voltar saldo do banco de horas para o valor corrigido
      const { error: saldoError } = await supabase
        .from('banco_horas_saldo')
        .upsert({
          funcionario_id: funcionarioId,
          saldo_acumulado: minutesToHHMM(novoSaldo) + ':00',
          updated_at: new Date().toISOString()
        });
      if (saldoError) throw saldoError;
    } else {
      const comps = getLocal('pe_competencias');
      const saldos = getLocal('pe_banco_saldos');

      const filtradas = comps.filter(c => !(c.funcionario_id === funcionarioId && c.mes === mes && c.ano === ano));
      setLocal('pe_competencias', filtradas);

      const sIdx = saldos.findIndex(s => s.funcionario_id === funcionarioId);
      if (sIdx !== -1) {
        saldos[sIdx].saldo_acumulado = novoSaldo;
        setLocal('pe_banco_saldos', saldos);
      }
    }

    return novoSaldo;
  },

  // --- SOLICITAÇÕES DE CADASTRO (APROVAÇÕES) ---
  async getSolicitacoesCadastro() {
    return getLocal('pe_solicitacoes');
  },

  async criarSolicitacaoCadastro(nomeEmpresa, email, cnpj) {
    const solicitacoes = getLocal('pe_solicitacoes');
    const nova = {
      id: 'sol-' + Date.now(),
      nome_empresa: nomeEmpresa,
      cnpj: cnpj || 'Isento',
      email_solicitante: email,
      data_solicitacao: new Date().toISOString().split('T')[0],
      status: 'pendente'
    };
    solicitacoes.push(nova);
    setLocal('pe_solicitacoes', solicitacoes);
    return nova;
  },

  async aprovarSolicitacao(id) {
    const solicitacoes = getLocal('pe_solicitacoes');
    const idx = solicitacoes.findIndex(s => s.id === id);
    if (idx !== -1) {
      solicitacoes[idx].status = 'aprovado';
      setLocal('pe_solicitacoes', solicitacoes);

      // Ao aprovar, cria efetivamente a empresa no banco de dados local
      const empresas = getLocal('pe_empresas');
      const novaEmpresa = {
        id: 'emp-' + Date.now(),
        nome: solicitacoes[idx].nome_empresa,
        cnpj: solicitacoes[idx].cnpj
      };
      empresas.push(novaEmpresa);
      setLocal('pe_empresas', empresas);
    }
  },

  async rejeitarSolicitacao(id) {
    const solicitacoes = getLocal('pe_solicitacoes');
    const idx = solicitacoes.findIndex(s => s.id === id);
    if (idx !== -1) {
      solicitacoes[idx].status = 'rejeitado';
      setLocal('pe_solicitacoes', solicitacoes);
    }
  }
};
