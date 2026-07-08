import React, { useState, useEffect } from 'react';
import { Check, X, Building, Mail, Calendar, AlertCircle } from 'lucide-react';
import { dbService } from '../lib/dbService';

export default function Aprovacoes() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarSolicitacoes();
  }, []);

  const carregarSolicitacoes = async () => {
    setLoading(true);
    try {
      const data = await dbService.getSolicitacoesCadastro();
      setSolicitacoes(data);
    } catch (err) {
      console.error('Erro ao carregar solicitações:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAprovar = async (id) => {
    setLoading(true);
    try {
      await dbService.aprovarSolicitacao(id);
      alert('Cadastro aprovado com sucesso! A empresa e o usuário administrador foram ativados.');
      carregarSolicitacoes();
    } catch (err) {
      console.error(err);
      alert('Erro ao aprovar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejeitar = async (id) => {
    if (!window.confirm('Deseja realmente rejeitar esta solicitação?')) return;
    setLoading(true);
    try {
      await dbService.rejeitarSolicitacao(id);
      alert('Solicitação rejeitada.');
      carregarSolicitacoes();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={styles.container}>
      <div>
        <h2 style={styles.title}>Aprovações de Cadastro</h2>
        <p style={styles.subtitle}>Aprove ou recuse solicitações de novos administradores/empresas para acessar o Ponto Premium</p>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>CNPJ</th>
              <th>Solicitante (E-mail)</th>
              <th>Data de Solicitação</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {solicitacoes.map(sol => (
              <tr key={sol.id}>
                <td style={{ fontWeight: '600' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building size={16} color="var(--text-secondary)" />
                    {sol.nome_empresa}
                  </div>
                </td>
                <td>{sol.cnpj}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={14} color="var(--text-muted)" />
                    {sol.email_solicitante}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={14} color="var(--text-muted)" />
                    {new Date(sol.data_solicitacao).toLocaleDateString('pt-BR')}
                  </div>
                </td>
                <td>
                  <span className={`badge ${
                    sol.status === 'pendente' ? 'badge-warning' : 
                    sol.status === 'aprovado' ? 'badge-success' : 'badge-danger'
                  }`}>
                    {sol.status.toUpperCase()}
                  </span>
                </td>
                <td style={styles.actionsCell}>
                  {sol.status === 'pendente' && (
                    <>
                      <button 
                        onClick={() => handleAprovar(sol.id)} 
                        style={{ ...styles.actionBtn, backgroundColor: 'rgba(16, 185, 129, 0.1)' }} 
                        title="Aprovar Cadastro"
                        disabled={loading}
                      >
                        <Check size={16} color="var(--color-success)" />
                      </button>
                      <button 
                        onClick={() => handleRejeitar(sol.id)} 
                        style={{ ...styles.actionBtn, backgroundColor: 'rgba(239, 68, 68, 0.1)' }} 
                        title="Recusar Cadastro"
                        disabled={loading}
                      >
                        <X size={16} color="var(--color-danger)" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {solicitacoes.length === 0 && !loading && (
              <tr>
                <td colSpan="6" style={styles.emptyCell}>
                  <div style={styles.emptyContent}>
                    <AlertCircle size={20} />
                    <span>Nenhuma solicitação de cadastro pendente.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
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
  emptyContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '0.9rem',
  }
};
