import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { v5 as uuidv5 } from "uuid";
import { z } from "zod";
import type {
  Checklists,
  CoresETempos,
  FuncoesEscala,
  GlossarioLiturgico,
  Manifest,
  MissasEParticulas,
  Modulo,
  Oracoes,
} from "../../MESC_Formation/types/mesc";

export const MESC_FORMATION_ROOT = path.resolve(process.cwd(), "MESC_Formation");
export const MESC_FORMATION_TRACK_ID = "mesc-formation-2026";
export const MESC_FORMATION_PUBLIC_ASSET_BASE = "/mesc-formation";

const MESC_FORMATION_UUID_NAMESPACE = "8a34e97b-8ee0-4487-b971-bbc8f00fd6a3";

const dataFiles = {
  manifest: "dados/manifest.json",
  funcoes_escala: "dados/funcoes_escala.json",
  missas_e_particulas: "dados/missas_e_particulas.json",
  checklists: "dados/checklists.json",
  oracoes: "dados/oracoes.json",
  cores_e_tempos: "dados/cores_e_tempos.json",
  glossario_liturgico: "dados/glossario_liturgico.json",
} as const;

const faseSchema = z.enum(["preparacao", "durante", "encerramento"]);
const categoriaFuncaoSchema = z.enum([
  "auxiliar",
  "santissimo",
  "velas",
  "apoio",
  "purificacao",
  "mezanino",
  "extra",
]);

const manifestSchema = z.object({
  titulo: z.string().min(1),
  subtitulo: z.string().min(1),
  versao: z.string().min(1),
  descricao: z.string().min(1),
  modulos: z.array(z.object({
    id: z.string().min(1),
    titulo: z.string().min(1),
    icone: z.string().min(1),
    resumo: z.string().min(1),
    conteudo: z.string().min(1),
    dados: z.array(z.string().min(1)).optional(),
    secoes: z.array(z.string().min(1)),
  }).strict()).min(1),
}).strict();

const funcoesEscalaSchema = z.object({
  descricao: z.string().min(1),
  fase_legenda: z.object({
    preparacao: z.string().min(1),
    durante: z.string().min(1),
    encerramento: z.string().min(1),
  }).strict(),
  funcoes: z.array(z.object({
    numero: z.number().int().positive(),
    papel: z.string().min(1),
    categoria: categoriaFuncaoSchema,
    resumo: z.string().min(1),
    responsabilidades: z.array(z.string().min(1)),
    fases: z.array(faseSchema),
  }).strict()).min(1),
  observacao_geral: z.string().min(1),
}).strict();

const missasEParticulasSchema = z.object({
  capacidade_igreja: z.number().int().positive(),
  regra_calculo_particulas: z.string().min(1),
  horarios: z.object({
    domingo: z.array(z.string().min(1)),
    diaria: z.array(z.string().min(1)),
    sao_judas_tadeu_dia_28: z.object({
      dia_de_semana: z.array(z.string().min(1)),
      sabado: z.array(z.string().min(1)),
      domingo: z.array(z.string().min(1)),
    }).strict(),
    cura_e_libertacao: z.string().min(1),
    sagrado_coracao_de_jesus: z.string().min(1),
    sagrado_coracao_de_maria: z.string().min(1),
  }).strict(),
  adoracao_ao_santissimo: z.string().min(1),
  antecedencia_chegada: z.object({
    missa_comum: z.string().min(1),
    missa_diaria: z.string().min(1),
    cura_e_libertacao: z.string().min(1),
  }).strict(),
  escala_por_missa: z.array(z.object({
    missa: z.string().min(1),
    ministros: z.number().int().positive(),
    eucaristias: z.number().int().positive(),
    mapa: z.string().min(1),
    observacao: z.string().min(1),
  }).strict()).min(1),
}).strict();

const checklistsSchema = z.object({
  checklists: z.array(z.object({
    id: z.string().min(1),
    titulo: z.string().min(1),
    descricao: z.string().min(1),
    itens: z.array(z.string().min(1)),
  }).strict()).min(1),
}).strict();

