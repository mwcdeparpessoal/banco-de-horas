import React, { useState, useEffect } from 'react';
import { Calendar, User, Save, Printer, Lock, Unlock, FileText, CheckSquare, Square } from 'lucide-react';
import { dbService } from '../lib/dbService';
import { minutesToHHMM, hhmmToMinutes, calcularPontoDiario } from '../utils/timeCalculations';

export default function EspelhoPonto({ role }) {
  const [funcionarios, setFuncionarios] = useState([]);
  const [selectedFuncId, setSelectedFuncId] = useState('');
  const [mes, setMes] = useState(5); // Maio por padrão para ver dados simulados
  const [ano, setAno] = useState(2026);
  
  const [registros, setRegistros] = useState([]);
  const [competencia, setCompetencia] = useState(null);
  const [saldoBancoAcumulado, setSaldoBancoAcumulado] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pagarHorasExtras, setPagarHorasExtras] = useState(false);
  
  // Orientação de impressão
  const [printOrientation, setPrintOrientation] = useState('landscape');

  const meses = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' }, { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
  ];

  const anos = [2025, 2026, 2027];
  const diasSemanaAbreviados = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  useEffect(() => {
    async function loadFuncs() {
      const data = await dbService.getFuncionarios();
      setFuncionarios(data);
      if (data.length > 0) {
        setSelectedFuncId(data[0].id);
      }
    }
    loadFuncs();
  }, []);

  useEffect(() => {
    if (selectedFuncId) {
      carregarFolha();
    }
  }, [selectedFuncId, mes, ano]);

  const carregarFolha = async () => {
    setLoading(true);
    try {
      const folha = await dbService.getRegistrosMes(selectedFuncId, mes, ano);
      setRegistros(folha);

      // Carregar competência (se fechada)
      const comp = await dbService.getCompetencia(selectedFuncId, mes, ano);
      setCompetencia(comp);
      if (comp) {
        setPagarHorasExtras(comp.pagar_horas_extras);
      } else {
        setPagarHorasExtras(false);
      }

      // Carregar saldo atual do banco de horas
      const saldo = await dbService.getBancoHorasSaldo(selectedFuncId);
      setSaldoBancoAcumulado(saldo);
    } catch (err) {
      console.error('Erro ao carregar folha:', err);
    } finally {
      setLoading(false);
    }
  };

  // Recalcula o dia em tempo real quando alterado no input
  const handleInputChange = (diaIdx, field, val) => {
    if (competencia?.fechado) return; // Não deixa editar se fechado

    setRegistros(prev => {
      const novos = [...prev];
      const antigo = novos[diaIdx];
      const atualizado = { ...antigo, [field]: val };
      
      // Recalcular as horas CLT do dia
      const calculados = calcularPontoDiario(atualizado);

      novos[diaIdx] = {
        ...atualizado,
        ...calculados
      };

      return novos;
    });
  };

  const handleToggleFalta = (diaIdx, isFalta) => {
    if (competencia?.fechado) return;
    
    setRegistros(prev => {
      const novos = [...prev];
      const antigo = novos[diaIdx];
      
      let atualizado;
      if (isFalta) {
        // Se faltou, limpa os horários
        atualizado = {
          ...antigo,
          falta: true,
          entrada_1: '',
          saida_1: '',
          entrada_2: '',
          saida_2: ''
        };
      } else {
        atualizado = { ...antigo, falta: false };
      }

      const calculados = calcularPontoDiario(atualizado);
      novos[diaIdx] = { ...atualizado, ...calculados };
      return novos;
    });
  };

  const handleSalvarTudo = async () => {
    if (role === 'visitante') {
      alert('Modo Visitante: Simulação concluída. Os cálculos foram processados na tela, mas não são gravados no banco de dados.');
      return;
    }
    if (competencia?.fechado) return;

    setSaving(true);
    try {
      // Salva apenas os registros que possuem alguma entrada ou falta marcada
      const promessas = registros.map(r => dbService.salvarRegistroDiario(r));
      await Promise.all(promessas);
      alert('Folha de ponto salva com sucesso!');
      carregarFolha();
    } catch (err) {
      console.error('Erro ao salvar folha:', err);
      alert('Erro ao salvar os registros de ponto.');
    } finally {
      setSaving(false);
    }
  };

  const handleFecharCompetencia = async () => {
    if (role === 'visitante') {
      alert('Modo Visitante: Simulação de fechamento concluída. Os saldos acumulados de banco de horas não serão gravados.');
      return;
    }
    if (!window.confirm('Ao fechar a competência, a edição dos horários será bloqueada e o saldo do banco de horas será atualizado. Deseja continuar?')) {
      return;
    }

    setSaving(true);
    try {
      // 1. Primeiro salva a folha para garantir cálculos corretos
      const promessas = registros.map(r => dbService.salvarRegistroDiario(r));
      await Promise.all(promessas);

      // 2. Calcula saldo total de horas a compensar/pagar
      const totalSomas = obterTotais();
      const novoSaldo = await dbService.fecharCompetencia(
        selectedFuncId, 
        mes, 
        ano, 
        pagarHorasExtras, 
        totalSomas.extra50 - totalSomas.atraso
      );
      
      alert(`Competência fechada com sucesso! Novo saldo do Banco de Horas: ${minutesToHHMM(novoSaldo)}`);
      carregarFolha();
    } catch (err) {
      console.error('Erro ao fechar competência:', err);
      alert('Falha ao fechar competência.');
    } finally {
      setSaving(false);
    }
  };

  const handleReabrirCompetencia = async () => {
    if (role === 'visitante') {
      alert('Modo Visitante: Simulação de reabertura.');
      return;
    }
    if (!window.confirm('Tem certeza que deseja reabrir a competência? Isso recalculará e reverterá o saldo do banco de horas deste mês.')) {
      return;
    }

    setSaving(true);
    try {
      const novoSaldo = await dbService.reabrirCompetencia(selectedFuncId, mes, ano);
      alert(`Competência reaberta! Saldo do Banco de Horas corrigido para: ${minutesToHHMM(novoSaldo)}`);
      carregarFolha();
    } catch (err) {
      console.error('Erro ao reabrir competência:', err);
      alert('Falha ao reabrir competência.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Calcular totais da folha
  const obterTotais = () => {
    let trab = 0;
    let noturno = 0;
    let extra50 = 0;
    let extra100 = 0;
    let intra = 0;
    let atraso = 0;
    let previstas = 0;

    registros.forEach(r => {
      trab += r.total_trabalhado || 0;
      noturno += r.adicional_noturno || 0;
      extra50 += r.hora_extra_50 || 0;
      extra100 += r.hora_extra_100 || 0;
      intra += r.intrajornada || 0;
      atraso += r.atraso || 0;
      previstas += r.horas_previstas_minutos || 0;
    });

    return { trab, noturno, extra50, extra100, intra, atraso, previstas };
  };

  const totais = obterTotais();
  const funcionarioAtivo = funcionarios.find(f => f.id === selectedFuncId);

  return (
    <div className={`animate-fade-in print-container ${printOrientation === 'landscape' ? 'print-landscape' : 'print-portrait'}`} style={styles.container}>
      
      {/* Barra de Filtros (Oculta na Impressão) */}
      <div className="card no-print" style={styles.filterCard}>
        <div style={styles.filterGroup}>
          <div className="input-group" style={{ flex: 2, marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} /> Funcionário
            </label>
            <select 
              value={selectedFuncId} 
              onChange={(e) => setSelectedFuncId(e.target.value)}
              style={{ width: '100%' }}
            >
              {funcionarios.map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>

          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> Mês
            </label>
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))} style={{ width: '100%' }}>
              {meses.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> Ano
            </label>
            <select value={ano} onChange={(e) => setAno(Number(e.target.value))} style={{ width: '100%' }}>
              {anos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Espelho de Ponto Card */}
      {funcionarioAtivo && (
        <div className="card" style={styles.sheetCard}>
          
          {/* Cabeçalho da Impressão (Exibido na Impressão e na Tela) */}
          <div style={styles.sheetHeader}>
            <div>
              <h2 style={styles.sheetTitle}>Espelho de Ponto Eletrônico</h2>
              <div style={styles.metaGrid}>
                <div><strong>Funcionário:</strong> {funcionarioAtivo.nome}</div>
                <div><strong>E-mail:</strong> {funcionarioAtivo.email}</div>
                <div><strong>Admissão:</strong> {new Date(funcionarioAtivo.data_admissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>
                <div><strong>Competência:</strong> {String(mes).padStart(2, '0')}/{ano}</div>
                <div>
                  <strong>Banco de Horas Atual: </strong> 
                  <span className={`badge ${saldoBancoAcumulado >= 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontWeight: 'bold' }}>
                    {minutesToHHMM(saldoBancoAcumulado)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações (Oculto na Impressão) */}
            <div className="no-print" style={styles.headerActions}>
              <div style={styles.printConfig}>
                <label style={styles.printConfigLabel}>Orientação do PDF:</label>
                <select 
                  value={printOrientation} 
                  onChange={(e) => setPrintOrientation(e.target.value)}
                  style={styles.printSelect}
                >
                  <option value="landscape">Paisagem (Recomendado)</option>
                  <option value="portrait">Retrato</option>
                </select>
              </div>

              <button className="btn btn-secondary" onClick={handlePrint}>
                <Printer size={18} /> Imprimir / PDF
              </button>

              {!competencia?.fechado && (
                <button className="btn btn-success" onClick={handleSalvarTudo} disabled={saving}>
                  <Save size={18} /> Salvar Ponto
                </button>
              )}
            </div>
          </div>

          {/* Tabela do Espelho */}
          {loading ? (
            <div style={styles.loadingText}>Carregando registros de ponto...</div>
          ) : (
            <div className="table-container">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Dia</th>
                    <th className="no-print" style={{ width: '60px' }}>Falta</th>
                    <th>Entr. 1</th>
                    <th>Saí. 1</th>
                    <th>Entr. 2</th>
                    <th>Saí. 2</th>
                    <th style={{ color: 'var(--text-primary)' }}>Previsto</th>
                    <th>Trabalhado</th>
                    <th>Ad. Noturno</th>
                    <th>H.E. 50%</th>
                    <th>H.E. 100%</th>
                    <th>Intrajornada</th>
                    <th>Atraso</th>
                    <th style={{ minWidth: '150px' }}>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r, idx) => {
                    const dataObj = new Date(r.data);
                    const diaNum = String(dataObj.getDate() + 1).padStart(2, '0'); // Evita fuso
                    const diaSemana = diasSemanaAbreviados[r.dia_semana];
                    const ehDiaUtil = r.dia_semana !== 0; // Domingo não é dia útil padrão
                    
                    let rowClass = '';
                    if (r.falta) rowClass = 'falta-row';
                    else if (r.feriado) rowClass = 'feriado-row';

                    return (
                      <tr key={r.data} className={rowClass}>
                        {/* Data */}
                        <td style={{ fontWeight: '600' }}>
                          {r.data.split('-')[2]} ({diaSemana})
                          {r.feriado && <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '1px 4px', display: 'block', marginTop: '2px' }}>FER</span>}
                        </td>

                        {/* Falta (Oculto na Impressão) */}
                        <td className="no-print">
                          <button 
                            type="button"
                            onClick={() => handleToggleFalta(idx, !r.falta)}
                            style={styles.checkboxBtn}
                            disabled={competencia?.fechado}
                          >
                            {r.falta ? <CheckSquare size={16} color="var(--color-danger)" /> : <Square size={16} color="var(--text-muted)" />}
                          </button>
                        </td>

                        {/* Horários */}
                        <td>
                          <input 
                            type="time" 
                            value={r.entrada_1 || ''} 
                            onChange={(e) => handleInputChange(idx, 'entrada_1', e.target.value)}
                            disabled={r.falta || competencia?.fechado}
                            style={styles.timeCellInput}
                          />
                        </td>
                        <td>
                          <input 
                            type="time" 
                            value={r.saida_1 || ''} 
                            onChange={(e) => handleInputChange(idx, 'saida_1', e.target.value)}
                            disabled={r.falta || competencia?.fechado}
                            style={styles.timeCellInput}
                          />
                        </td>
                        <td>
                          <input 
                            type="time" 
                            value={r.entrada_2 || ''} 
                            onChange={(e) => handleInputChange(idx, 'entrada_2', e.target.value)}
                            disabled={r.falta || competencia?.fechado}
                            style={styles.timeCellInput}
                          />
                        </td>
                        <td>
                          <input 
                            type="time" 
                            value={r.saida_2 || ''} 
                            onChange={(e) => handleInputChange(idx, 'saida_2', e.target.value)}
                            disabled={r.falta || competencia?.fechado}
                            style={styles.timeCellInput}
                          />
                        </td>

                        {/* Valores Calculados */}
                        <td style={{ color: 'var(--text-muted)' }}>{r.horas_previstas_str}</td>
                        <td style={{ fontWeight: '500' }}>{minutesToHHMM(r.total_trabalhado)}</td>
                        <td>{minutesToHHMM(r.adicional_noturno)}</td>
                        <td style={{ color: r.hora_extra_50 > 0 ? 'var(--color-success)' : 'inherit' }}>
                          {minutesToHHMM(r.hora_extra_50)}
                        </td>
                        <td style={{ color: r.hora_extra_100 > 0 ? 'var(--color-success)' : 'inherit' }}>
                          {minutesToHHMM(r.hora_extra_100)}
                        </td>
                        <td style={{ color: r.intrajornada > 0 ? 'var(--color-warning)' : 'inherit' }}>
                          {minutesToHHMM(r.intrajornada)}
                        </td>
                        <td style={{ color: r.atraso > 0 ? 'var(--color-danger)' : 'inherit' }}>
                          {minutesToHHMM(r.atraso)}
                        </td>

                        {/* Observação */}
                        <td>
                          <input 
                            type="text" 
                            value={r.observacao || ''} 
                            onChange={(e) => handleInputChange(idx, 'observacao', e.target.value)}
                            disabled={competencia?.fechado}
                            placeholder="..."
                            style={styles.obsCellInput}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* Linha de Totais */}
                  <tr style={styles.totaisRow}>
                    <td colSpan={2} className="no-print" style={{ fontWeight: 'bold' }}>Totais do Mês</td>
                    <td colSpan={1} className="print-only" style={{ fontWeight: 'bold' }}>Totais do Mês</td>
                    
                    <td colSpan={4}></td>
                    
                    <td style={{ fontWeight: 'bold' }}>{minutesToHHMM(totais.previstas)}</td>
                    <td style={{ fontWeight: 'bold' }}>{minutesToHHMM(totais.trab)}</td>
                    <td style={{ fontWeight: 'bold' }}>{minutesToHHMM(totais.noturno)}</td>
                    <td style={{ fontWeight: 'bold', color: totais.extra50 > 0 ? 'var(--color-success)' : 'inherit' }}>
                      {minutesToHHMM(totais.extra50)}
                    </td>
                    <td style={{ fontWeight: 'bold', color: totais.extra100 > 0 ? 'var(--color-success)' : 'inherit' }}>
                      {minutesToHHMM(totais.extra100)}
                    </td>
                    <td style={{ fontWeight: 'bold', color: totais.intra > 0 ? 'var(--color-warning)' : 'inherit' }}>
                      {minutesToHHMM(totais.intra)}
                    </td>
                    <td style={{ fontWeight: 'bold', color: totais.atraso > 0 ? 'var(--color-danger)' : 'inherit' }}>
                      {minutesToHHMM(totais.atraso)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Fechamento da Competência (Oculto na Impressão) */}
          {!loading && (
            <div className="no-print" style={styles.closingSection}>
              {competencia?.fechado ? (
                <div style={styles.closedAlert}>
                  <div style={styles.closedAlertText}>
                    <Lock size={18} />
                    <span>Esta competência está <strong>FECHADA</strong>. Edições de pontos estão bloqueadas.</span>
                  </div>
                  <button className="btn btn-secondary" onClick={handleReabrirCompetencia} disabled={saving}>
                    <Unlock size={16} /> Reabrir Mês
                  </button>
                </div>
              ) : (
                <div style={styles.openAlert}>
                  <div style={styles.closingControls}>
                    <div style={styles.checkboxGroup}>
                      <input 
                        type="checkbox" 
                        id="pagarHE" 
                        checked={pagarHorasExtras} 
                        onChange={(e) => setPagarHorasExtras(e.target.checked)} 
                        style={styles.checkbox}
                      />
                      <label htmlFor="pagarHE" style={styles.checkboxLabel}>
                        <strong>Pagar Horas Extras (50%) deste mês</strong>
                        <p style={styles.checkboxSub}>Se não marcado, as horas extras entrarão como saldo positivo no Banco de Horas do funcionário.</p>
                      </label>
                    </div>
                  </div>
                  <button className="btn btn-danger" onClick={handleFecharCompetencia} disabled={saving}>
                    <Lock size={16} /> Fechar Competência (05/2026)
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  filterCard: {
    padding: '16px 24px',
  },
  filterGroup: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
  },
  sheetCard: {
    padding: '24px',
  },
  sheetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '20px',
    marginBottom: '20px',
  },
  sheetTitle: {
    fontSize: '1.5rem',
    marginBottom: '12px',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(200px, 1fr))',
    gap: '10px 24px',
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  printConfig: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  printConfigLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  printSelect: {
    padding: '6px 10px',
    fontSize: '0.85rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  checkboxBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeCellInput: {
    width: '110px',
    padding: '4px 6px',
    fontSize: '0.85rem',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  obsCellInput: {
    width: '100%',
    minWidth: '100px',
    padding: '4px 8px',
    fontSize: '0.85rem',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  totaisRow: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderTop: '2px solid var(--text-secondary)',
  },
  loadingText: {
    textAlign: 'center',
    padding: '40px',
    color: 'var(--text-muted)',
    fontSize: '1rem',
  },
  closingSection: {
    marginTop: '24px',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '20px',
  },
  closedAlert: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
  },
  closedAlertText: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '0.92rem',
  },
  openAlert: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
  },
  closingControls: {
    flex: 1,
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  checkbox: {
    marginTop: '4px',
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  checkboxSub: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  }
};
