import { describe, expect, it } from "vitest";
import { access } from "node:fs/promises";
import path from "node:path";
import {
  buildFormationSeedRecords,
  buildMescFormationMaterialResponse,
  loadMescFormationContent,
  MESC_FORMATION_TRACK_ID,
} from "../../../server/services/mescFormationContent";

describe("MESC formation content", () => {
  it("loads and validates the official formation source", async () => {
    const content = await loadMescFormationContent();

    expect(content.manifest.modulos).toHaveLength(7);
    expect(content.modules).toHaveLength(7);
    expect(content.data.funcoes_escala.funcoes).toHaveLength(16);
    expect(content.data.checklists.checklists).toHaveLength(5);
    expect(content.data.missas_e_particulas.escala_por_missa).toHaveLength(4);
    expect(content.modules.every((module) => module.sections.length > 0)).toBe(true);
  });

  it("builds deterministic seed records from the official source", async () => {
    const content = await loadMescFormationContent();
    const first = buildFormationSeedRecords(content);
    const second = buildFormationSeedRecords(content);

    expect(first.track.id).toBe(MESC_FORMATION_TRACK_ID);
    expect(first.modules).toHaveLength(7);
    expect(first.lessons).toHaveLength(7);
    expect(first.sections.length).toBeGreaterThan(20);
    expect(first.modules.map((module) => module.id)).toEqual(second.modules.map((module) => module.id));
    expect(first.sections.some((section) => section.title === "Horários e chegada")).toBe(true);
  });

  it("exposes maps and structured data for the native library", async () => {
    const content = await loadMescFormationContent();
    const material = buildMescFormationMaterialResponse(content);

    expect(material.assets.maps.map((map) => map.assetUrl)).toContain("/mesc-formation/mapa-missa-domingo.png");
    expect(material.assets.maps.map((map) => map.assetUrl)).toContain("/mesc-formation/mapa-missa-cura.png");
    expect(material.data.oracoes.oracoes.length).toBeGreaterThan(0);
    expect(material.data.glossario_liturgico.objetos.length).toBeGreaterThan(0);
    await expect(access(path.resolve(process.cwd(), "client/public/mesc-formation/mapa-missa-domingo.png"))).resolves.toBeUndefined();
    await expect(access(path.resolve(process.cwd(), "client/public/mesc-formation/mapa-missa-cura.png"))).resolves.toBeUndefined();
  });
});