const oracoesSchema = z.object({
  nota: z.string().min(1),
  oracoes: z.array(z.object({
    id: z.string().min(1),
    titulo: z.string().min(1),
    repeticoes: z.number().int().positive(),
    texto: z.string().min(1),
    complemento: z.string().min(1).optional(),
  }).strict()).min(1),
  oracao_na_roda: z.string().min(1),
}).strict();

const coresETemposSchema = z.object({
  cores_liturgicas: z.array(z.object({
    cor: z.string().min(1),
    hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    simbolismo: z.string().min(1),
    uso: z.string().min(1),
  }).strict()).min(1),
}).strict();

const termoGlossarioSchema = z.object({
  termo: z.string().min(1),
  definicao: z.string().min(1),
}).strict();

const glossarioLiturgicoSchema = z.object({
  espaco_celebrativo: z.array(termoGlossarioSchema),
  vestes: z.array(termoGlossarioSchema),
  objetos: z.array(termoGlossarioSchema),
  montagem_calice: z.array(z.string().min(1)),
}).strict();

const schemaIndexSchema = z.object({
  _mapaArquivos: z.record(z.string().min(1)),
}).passthrough();

type FormationCategory = "liturgia" | "espiritualidade" | "pratica";

type FrontMatter = {
  modulo?: string;
  titulo?: string;
  dados?: string[];
};

export type MescFormationMarkdownSection = {
  id: string;
  title: string;
  content: string;
  orderIndex: number;
  estimatedMinutes: number;
};

export type MescFormationModuleContent = {
  manifest: Modulo;
  frontMatter: FrontMatter;
  markdown: string;
  sections: MescFormationMarkdownSection[];
};

export type MescFormationContent = {
  manifest: Manifest;
  data: {
    funcoes_escala: FuncoesEscala;
    missas_e_particulas: MissasEParticulas;
    checklists: Checklists;
    oracoes: Oracoes;
    cores_e_tempos: CoresETempos;
    glossario_liturgico: GlossarioLiturgico;
  };
  modules: MescFormationModuleContent[];
};

export type FormationSeedRecords = {
  track: {
    id: string;
    title: string;
    description: string;
    category: FormationCategory;
    icon: string;
    orderIndex: number;
    isActive: boolean;
  };
  modules: Array<{
    id: string;
    trackId: string;
    title: string;
    description: string;
    category: FormationCategory;
    content: string;
    durationMinutes: number;
    orderIndex: number;
  }>;
  lessons: Array<{
    id: string;
    moduleId: string;
    trackId: string;
    title: string;
    description: string;
    lessonNumber: number;
    durationMinutes: number;
    objectives: string[];
    isActive: boolean;
    orderIndex: number;
  }>;
  sections: Array<{
    id: string;
    lessonId: string;
    type: "text";
    title: string;
    content: string;
    orderIndex: number;
    isRequired: boolean;
    estimatedMinutes: number;
  }>;
};

export type MescFormationMaterialResponse = {
  title: string;
  subtitle: string;
  version: string;
  description: string;
  modules: Array<{
    id: string;
    title: string;
    summary: string;
    icon: string;
    sections: string[];
    contentPath: string;
    dataPaths: string[];
  }>;
  assets: {
    maps: Array<{
      mass: string;
      ministers: number;
      particles: number;
      observation: string;
      sourcePath: string;
      assetUrl: string;
    }>;
  };
  data: MescFormationContent["data"];
};

const readJson = async <T>(root: string, relativePath: string, schema: z.ZodType<T>): Promise<T> => {
  const absolutePath = path.join(root, relativePath);
  const raw = await readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw);
  try {
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Arquivo ${relativePath} inválido: ${error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
    }
    throw error;
  }
};

const assertFileExists = async (root: string, relativePath: string) => {
  try {
    await access(path.join(root, relativePath));
  } catch {
    throw new Error(`Arquivo referenciado não encontrado: ${relativePath}`);
  }
};

