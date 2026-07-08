import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CalendarClock, UserPlus, Save, X } from 'lucide-react';
import { dbService } from '../lib/dbService';

export default function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJornadaModalOpen, setIsJornadaModalOpen] = useState(false);
  
  // States para Formulários
  const [selectedFunc, setSelectedFunc] = useState(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [dataAdmissao, setDataAdmissao] = useState('');
  
  // State para Jornada Semanal (0 = Domingo a 6 = Sábado)
  const [jornadas, setJornadas] = useState([]);

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  const carregarFuncionarios = async () => {
    setLoading(true);
    try {
      const data = await dbService.getFuncionarios();
      setFuncionarios(data);
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setSelectedFunc(null);
    setNome('');
    setEmail('');
    setDataAdmissao(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (f) => {
    setSelectedFunc(f);
    setNome(f.nome);
    setEmail(f.email);
    setDataAdmissao(f.data_admissao);
    setIsModalOpen(true);
  };

  const handleOpenJornadaModal = async (f) => {
    setSelectedFunc(f);
    setLoading(true);
    try {
      const data = await dbService.getJornadas(f.id);
      
      // Ordenar e garantir que tenhamos todos os 7 dias (0 a 6)
      const ordenado = Array.from({ length: 7 }, (_, i) => {
        const existente = data.find(j => j.dia_semana === i);
        return existente || { dia_semana: i, horas_previstas: i === 0 ? '00:00' : (i === 6 ? '04:00' : '08:00') };
      });
      setJornadas(ordenado);
      setIsJornadaModalOpen(true);
    } catch (err) {
      console.error('Erro ao buscar jornadas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarFuncionario = async (e) => {
    e.preventDefault();
    if (!nome || !email || !dataAdmissao) return;

    setLoading(true);
    try {
      const payload = {
        id: selectedFunc?.id,
        nome,
        email,
        data_admissao: dataAdmissao
      };
      await dbService.salvarFuncionario(payload);
      setIsModalOpen(false);
      carregarFuncionarios();
    } catch (err) {
      console.error('Erro ao salvar funcionário:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarJornadas = async () => {
    if (!selectedFunc) return;
    setLoading(true);
    try {
      await dbService.salvarJornadas(selectedFunc.id, jornadas);
      setIsJornadaModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar jornadas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExcluirFuncionario = async (id) => {
    if (!window.confirm('Tem certeza que deseja inativar este funcionário?')) return;
    setLoading(true);
    try {
      await dbService.excluirFuncionario(id);
      carregarFuncionarios();
    } catch (err) {
      console.error('Erro ao inativar funcionário:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJornadaHoraChange = (diaSemana, value) => {
    setJornadas(prev => prev.map(j => j.dia_semana === diaSemana ? { ...j, horas_previstas: value } : j));
  };

  const diasSemanaNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  return (
    <div className="animate-fade-in" style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Gestão de Funcionários</h2>
          <p style={styles.subtitle}>Cadastre e configure a jornada de trabalho diária</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <UserPlus size={18} />
          Novo Funcionário
        </button>
      </div>

      {/* Tabela de Funcionários */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Data de Admissão</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {funcionarios.map(f => (
              <tr key={f.id}>
                <td style={{ fontWeight: '600' }}>{f.nome}</td>
                <td>{f.email}</td>
                <td>{new Date(f.data_admissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td>
                  <span className={`badge ${f.ativo ? 'badge-success' : 'badge-danger'}`}>
                    {f.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={styles.actionsCell}>
                  <button 
                    onClick={() => handleOpenJornadaModal(f)} 
                    style={styles.actionBtn} 
                    title="Configurar Horas Previstas por Dia"
                  >
                    <CalendarClock size={16} color="var(--accent-primary)" />
                  </button>
                  <button 
                    onClick={() => handleOpenEditModal(f)} 
                    style={styles.actionBtn} 
                    title="Editar Dados Básicos"
                  >
                    <Edit2 size={16} color="var(--text-secondary)" />
                  </button>
                  <button 
                    onClick={() => handleExcluirFuncionario(f.id)} 
                    style={styles.actionBtn} 
                    title="Inativar Funcionário"
                  >
                    <Trash2 size={16} color="var(--color-danger)" />
                  </button>
                </td>
              </tr>
            ))}
            {funcionarios.length === 0 && !loading && (
              <tr>
                <td colSpan="5" style={styles.emptyCell}>Nenhum funcionário cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Adicionar / Editar Funcionário */}
      {isModalOpen && (
        <div style={styles.backdrop}>
          <div className="card" style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{selectedFunc ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
              <button style={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarFuncionario} style={styles.modalForm}>
              <div className="input-group">
                <label>Nome Completo</label>
                <input 
                  type="text" 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  placeholder="Ex: João Silva"
                  required 
                />
              </div>

              <div className="input-group">
                <label>E-mail</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="Ex: joao@empresa.com"
                  required 
                />
              </div>

              <div className="input-group">
                <label>Data de Admissão</label>
                <input 
                  type="date" 
                  value={dataAdmissao} 
                  onChange={(e) => setDataAdmissao(e.target.value)} 
                  required 
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Save size={18} />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Configurar Horas Previstas (Jornada) */}
      {isJornadaModalOpen && (
        <div style={styles.backdrop}>
          <div className="card" style={styles.modalLarge}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Jornada Semanal Prevista</h3>
                <p style={styles.modalSub}>{selectedFunc?.nome}</p>
              </div>
              <button style={styles.closeBtn} onClick={() => setIsJornadaModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.modalForm}>
              <p style={styles.infoText}>
                Insira a quantidade prevista de horas de trabalho para cada dia da semana. Ex: Segunda a Sexta 08:00, Sábado 04:00, Domingo 00:00.
              </p>

              <div style={styles.jornadaGrid}>
                {jornadas.map(j => (
                  <div key={j.dia_semana} style={styles.jornadaRow}>
                    <span style={styles.diaNome}>{diasSemanaNomes[j.dia_semana]}</span>
                    <input 
                      type="time" 
                      value={j.horas_previstas.substring(0, 5)} 
                      onChange={(e) => handleJornadaHoraChange(j.dia_semana, e.target.value)} 
                      style={styles.timeInput}
                    />
                  </div>
                ))}
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsJornadaModalOpen(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSalvarJornadas} disabled={loading}>
                  <Save size={18} />
                  Salvar Jornada
                </button>
              </div>
            </div>
          </div>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.75rem',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  actionsCell: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  actionBtn: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  emptyCell: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '30px 0',
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: '20px',
  },
  modal: {
    maxWidth: '480px',
    width: '100%',
    padding: '24px',
    boxShadow: 'var(--shadow-lg)',
    animation: 'fadeIn 0.3s ease-out',
  },
  modalLarge: {
    maxWidth: '600px',
    width: '100%',
    padding: '24px',
    boxShadow: 'var(--shadow-lg)',
    animation: 'fadeIn 0.3s ease-out',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '14px',
    marginBottom: '16px',
  },
  modalTitle: {
    fontSize: '1.2rem',
    color: 'var(--text-primary)',
  },
  modalSub: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '16px',
  },
  infoText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  jornadaGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  jornadaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
  },
  diaNome: {
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  timeInput: {
    width: '100px',
    padding: '6px 10px',
    fontSize: '0.9rem',
  }
};
