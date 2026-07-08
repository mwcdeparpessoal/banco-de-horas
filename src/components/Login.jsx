import React, { useState } from 'react';
import { Shield, Building2, KeyRound, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dbService } from '../lib/dbService';

const GithubIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export default function Login({ onLoginSuccess, isMock }) {
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [emailSolicitante, setEmailSolicitante] = useState('');
  const [showCadastroEmpresa, setShowCadastroEmpresa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleMockLogin = () => {
    setLoading(true);
    setTimeout(() => {
      onLoginSuccess({
        id: 'mock-user-1',
        email: 'admin@empresa.com',
        role: 'admin',
        empresa: { id: 'emp-123', nome: 'Minha Empresa Tech Ltda', cnpj: '12.345.678/0001-90' }
      });
      setLoading(false);
    }, 800);
  };

  const handleVisitorLogin = () => {
    setLoading(true);
    setTimeout(() => {
      onLoginSuccess({
        id: 'visitor-user',
        email: 'visitante@demonstracao.com',
        role: 'visitante',
        empresa: { id: 'emp-visitor', nome: 'Empresa Visitante (Simulação)', cnpj: 'Isento' }
      });
      setLoading(false);
    }, 500);
  };


  const handleGithubLogin = async () => {
    if (isMock) {
      handleMockLogin();
      return;
    }
    try {
      setLoading(true);
      setError('');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Falha ao autenticar com o GitHub.');
      setLoading(false);
    }
  };

  const handleCriarEmpresa = async (e) => {
    e.preventDefault();
    if (!nomeEmpresa || !emailSolicitante) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      await dbService.criarSolicitacaoCadastro(nomeEmpresa, emailSolicitante, cnpj);
      setSuccessMessage('Solicitação enviada com sucesso! Ela foi adicionada à fila de aprovação. O administrador do sistema precisa aprová-la no painel principal.');
      setNomeEmpresa('');
      setCnpj('');
      setEmailSolicitante('');
    } catch (err) {
      setError('Erro ao enviar solicitação.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.loginCard} className="card">
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>⏱️</div>
          <h1 style={styles.title}>Ponto Premium</h1>
          <p style={styles.subtitle}>Gestão de Ponto Eletrônico & CLT</p>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}
        {successMessage && <div style={styles.successAlert}>{successMessage}</div>}

        {successMessage ? (
          <div style={styles.content}>
            <button 
              onClick={() => {
                setSuccessMessage('');
                setShowCadastroEmpresa(false);
              }} 
              className="btn btn-primary"
            >
              Voltar ao Login
            </button>
          </div>
        ) : !showCadastroEmpresa ? (
          <div style={styles.content}>
            <div style={styles.infoBox}>
              <Shield size={18} color="var(--color-info)" />
              <span>
                {isMock 
                  ? 'Você está rodando no modo local com banco de dados simulado.' 
                  : 'Autentique-se para sincronizar seus dados em nuvem.'}
              </span>
            </div>

            <button 
              onClick={handleGithubLogin} 
              style={styles.githubBtn} 
              disabled={loading}
            >
              <GithubIcon />
              {loading ? 'Conectando...' : 'Entrar com o GitHub'}
            </button>

            {isMock && (
              <>
                <button 
                  onClick={handleMockLogin} 
                  style={styles.adminMockBtn} 
                  disabled={loading}
                >
                  <KeyRound size={18} />
                  {loading ? 'Acessando...' : 'Acessar Demonstrativo (Admin)'}
                </button>

                <button 
                  onClick={handleVisitorLogin} 
                  style={styles.visitorBtn} 
                  disabled={loading}
                >
                  <Eye size={18} />
                  {loading ? 'Acessando...' : 'Entrar como Visitante'}
                </button>
              </>
            )}

            <button 
              onClick={() => setShowCadastroEmpresa(true)} 
              style={styles.createCompanyLink}
            >
              Quero cadastrar uma nova empresa
            </button>
          </div>
        ) : (
          <form onSubmit={handleCriarEmpresa} style={styles.content}>
            <div style={styles.formTitleContainer}>
              <Building2 size={20} color="var(--accent-primary)" />
              <h2 style={styles.formTitle}>Solicitar Cadastro</h2>
            </div>

            <div className="input-group">
              <label>Nome da Empresa</label>
              <input 
                type="text" 
                placeholder="Ex: Minha Empresa Ltda" 
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>E-mail do Administrador Solicitante</label>
              <input 
                type="email" 
                placeholder="Ex: admin@empresa.com" 
                value={emailSolicitante}
                onChange={(e) => setEmailSolicitante(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>CNPJ (Opcional)</label>
              <input 
                type="text" 
                placeholder="Ex: 00.000.000/0001-00" 
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '10px' }}
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar Solicitação'}
            </button>

            <button 
              type="button" 
              onClick={() => setShowCadastroEmpresa(false)} 
              style={styles.cancelLink}
            >
              Voltar para o login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '85vh',
    padding: '20px',
  },
  loginCard: {
    maxWidth: '440px',
    width: '100%',
    textAlign: 'center',
    padding: '40px 30px',
    border: '1px solid var(--border-color)',
  },
  logoContainer: {
    marginBottom: '32px',
  },
  logoIcon: {
    fontSize: '3rem',
    marginBottom: '10px',
  },
  title: {
    fontSize: '2rem',
    color: 'var(--text-primary)',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  infoBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderRadius: '8px',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    textAlign: 'left',
    border: '1px solid rgba(14, 165, 233, 0.15)',
  },
  githubBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: '#24292e',
    color: '#ffffff',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  adminMockBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--grad-primary)',
    color: '#ffffff',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)',
  },
  visitorBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  createCompanyLink: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-primary)',
    fontSize: '0.85rem',
    cursor: 'pointer',
    textDecoration: 'underline',
    marginTop: '8px',
  },
  formTitleContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  formTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
  },
  cancelLink: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    cursor: 'pointer',
    marginTop: '8px',
  },
  errorAlert: {
    padding: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: 'var(--color-danger)',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '16px',
    textAlign: 'left',
  },
  successAlert: {
    padding: '12px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    color: 'var(--color-success)',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '16px',
    textAlign: 'left',
    lineHeight: '1.4',
  }
};