const stripFrontMatter = (raw: string): { frontMatter: FrontMatter; markdown: string } => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { frontMatter: {}, markdown: raw.trim() };
  }

  const frontMatter: FrontMatter = {};
  const lines = match[1].split(/\r?\n/);
  let currentListKey: keyof FrontMatter | null = null;

  for (const line of lines) {
    const listItem = line.match(/^\s*-\s*["']?(.+?)["']?\s*$/);
    if (listItem && currentListKey) {
      const current = frontMatter[currentListKey];
      frontMatter[currentListKey] = [
        ...(Array.isArray(current) ? current : []),
        listItem[1],
      ] as never;
      continue;
    }

    const keyValue = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!keyValue) {
      currentListKey = null;
      continue;
    }

    const [, key, rawValue] = keyValue;
    const typedKey = key as keyof FrontMatter;
    const value = rawValue.trim();
    if (!value) {
      frontMatter[typedKey] = [] as never;
      currentListKey = typedKey;
      continue;
    }

    frontMatter[typedKey] = value.replace(/^["']|["']$/g, "") as never;
    currentListKey = null;
  }

  return {
    frontMatter,
    markdown: raw.slice(match[0].length).trim(),
  };
};

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const splitMarkdownSections = (module: Modulo, markdown: string): MescFormationMarkdownSection[] => {
  const sections: Array<{ title: string; lines: string[] }> = [];
  let current: { title: string; lines: string[] } | null = null;
  const introLines: string[] = [];

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      if (current) {
        sections.push(current);
      }
      current = { title: heading[1].trim(), lines: [] };
      continue;
    }

    if (line.startsWith("# ")) {
      continue;
    }

    if (current) {
      current.lines.push(line);
    } else {
      introLines.push(line);
    }
  }

  if (current) {
    sections.push(current);
  }

  if (sections.length === 0) {
    sections.push({ title: module.titulo, lines: introLines });
  }

  return sections.map((section, index) => {
    const content = section.lines.join("\n").trim();
    return {
      id: `${module.id}:${slugify(section.title) || index + 1}`,
      title: section.title,
      content: content || module.resumo,
      orderIndex: index,
      estimatedMinutes: Math.max(3, Math.ceil((content || module.resumo).length / 900)),
    };
  });
};

const getModuleCategory = (moduleId: string): FormationCategory => {
  if (["00-identidade", "01-formacao", "04-santissimo"].includes(moduleId)) {
    return "espiritualidade";
  }
  if (["02-ministro", "03-servico", "06-enfermos"].includes(moduleId)) {
    return "pratica";
  }
  return "liturgia";
};

export const getMescFormationPublicAssetUrl = (sourcePath: string) =>
  `${MESC_FORMATION_PUBLIC_ASSET_BASE}/${path.basename(sourcePath)}`;

export async function loadMescFormationContent(root = MESC_FORMATION_ROOT): Promise<MescFormationContent> {
  const schemaIndex = await readJson(root, "dados/schema/mesc.schema.json", schemaIndexSchema);
  for (const relativePath of Object.values(dataFiles)) {
    if (!schemaIndex._mapaArquivos[relativePath]) {
      throw new Error(`Schema não referencia ${relativePath}`);
    }
  }

  const manifest = await readJson(root, dataFiles.manifest, manifestSchema);
  const funcoesEscala = await readJson(root, dataFiles.funcoes_escala, funcoesEscalaSchema);
  const missasEParticulas = await readJson(root, dataFiles.missas_e_particulas, missasEParticulasSchema);
  const checklists = await readJson(root, dataFiles.checklists, checklistsSchema);
  const oracoes = await readJson(root, dataFiles.oracoes, oracoesSchema);
  const coresETempos = await readJson(root, dataFiles.cores_e_tempos, coresETemposSchema);
  const glossarioLiturgico = await readJson(root, dataFiles.glossario_liturgico, glossarioLiturgicoSchema);

  const knownDataPaths = new Set(Object.values(dataFiles));
  const modules: MescFormationModuleContent[] = [];

  for (const module of manifest.modulos) {
    await assertFileExists(root, module.conteudo);
    for (const dataPath of module.dados ?? []) {
      if (!knownDataPaths.has(dataPath as (typeof dataFiles)[keyof typeof dataFiles])) {
        throw new Error(`Módulo ${module.id} referencia dado desconhecido: ${dataPath}`);
      }
      await assertFileExists(root, dataPath);
    }

    const rawMarkdown = await readFile(path.join(root, module.conteudo), "utf8");
    const { frontMatter, markdown } = stripFrontMatter(rawMarkdown);
    if (frontMatter.modulo && frontMatter.modulo !== module.id) {
      throw new Error(`Front matter de ${module.conteudo} usa módulo ${frontMatter.modulo}, esperado ${module.id}`);
    }
    modules.push({
      manifest: module,
      frontMatter,
      markdown,
      sections: splitMarkdownSections(module, markdown),
    });
  }

  for (const massConfig of missasEParticulas.escala_por_missa) {
    await assertFileExists(root, massConfig.mapa);
  }

  return {
    manifest,
    data: {
      funcoes_escala: funcoesEscala,
      missas_e_particulas: missasEParticulas,
      checklists,
      oracoes,
      cores_e_tempos: coresETempos,
      glossario_liturgico: glossarioLiturgico,
    },
    modules,
  };
}

