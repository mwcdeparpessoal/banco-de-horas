-- SCRIPT SQL PARA CONFIGURAÇÃO DO BANCO DE DADOS NO SUPABASE
-- Copie e cole este script no Editor SQL do seu projeto do Supabase.

-- Habilitar a extensão uuid-ossp se não estiver ativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABELA DE EMPRESAS (Multi-tenant)
-- ==========================================
CREATE TABLE public.empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. TABELA DE FUNCIONÁRIOS
-- ==========================================
CREATE TABLE public.funcionarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    data_admissao DATE NOT NULL,
    ativo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_email_empresa UNIQUE (empresa_id, email)
);

-- ==========================================
-- 3. TABELA DE PERFIS DE USUÁRIOS (Supabase Auth Link)
-- ==========================================
CREATE TABLE public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
    role VARCHAR(50) CHECK (role IN ('admin', 'funcionario')) NOT NULL,
    funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 4. JORNADAS PREVISTAS (Por Funcionário / Dia da Semana)
-- ==========================================
CREATE TABLE public.jornadas_previstas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    horas_previstas INTERVAL NOT NULL DEFAULT '08:00:00'::interval,
    CONSTRAINT unique_funcionario_dia UNIQUE (funcionario_id, dia_semana)
);

-- ==========================================
-- 5. TABELA DE FERIADOS
-- ==========================================
CREATE TABLE public.feriados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    recorrente_anual BOOLEAN DEFAULT false NOT NULL,
    CONSTRAINT unique_data_empresa UNIQUE (empresa_id, data)
);

-- ==========================================
-- 6. COMPETÊNCIAS / FECHAMENTOS MENSAIS
-- ==========================================
CREATE TABLE public.competencias_fechamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    ano INTEGER NOT NULL,
    fechado BOOLEAN DEFAULT false NOT NULL,
    pagar_horas_extras BOOLEAN DEFAULT false NOT NULL, -- Se true, HE 50% são pagas. Se false, vão pro Banco.
    saldo_banco_anterior INTERVAL DEFAULT '00:00:00'::interval NOT NULL, -- Saldo herdado do mês anterior
    saldo_banco_atual INTERVAL DEFAULT '00:00:00'::interval NOT NULL, -- Saldo final deste mês
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_funcionario_competencia UNIQUE (funcionario_id, mes, ano)
);

-- ==========================================
-- 7. REGISTRO DE PONTO DIÁRIO
-- ==========================================
CREATE TABLE public.registros_ponto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    entrada_1 TIME,
    saida_1 TIME,
    entrada_2 TIME,
    saida_2 TIME,
    falta BOOLEAN DEFAULT false NOT NULL,
    feriado BOOLEAN DEFAULT false NOT NULL,
    
    -- Valores calculados inseridos pelo front-end (facilitando auditoria e flexibilidade)
    total_trabalhado INTERVAL DEFAULT '00:00:00'::interval NOT NULL,
    adicional_noturno INTERVAL DEFAULT '00:00:00'::interval NOT NULL,
    hora_extra_50 INTERVAL DEFAULT '00:00:00'::interval NOT NULL,
    hora_extra_100 INTERVAL DEFAULT '00:00:00'::interval NOT NULL,
    intrajornada INTERVAL DEFAULT '00:00:00'::interval NOT NULL,
    atraso INTERVAL DEFAULT '00:00:00'::interval NOT NULL,
    
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_funcionario_data UNIQUE (funcionario_id, data)
);

