/**
 * Tipos do conteúdo do app MESC — Santuário São Judas Tadeu.
 * Gerados a partir dos arquivos em `dados/*.json`.
 * Estes arquivos JSON são a FONTE DA VERDADE: o app deve carregá-los,
 * não duplicar o conteúdo em código.
 */

/* ---------- manifest.json ---------- */
export interface Manifest {
  titulo: string;
  subtitulo: string;
  versao: string;
  descricao: string;
  modulos: Modulo[];
}

export interface Modulo {
  id: string;            // ex.: "03-servico"
  titulo: string;
  icone: string;         // emoji/símbolo usado na navegação
  resumo: string;
  conteudo: string;      // caminho relativo do .md (ex.: "conteudo/03-servico-na-missa.md")
  dados?: string[];      // caminhos dos JSON consumidos por este módulo
  secoes: string[];      // títulos das seções, para sumário/âncoras
}

/* ---------- funcoes_escala.json ---------- */
export type Fase = "preparacao" | "durante" | "encerramento";
export type CategoriaFuncao =
  | "auxiliar" | "santissimo" | "velas" | "apoio"
  | "purificacao" | "mezanino" | "extra";

export interface Funcao {
  numero: number;
  papel: string;
  categoria: CategoriaFuncao;
  resumo: string;
  responsabilidades: string[];
  fases: Fase[];
}

export interface FuncoesEscala {
  descricao: string;
  fase_legenda: Record<Fase, string>;
  funcoes: Funcao[];
  observacao_geral: string;
}

/* ---------- missas_e_particulas.json ---------- */
export interface EscalaMissa {
  missa: string;
  ministros: number;
  eucaristias: number;
  mapa: string;        // caminho relativo da imagem em assets/
  observacao: string;
}

export interface MissasEParticulas {
  capacidade_igreja: number;
  regra_calculo_particulas: string;
  horarios: {
    domingo: string[];
    diaria: string[];
    sao_judas_tadeu_dia_28: {
      dia_de_semana: string[];
      sabado: string[];
      domingo: string[];
    };
    cura_e_libertacao: string;
    sagrado_coracao_de_jesus: string;
    sagrado_coracao_de_maria: string;
  };
  adoracao_ao_santissimo: string;
  antecedencia_chegada: {
    missa_comum: string;
    missa_diaria: string;
    cura_e_libertacao: string;
  };
  escala_por_missa: EscalaMissa[];
}

/* ---------- checklists.json ---------- */
export interface Checklist {
  id: string;          // chave estável p/ persistência (ex.: "recolher_santissimo")
  titulo: string;
  descricao: string;
  itens: string[];
}
export interface Checklists {
  checklists: Checklist[];
}

/* ---------- oracoes.json ---------- */
export interface Oracao {
  id: string;
  titulo: string;
  repeticoes: number;
  texto: string;
  complemento?: string;
}
export interface Oracoes {
  nota: string;
  oracoes: Oracao[];
  oracao_na_roda: string;
}

/* ---------- cores_e_tempos.json ---------- */
export interface CorLiturgica {
  cor: string;
  hex: string;
  simbolismo: string;
  uso: string;
}
export interface CoresETempos {
  cores_liturgicas: CorLiturgica[];
}

/* ---------- glossario_liturgico.json ---------- */
export interface TermoGlossario {
  termo: string;
  definicao: string;
}
export interface GlossarioLiturgico {
  espaco_celebrativo: TermoGlossario[];
  vestes: TermoGlossario[];
  objetos: TermoGlossario[];
  montagem_calice: string[];
}

/* ---------- Mapa id -> tipo, útil para o loader ---------- */
export interface MescData {
  manifest: Manifest;
  funcoes_escala: FuncoesEscala;
  missas_e_particulas: MissasEParticulas;
  checklists: Checklists;
  oracoes: Oracoes;
  cores_e_tempos: CoresETempos;
  glossario_liturgico: GlossarioLiturgico;
}
