# 🕐 Sistema de Banco de Horas

Sistema completo de controle de ponto e banco de horas com integração Supabase.

## ✅ Funcionalidades

- **Carga horária configurável** por dia da semana (Seg–Dom)
- **Feriados** destacados na tabela com HE 100%
- **Mês de referência** dinâmico — tabela gerada conforme o mês
- **Lançamento de ponto** com entrada/saída em dois períodos
- **Cálculo automático** de:
  - ✅ Total de horas trabalhadas
  - ✅ Hora Extra 50% (excedente em dia normal → vai pro banco)
  - ✅ Hora Extra 100% (feriado — qualquer hora trabalhada)
  - ✅ Atraso (trabalhado < previsto)
  - ✅ Intrajornada (intervalo < 1h em jornada > 6h)
  - ✅ Adicional Noturno (22h–5h, +20%)
  - ✅ Adicional Noturno Reduzido (hora noturna = 52min30s, CLT art. 73)
  - ✅ Marcação de FALTA
- **Banco de Horas** com saldo acumulado
- **Exportação** em PDF Retrato ou Paisagem
- **Supabase** para persistência e acesso de qualquer lugar

---

## 🚀 Publicar no GitHub Pages

### 1. Criar o repositório

```bash
git init
git add .
git commit -m "feat: sistema banco de horas"
```

Crie um repositório no GitHub (ex: `banco-horas`) e faça push:

```bash
git remote add origin https://github.com/SEU_USUARIO/banco-horas.git
git branch -M main
git push -u origin main
```

### 2. Ativar GitHub Pages

1. No repositório → **Settings** → **Pages**
2. Em *Source*, selecione **Deploy from a branch**
3. Branch: `main`, pasta: `/ (root)`
4. Clique **Save**

Após alguns minutos, o sistema estará disponível em:
`https://SEU_USUARIO.github.io/banco-horas/`

---

## 🗄️ Configurar o Supabase

### 1. Criar projeto
Acesse [supabase.com](https://supabase.com), crie um projeto e anote:
- **Project URL** (ex: `https://xyzabc.supabase.co`)
- **Anon Key** (em Settings → API)

### 2. Criar a tabela

No painel Supabase → **SQL Editor**, execute:

```sql
CREATE TABLE banco_horas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario text NOT NULL,
  mes_ref text NOT NULL,         -- formato: "2025-06"
  dia integer NOT NULL,
  data_str text,                 -- formato: "2025-06-15"
  he_50 numeric DEFAULT 0,      -- HE 50% em horas decimais
  he_100 numeric DEFAULT 0,     -- HE 100% em horas decimais
  atraso numeric DEFAULT 0,     -- Atraso em horas decimais
  intrajornada numeric DEFAULT 0,
  add_noturno numeric DEFAULT 0,
  add_noturno_red numeric DEFAULT 0,
  falta boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Habilitar leitura pública (ajuste RLS conforme necessidade)
ALTER TABLE banco_horas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total" ON banco_horas
  FOR ALL USING (true) WITH CHECK (true);
```

### 3. Conectar no sistema

Clique em **⚙ BD** no canto superior direito e insira a URL e a Anon Key.

---

## 📋 Regras de Cálculo

| Situação | Regra |
|---|---|
| Trabalhado > Previsto (dia normal) | Excedente → **HE 50%** → Banco de Horas |
| Qualquer hora em feriado | Tudo → **HE 100%** (não entra como 50%) |
| Trabalhado < Previsto | Diferença → **Atraso** |
| Intervalo < 60min (jornada > 6h) | Diferença até 60min → **Intrajornada** |
| 22h–5h | Minutos trabalhados → **Adicional Noturno** (+20%) |
| Hora noturna reduzida | 60min real = 52min30s → crédito de tempo extra |
| Falta marcada | Carga total do dia → **Atraso** |

---

## 💾 Armazenamento

- **Local**: todos os dados são salvos no `localStorage` do navegador automaticamente.
- **Supabase**: ao clicar em **💾 Salvar**, os dados do mês são sincronizados na nuvem.

---

## 🖨️ Exportar / Imprimir

Use os botões **Retrato (PDF)** ou **Paisagem (PDF)** na aba *Lançar Ponto*.
O navegador abrirá a janela de impressão — salve como PDF ou imprima diretamente.