-- ==========================================
-- 8. SALDO ACUMULADO DO BANCO DE HORAS
-- ==========================================
CREATE TABLE public.banco_horas_saldo (
    funcionario_id UUID PRIMARY KEY REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    saldo_acumulado INTERVAL DEFAULT '00:00:00'::interval NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================================
-- 9. TRIGGERS E FUNÇÕES AUTOMÁTICAS (Banco de Horas)
-- ==========================================================

-- Função para criar automaticamente o registro de banco_horas_saldo quando um funcionário for criado
CREATE OR REPLACE FUNCTION public.handle_novo_funcionario()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.banco_horas_saldo (funcionario_id, saldo_acumulado)
    VALUES (NEW.id, '00:00:00'::interval);
    
    -- Criar jornadas padrão (Seg-Sex 8h, Sábado 4h, Domingo 0h)
    INSERT INTO public.jornadas_previstas (funcionario_id, dia_semana, horas_previstas) VALUES
    (NEW.id, 1, '08:00:00'::interval), -- Segunda
    (NEW.id, 2, '08:00:00'::interval), -- Terça
    (NEW.id, 3, '08:00:00'::interval), -- Quarta
    (NEW.id, 4, '08:00:00'::interval), -- Quinta
    (NEW.id, 5, '08:00:00'::interval), -- Sexta
    (NEW.id, 6, '04:00:00'::interval), -- Sábado
    (NEW.id, 0, '00:00:00'::interval); -- Domingo
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_novo_funcionario
AFTER INSERT ON public.funcionarios
FOR EACH ROW EXECUTE FUNCTION public.handle_novo_funcionario();


-- Função para criar/atualizar o perfil de usuário automaticamente ao registrar no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfis (id, role)
    VALUES (NEW.id, 'admin'); -- Por padrão, novos logins iniciam como administradores sem empresa associada
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- OBS: Se for usar o Supabase Auth com triggers na tabela auth.users, remova o comentário abaixo:
-- CREATE TRIGGER on_auth_user_created
-- AFTER INSERT ON auth.users
-- FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================================
-- 10. SEGURANÇA E POLÍTICAS RLS (Row Level Security)
-- ==========================================================
-- Habilitar RLS em todas as tabelas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jornadas_previstas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencias_fechamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banco_horas_saldo ENABLE ROW LEVEL SECURITY;

-- Exemplo de política de segurança RLS básica baseada no empresa_id do perfil do usuário logado:

-- Para Empresas: Usuário logado pode ler a empresa associada ao seu perfil
CREATE POLICY policy_select_empresa ON public.empresas
    FOR SELECT USING (
        id IN (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
    );

-- Permitir criação de empresa para usuários sem empresa cadastrada
CREATE POLICY policy_insert_empresa ON public.empresas
    FOR INSERT WITH CHECK (true);

-- Para Perfis: O próprio usuário lê e edita seu perfil
CREATE POLICY policy_perfis ON public.perfis
    FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Para Funcionários: Pertence à mesma empresa do perfil do usuário logado
CREATE POLICY policy_funcionarios ON public.funcionarios
    FOR ALL USING (
        empresa_id IN (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
    );

-- Para Feriados: Pertence à mesma empresa
CREATE POLICY policy_feriados ON public.feriados
    FOR ALL USING (
        empresa_id IN (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
    );

-- Para Jornadas: Funcionários pertencentes à empresa do usuário logado
CREATE POLICY policy_jornadas ON public.jornadas_previstas
    FOR ALL USING (
        funcionario_id IN (
            SELECT id FROM public.funcionarios 
            WHERE empresa_id IN (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
        )
    );

-- Para Registros de Ponto
CREATE POLICY policy_registros_ponto ON public.registros_ponto
    FOR ALL USING (
        funcionario_id IN (
            SELECT id FROM public.funcionarios 
            WHERE empresa_id IN (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
        )
    );

-- Para Competências
CREATE POLICY policy_competencias ON public.competencias_fechamento
    FOR ALL USING (
        funcionario_id IN (
            SELECT id FROM public.funcionarios 
            WHERE empresa_id IN (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
        )
    );

-- Para Saldo do Banco de Horas
CREATE POLICY policy_banco_horas ON public.banco_horas_saldo
    FOR ALL USING (
        funcionario_id IN (
            SELECT id FROM public.funcionarios 
            WHERE empresa_id IN (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
        )
    );
