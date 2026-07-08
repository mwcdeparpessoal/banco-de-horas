import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Save, X, RefreshCw } from 'lucide-react';
import { dbService } from '../lib/dbService';

export default function Feriados() {
  const [feriados, setFeriados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State formulário
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState('');
  const [recorrenteAnual, setRecorrenteAnual] = useState(false);

  useEffect(() => {
    carregarFeriados();
  }, []);

  const carregarFeriados = async () => {
    setLoading(true);
    try {
      const data = await dbService.getFeriados();
      setFeriados(data);
    } catch (err) {
      console.error('Erro ao carregar feriados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setDescricao('');
    setData(new Date().toISOString().split('T')[0]);
    setRecorrenteAnual(false);
    setIsModalOpen(true);
  };

  const handleSalvarFeriado = async (e) => {
    e.preventDefault();
    if (!descricao || !data) return;

    setLoading(true);
    try {
      const payload = {
        descricao,
        data,
        recorrente_anual: recorrenteAnual
      };
      await dbService.salvarFeriado(payload);
      setIsModalOpen(false);
      carregarFeriados();
    } catch (err) {
      console.error('Erro ao salvar feriado:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExcluirFeriado = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este feriado?')) return;
    setLoading(true);
    try {
      await dbService.excluirFeriado(id);
      carregarFeriados();
    } catch (err) {
      console.error('Erro ao excluir feriado:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Feriados da Empresa</h2>
          <p style={styles.subtitle}>Gerencie os feriados locais e nacionais para cálculo de horas extras 100%</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={18} />
          Cadastrar Feriado
        </button>
      </div>

      {/* Grid de Feriados */}
      <div style={styles.grid}>
        {feriados.map(fer => (
          <div key={fer.id} className="card" style={styles.feriadoCard}>
            <div style={styles.cardInfo}>
              <div style={styles.iconContainer}>
                <Calendar size={24} color="var(--accent-primary)" />
              </div>
              <div style={styles.textContainer}>
                <h4 style={styles.cardTitle}>{fer.descricao}</h4>
                <p style={styles.cardDate}>
                  {new Date(fer.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </p>
                {fer.recorrente_anual && (
                  <span className="badge badge-info" style={{ marginTop: '6px' }}>
                    <RefreshCw size={10} style={{ marginRight: '4px' }} />
                    Recorrente todo ano
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={() => handleExcluirFeriado(fer.id)} 
              style={styles.deleteBtn}
              title="Excluir Feriado"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {feriados.length === 0 && !loading && (
          <div className="card" style={styles.emptyCard}>
            <p style={styles.emptyText}>Nenhum feriado cadastrado ainda.</p>
          </div>
        )}
      </div>

      {/* MODAL: Cadastrar Feriado */}
      {isModalOpen && (
        <div style={styles.backdrop}>
          <div className="card" style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Cadastrar Feriado</h3>
              <button style={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarFeriado} style={styles.modalForm}>
              <div className="input-group">
                <label>Descrição / Nome do Feriado</label>
                <input 
                  type="text" 
                  value={descricao} 
                  onChange={(e) => setDescricao(e.target.value)} 
                  placeholder="Ex: Confraternização Universal"
                  required 
                />
              </div>

              <div className="input-group">
                <label>Data</label>
                <input 
                  type="date" 
                  value={data} 
                  onChange={(e) => setData(e.target.value)} 
                  required 
                />
              </div>

              <div style={styles.checkboxGroup}>
                <input 
                  type="checkbox" 
                  id="recorrente" 
                  checked={recorrenteAnual} 
                  onChange={(e) => setRecorrenteAnual(e.target.checked)} 
                  style={styles.checkbox}
                />
                <label htmlFor="recorrente" style={styles.checkboxLabel}>
                  Este feriado se repete anualmente no mesmo dia e mês
                </label>
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginTop: '10px',
  },
  feriadoCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px',
  },
  cardInfo: {
    display: 'flex',
    gap: '14px',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: '10px',
    flexShrink: 0,
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  cardTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  cardDate: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    '&:hover': {
      color: 'var(--color-danger)'
    }
  },
  emptyCard: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px',
    color: 'var(--text-muted)',
  },
  emptyText: {
    fontSize: '0.9rem',
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
    maxWidth: '440px',
    width: '100%',
    padding: '24px',
    boxShadow: 'var(--shadow-lg)',
    animation: 'fadeIn 0.3s ease-out',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '14px',
    marginBottom: '16px',
  },
  modalTitle: {
    fontSize: '1.2rem',
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
  checkboxGroup: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginTop: '4px',
  },
  checkbox: {
    marginTop: '3px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    cursor: 'pointer',
    userSelect: 'none',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '16px',
  }
};
