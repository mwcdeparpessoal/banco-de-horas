// ═══════════════════════════════════════════════════════════
//  CONFIGURAÇÃO DO SUPABASE
//  Edite este arquivo uma vez no GitHub e as credenciais
//  ficam disponíveis em qualquer dispositivo/navegador.
// ═══════════════════════════════════════════════════════════

const SUPABASE_CONFIG = {
  url: 'https://unztmlyhgggvlawbufrv.supabase.co',   // <- cole aqui a URL do seu projeto
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuenRtbHloZ2dndmxhd2J1ZnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzQ0OTUsImV4cCI6MjA5NjI1MDQ5NX0.T-BqtxUxDcTDnSi8XV3mZIJyhtdakN9UhW_BMAVSsm0'                  // <- cole aqui a anon key
};

// ───────────────────────────────────────────────────────────
//  SQL para criar as tabelas no Supabase (rode no SQL Editor)
// ───────────────────────────────────────────────────────────
//
//  -- Tabela de batidas brutas de ponto
//  CREATE TABLE ponto_registros (
//    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//    funcionario text NOT NULL,
//    mes_ref     text NOT NULL,
//    data_str    text NOT NULL,
//    dia         integer NOT NULL,
//    e1 text, s1 text, e2 text, s2 text,
//    falta       boolean DEFAULT false,
//    feriado     boolean DEFAULT false,
//    carga_horas numeric DEFAULT 0,
//    created_at  timestamptz DEFAULT now(),
//    updated_at  timestamptz DEFAULT now(),
//    UNIQUE(funcionario, data_str)
//  );
//
//  -- Tabela do banco de horas (totalizadores calculados)
//  CREATE TABLE banco_horas (
//    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//    funcionario text NOT NULL,
//    mes_ref     text NOT NULL,
//    dia         integer NOT NULL,
//    data_str    text,
//    he_50           numeric DEFAULT 0,
//    he_100          numeric DEFAULT 0,
//    atraso          numeric DEFAULT 0,
//    intrajornada    numeric DEFAULT 0,
//    add_noturno     numeric DEFAULT 0,
//    add_noturno_red numeric DEFAULT 0,
//    falta       boolean DEFAULT false,
//    created_at  timestamptz DEFAULT now()
//  );
//
//  -- Habilitar acesso (ajuste RLS conforme sua necessidade de segurança)
//  ALTER TABLE ponto_registros ENABLE ROW LEVEL SECURITY;
//  ALTER TABLE banco_horas     ENABLE ROW LEVEL SECURITY;
//
//  CREATE POLICY "Acesso total ponto"  ON ponto_registros FOR ALL USING (true) WITH CHECK (true);
//  CREATE POLICY "Acesso total banco"  ON banco_horas     FOR ALL USING (true) WITH CHECK (true);