export function buildFormationSeedRecords(content: MescFormationContent): FormationSeedRecords {
  const modules = content.modules.map((module, index) => {
    const durationMinutes = module.sections.reduce((sum, section) => sum + section.estimatedMinutes, 0);
    return {
      id: uuidv5(`mesc-module:${module.manifest.id}`, MESC_FORMATION_UUID_NAMESPACE),
      trackId: MESC_FORMATION_TRACK_ID,
      title: module.manifest.titulo,
      description: module.manifest.resumo,
      category: getModuleCategory(module.manifest.id),
      content: module.markdown,
      durationMinutes,
      orderIndex: index,
    };
  });

  const lessons = content.modules.map((module, index) => {
    const moduleRecord = modules[index];
    return {
      id: uuidv5(`mesc-lesson:${module.manifest.id}:conteudo`, MESC_FORMATION_UUID_NAMESPACE),
      moduleId: moduleRecord.id,
      trackId: MESC_FORMATION_TRACK_ID,
      title: module.manifest.titulo,
      description: module.manifest.resumo,
      lessonNumber: 1,
      durationMinutes: moduleRecord.durationMinutes,
      objectives: module.manifest.secoes,
      isActive: true,
      orderIndex: 0,
    };
  });

  const sections = content.modules.flatMap((module, moduleIndex) => {
    const lesson = lessons[moduleIndex];
    return module.sections.map((section) => ({
      id: uuidv5(`mesc-section:${section.id}`, MESC_FORMATION_UUID_NAMESPACE),
      lessonId: lesson.id,
      type: "text" as const,
      title: section.title,
      content: section.content,
      orderIndex: section.orderIndex,
      isRequired: true,
      estimatedMinutes: section.estimatedMinutes,
    }));
  });

  return {
    track: {
      id: MESC_FORMATION_TRACK_ID,
      title: "Formação MESC São Judas Tadeu",
      description: `${content.manifest.subtitulo} • ${content.manifest.versao}`,
      category: "liturgia",
      icon: "Cross",
      orderIndex: 0,
      isActive: true,
    },
    modules,
    lessons,
    sections,
  };
}

export function buildMescFormationMaterialResponse(content: MescFormationContent): MescFormationMaterialResponse {
  return {
    title: content.manifest.titulo,
    subtitle: content.manifest.subtitulo,
    version: content.manifest.versao,
    description: content.manifest.descricao,
    modules: content.manifest.modulos.map((module) => ({
      id: module.id,
      title: module.titulo,
      summary: module.resumo,
      icon: module.icone,
      sections: module.secoes,
      contentPath: module.conteudo,
      dataPaths: module.dados ?? [],
    })),
    assets: {
      maps: content.data.missas_e_particulas.escala_por_missa.map((map) => ({
        mass: map.missa,
        ministers: map.ministros,
        particles: map.eucaristias,
        observation: map.observacao,
        sourcePath: map.mapa,
        assetUrl: getMescFormationPublicAssetUrl(map.mapa),
      })),
    },
    data: content.data,
  };
}
