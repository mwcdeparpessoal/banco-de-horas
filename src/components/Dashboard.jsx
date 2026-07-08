import React, { useEffect, useState } from 'react';
import { Users, Clock, Moon, AlertCircle, Calendar } from 'lucide-react';
import { dbService } from '../lib/dbService';
import { minutesToHHMM } from '../utils/timeCalculations';

export default function Dashboard() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [stats, setStats] = useState({
    totalFuncionarios: 0,
    horasTrabalhadas: 0,
    horasExtras: 0,
    adicionalNoturno: 0,
    atrasos: 0
  });
  const [bancoSaldos, setBancoSaldos] = useState({});

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const funcs = await dbService.getFuncionarios();
        const fers = await dbService.getFeriados();
        
        setFuncionarios(funcs);
        setFeriados(fers.slice(0, 3)); // Pegar os primeiros 3 próximos feriados

        // Calcular estatísticas agregadas de todos os funcionários para a competência atual (Julho 2026 / Mês atual)
        const hoje = new Date();
        const mesAtual = 5; // Maio/2026 pré-populado
        const anoAtual = 2026;

        let totalTrab = 0;
        let totalExtras = 0;
        let totalNoturno = 0;
        let totalAtrasos = 0;
        const saldosTemp = {};

        for (const f of funcs) {
          // Saldo do banco
          const saldo = await dbService.getBancoHorasSaldo(f.id);
          saldosTemp[f.id] = saldo;

          // Lançamentos do mês
          const registros = await dbService.getRegistrosMes(f.id, mesAtual, anoAtual);
          registros.forEach(r => {
            totalTrab += r.total_trabalhado || 0;
            totalExtras += (r.hora_extra_50 || 0) + (r.hora_extra_100 || 0);
            totalNoturno += r.adicional_noturno || 0;
            totalAtrasos += r.atraso || 0;
          });
        }

        setBancoSaldos(saldosTemp);
        setStats({
          totalFuncionarios: funcs.length,
          horasTrabalhadas: totalTrab,
          horasExtras: totalExtras,
          adicionalNoturno: totalNoturno,
          atrasos: totalAtrasos
        });
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="animate-fade-in" style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Painel de Controle</h2>
        <p style={styles.subtitle}>Resumo consolidado da competência: 05/2026</p>
      </div>

      {/* Grid de Estatísticas */}
      <div className="grid-cols-4" style={styles.statsGrid}>
        <div className="card" style={styles.statCard}>
          <div style={{ ...styles.iconBg, background: 'rgba(99, 102, 241, 0.15)' }}>
            <Users color="var(--accent-primary)" size={24} />
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Funcionários Ativos</span>
            <span style={styles.statValue}>{stats.totalFuncionarios}</span>
          </div>
        </div>

        <div className="card" style={styles.statCard}>
          <div style={{ ...styles.iconBg, background: 'rgba(16, 185, 129, 0.15)' }}>
            <Clock color="var(--color-success)" size={24} />
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Horas Extras (50% + 100%)</span>
            <span style={styles.statValue}>{minutesToHHMM(stats.horasExtras)}</span>
          </div>
        </div>

        <div className="card" style={styles.statCard}>
          <div style={{ ...styles.iconBg, background: 'rgba(168, 85, 247, 0.15)' }}>
            <Moon color="var(--accent-secondary)" size={24} />
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Adicional Noturno (Reduzido)</span>
            <span style={styles.statValue}>{minutesToHHMM(stats.adicionalNoturno)}</span>
          </div>
        </div>

        <div className="card" style={styles.statCard}>
          <div style={{ ...styles.iconBg, background: 'rgba(239, 68, 68, 0.15)' }}>
            <AlertCircle color="var(--color-danger)" size={24} />
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Horas de Atraso Acumuladas</span>
            <span style={styles.statValue}>{minutesToHHMM(stats.atrasos)}</span>
          </div>
        </div>
      </div>

      <div className="grid-cols-2" style={styles.listsGrid}>
        {/* Banco de Horas dos Funcionários */}
        <div className="card" style={styles.listCard}>
          <h3 style={styles.listTitle}>Banco de Horas (Saldo Acumulado)</h3>
          <div style={styles.listContent}>
            {funcionarios.map(f => {
              const saldo = bancoSaldos[f.id] || 0;
              const isPositive = saldo > 0;
              const isNegative = saldo < 0;
              
              let badgeClass = 'badge-info';
              if (isPositive) badgeClass = 'badge-success';
              if (isNegative) badgeClass = 'badge-danger';

              return (
                <div key={f.id} style={styles.listItem}>
                  <div>
                    <div style={styles.itemName}>{f.nome}</div>
                    <div style={styles.itemSub}>{f.email}</div>
                  </div>
                  <span className={`badge ${badgeClass}`} style={styles.saldoBadge}>
                    {minutesToHHMM(saldo)}
                  </span>
                </div>
              );
            })}
            {funcionarios.length === 0 && (
              <p style={styles.emptyText}>Nenhum funcionário cadastrado.</p>
            )}
          </div>
        </div>

        {/* Feriados do Mês / Próximos */}
        <div className="card" style={styles.listCard}>
          <h3 style={styles.listTitle}>Próximos Feriados Cadastrados</h3>
          <div style={styles.listContent}>
            {feriados.map(fer => (
              <div key={fer.id} style={styles.listItem}>
                <div style={styles.feriadoInfo}>
                  <Calendar size={16} color="var(--text-secondary)" />
                  <div>
                    <div style={styles.itemName}>{fer.descricao}</div>
                    <div style={styles.itemSub}>
                      {new Date(fer.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      {fer.recorrente_anual && ' (Anual)'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {feriados.length === 0 && (
              <p style={styles.emptyText}>Nenhum feriado cadastrado para esta empresa.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    marginBottom: '8px',
  },
  title: {
    fontSize: '1.75rem',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  statsGrid: {
    marginBottom: '8px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
  },
  iconBg: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '12px',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginTop: '2px',
    fontFamily: 'var(--font-title)',
  },
  listsGrid: {
    marginTop: '8px',
  },
  listCard: {
    padding: '24px',
  },
  listTitle: {
    fontSize: '1.1rem',
    marginBottom: '16px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
  },
  listContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
  },
  itemName: {
    fontSize: '0.95rem',
    fontWeight: '600',
  },
  itemSub: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  saldoBadge: {
    fontSize: '0.85rem',
    padding: '4px 12px',
    fontWeight: '700',
  },
  feriadoInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  emptyText: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    textAlign: 'center',
    padding: '20px 0',
  }
};
