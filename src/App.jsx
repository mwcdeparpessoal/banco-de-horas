import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Calendar, Clock, LogOut, Sun, Moon, Database, CheckSquare, Eye } from 'lucide-react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Funcionarios from './components/Funcionarios';
import Feriados from './components/Feriados';
import EspelhoPonto from './components/EspelhoPonto';
import Aprovacoes from './components/Aprovacoes';

// Detectar se o Supabase está configurado
const isMockMode = !(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  import.meta.env.VITE_SUPABASE_URL !== 'YOUR_SUPABASE_URL'
);

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');

  // Inicializar o Tema
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('dashboard');
  };

  // Se não estiver logado, renderiza o Login
  if (!user) {
    return (
      <Login 
        onLoginSuccess={(userData) => {
          setUser(userData);
          if (userData.role === 'visitante') {
            setActiveTab('ponto');
          } else {
            setActiveTab('dashboard');
          }
        }} 
        isMock={isMockMode} 
      />
    );
  }

  const isVisitor = user.role === 'visitante';
  const isMasterAdmin = user.email === 'admin@empresa.com';

  return (
    <div style={styles.appContainer} className="animate-fade-in">
      
      {/* Banner de Status (Oculto na Impressão) */}
      {isVisitor ? (
        <div className="no-print" style={styles.visitorBanner}>
          <Eye size={14} />
          <span>Modo Visitante: Lançamentos e fechamentos diários são apenas simulações temporárias que não salvam dados.</span>
        </div>
      ) : (
        <div className="no-print" style={isMockMode ? styles.mockBanner : styles.cloudBanner}>
          <Database size={14} />
          <span>
            {isMockMode 
              ? 'Rodando em Modo de Demonstração (LocalStorage). Configure o arquivo .env com suas chaves do Supabase para salvar em nuvem.'
              : `Conectado ao Supabase - Empresa: ${user.empresa?.nome || 'Não definida'}`}
          </span>
        </div>
      )}

      <div style={styles.mainLayout}>
        {/* SIDEBAR (Oculto na Impressão) */}
        <aside className="no-print" style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <div style={styles.logoBadge}>⏱️</div>
            <div>
              <h3 style={styles.companyName}>{user.empresa?.nome || 'Ponto Premium'}</h3>
              <p style={styles.roleName}>{isVisitor ? 'Visitante' : 'Administrador'}</p>
            </div>
          </div>

          <nav style={styles.nav}>
            <button 
              onClick={() => setActiveTab('dashboard')} 
              style={{...styles.navItem, ...(activeTab === 'dashboard' ? styles.navItemActive : {})}}
            >
              <LayoutDashboard size={18} />
              Painel
            </button>
            
            {!isVisitor && (
              <>
                <button 
                  onClick={() => setActiveTab('funcionarios')} 
                  style={{...styles.navItem, ...(activeTab === 'funcionarios' ? styles.navItemActive : {})}}
                >
                  <Users size={18} />
                  Funcionários
                </button>
                <button 
                  onClick={() => setActiveTab('feriados')} 
                  style={{...styles.navItem, ...(activeTab === 'feriados' ? styles.navItemActive : {})}}
                >
                  <Calendar size={18} />
                  Feriados
                </button>
              </>
            )}
            
            <button 
              onClick={() => setActiveTab('ponto')} 
              style={{...styles.navItem, ...(activeTab === 'ponto' ? styles.navItemActive : {})}}
            >
              <Clock size={18} />
              Espelho de Ponto
            </button>

            {isMasterAdmin && (
              <button 
                onClick={() => setActiveTab('aprovacoes')} 
                style={{...styles.navItem, ...(activeTab === 'aprovacoes' ? styles.navItemActive : {})}}
              >
                <CheckSquare size={18} />
                Aprovações
              </button>
            )}
          </nav>

          <div style={styles.sidebarFooter}>
            <button onClick={toggleTheme} style={styles.footerBtn} title="Alternar Tema">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>
            <button onClick={handleLogout} style={{ ...styles.footerBtn, color: 'var(--color-danger)' }} title="Sair">
              <LogOut size={18} />
              <span>Sair</span>
            </button>
          </div>
        </aside>

        {/* ÁREA DE CONTEÚDO PRINCIPAL */}
        <main style={styles.contentArea}>
          {/* Header da Área de Trabalho (Oculto na Impressão) */}
          <header className="no-print" style={styles.topHeader}>
            <span style={styles.welcomeText}>Bem-vindo de volta, <strong>{user.email}</strong></span>
            <div style={styles.dateDisplay}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </header>

          {/* Views Condicionais */}
          <div style={styles.viewWrapper}>
            {activeTab === 'dashboard' && <Dashboard />}
            {!isVisitor && activeTab === 'funcionarios' && <Funcionarios />}
            {!isVisitor && activeTab === 'feriados' && <Feriados />}
            {activeTab === 'ponto' && <EspelhoPonto role={user.role} />}
            {isMasterAdmin && activeTab === 'aprovacoes' && <Aprovacoes />}
          </div>
        </main>
      </div>
    </div>
  );

}

const styles = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    width: '100vw',
    overflowX: 'hidden',
  },
  mockBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
    color: 'var(--color-warning)',
    padding: '8px 16px',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    textAlign: 'center',
    fontWeight: '500',
  },
  cloudBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderBottom: '1px solid rgba(16, 185, 129, 0.25)',
    color: 'var(--color-success)',
    padding: '8px 16px',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    textAlign: 'center',
    fontWeight: '500',
  },
  visitorBanner: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderBottom: '1px solid rgba(99, 102, 241, 0.25)',
    color: 'var(--accent-primary)',
    padding: '8px 16px',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    textAlign: 'center',
    fontWeight: '500',
  },
  mainLayout: {
    display: 'flex',
    flex: 1,
    height: '100%',
  },
  sidebar: {
    width: '260px',
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '24px 16px',
    height: 'calc(100vh - 35px)', // Desconto do banner de status
    position: 'sticky',
    top: '35px',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
  },
  logoBadge: {
    fontSize: '1.8rem',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '10px',
    padding: '6px',
  },
  companyName: {
    fontSize: '1rem',
    color: 'var(--text-primary)',
    fontWeight: '700',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '160px',
  },
  roleName: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '0.92rem',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all var(--transition-fast)',
  },
  navItemActive: {
    background: 'var(--grad-primary)',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
  },
  sidebarFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '16px',
  },
  footerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '0.88rem',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all var(--transition-fast)',
  },
  contentArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    padding: '30px 40px',
    overflowY: 'auto',
    height: 'calc(100vh - 35px)',
  },
  topHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '16px',
    marginBottom: '24px',
  },
  welcomeText: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
  },
  dateDisplay: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  viewWrapper: {
    flex: 1,
  }
};
