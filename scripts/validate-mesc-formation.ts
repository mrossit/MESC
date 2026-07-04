import {
  buildFormationSeedRecords,
  loadMescFormationContent,
} from "../server/services/mescFormationContent";

async function main() {
  const content = await loadMescFormationContent();
  const seedRecords = buildFormationSeedRecords(content);

  console.log("[OK] MESC_Formation schema and references");
  console.log(`[OK] modules: ${content.modules.length}`);
  console.log(`[OK] seed modules: ${seedRecords.modules.length}`);
  console.log(`[OK] seed lessons: ${seedRecords.lessons.length}`);
  console.log(`[OK] seed sections: ${seedRecords.sections.length}`);
  console.log(`[OK] maps: ${content.data.missas_e_particulas.escala_por_missa.length}`);
}

main().catch((error) => {
  console.error("Failed to validate MESC formation content:", error);
  process.exit(1);
});
