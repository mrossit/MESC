# Problema: Horários de Domingo 08:00 e 19:00 Vazios

## 🔍 Diagnóstico

### Situação Atual

**Questionário V1.0 Array (Outubro 2025):**
- Pergunta apenas sobre **Domingo às 10:00**
- NÃO pergunta sobre 08:00 nem 19:00
- 105 ministros marcaram disponibilidade para "Domingo 10:00"

**Resultado:**
- Domingo 08:00: 0 ministros ❌
- Domingo 10:00: 105 ministros ✅
- Domingo 19:00: 0 ministros ❌

### Problema Identificado

O sistema está lendo CORRETAMENTE as respostas do questionário. O problema é que:

1. **Questionário incompleto**: Não pergunta sobre todos os horários de missa
2. **Missas 08:00 e 19:00 ficam sem ministros**: Não há dados para escalar

## 💡 Soluções Possíveis

### Opção 1: Distribuição Inteligente (Automática)

**Lógica:**
Quando ministro marca "Domingo 10:00", sistema distribui entre os 3 horários:
- 33% → 08:00
- 34% → 10:00 (mantém a maioria)
- 33% → 19:00

**Vantagens:**
- ✅ Solução imediata
- ✅ Aproveita disponibilidades existentes
- ✅ Não precisa refazer questionário

**Desvantagens:**
- ⚠️  Ministro pode ser escalado em horário não desejado
- ⚠️  Precisa validação manual do coordenador
- ⚠️  Não é a disponibilidade real

**Implementação:**
```typescript
// No AvailabilityService
getAvailableMinistersForMass(date: string, time: string): string[] {
  // 1. Buscar disponibilidade exata
  const exact = this.getExactAvailability(date, time);

  // 2. Se é domingo 08:00 ou 19:00 e não tem disponibilidade
  if (exact.length === 0 && this.isSunday(date)) {
    if (time === '08:00' || time === '19:00') {
      // Buscar quem marcou 10:00
      const available10h = this.getExactAvailability(date, '10:00');

      // Distribuir proporcionalmente
      return this.distributeForSundayMasses(available10h, time);
    }
  }

  return exact;
}
```

---

### Opção 2: Campo "Qualquer Horário de Domingo"

**Lógica:**
Considerar que marcar "Domingo 10:00" significa "disponível em qualquer horário de domingo"

**Vantagens:**
- ✅ Mais simples que distribuição
- ✅ Aproveita todas disponibilidades

**Desvantagens:**
- ⚠️  Ministro pode ser escalado em horário não desejado
- ⚠️  Menos controle que distribuição proporcional

**Implementação:**
```typescript
getAvailableMinistersForMass(date: string, time: string): string[] {
  const exact = this.getExactAvailability(date, time);

  if (exact.length === 0 && this.isSunday(date)) {
    // Buscar TODOS que marcaram algum horário de domingo
    return this.getAllSundayAvailable(date);
  }

  return exact;
}
```

---

### Opção 3: Novo Questionário V2.0 (Ideal a Longo Prazo)

**Lógica:**
Criar questionário novo que pergunta TODOS os horários:

```
Domingos de Outubro:
- [ ] Domingo 05/10 às 08:00
- [ ] Domingo 05/10 às 10:00
- [ ] Domingo 05/10 às 19:00
- [ ] Domingo 12/10 às 08:00
- [ ] Domingo 12/10 às 10:00
- [ ] Domingo 12/10 às 19:00
...
```

**Vantagens:**
- ✅ Disponibilidade real e precisa
- ✅ Ministro escolhe exatamente quando pode
- ✅ Sem suposições ou distribuições

**Desvantagens:**
- ⚠️  Precisa criar novo questionário
- ⚠️  Ministros precisam responder novamente
- ⚠️  Não resolve outubro (já passou prazo)

---

## 🎯 Recomendação

### Para Outubro 2025 (Urgente)

**Implementar Opção 1 (Distribuição Inteligente)**

Motivos:
- Resolve problema imediato
- Não precisa refazer questionário
- Coordenador valida manualmente de qualquer forma

**Configuração recomendada:**
```
Distribuição para cada domingo:
- 08:00: 30% dos disponíveis para 10:00 (15 ministros ~ mínimo necessário)
- 10:00: 40% dos disponíveis (mantém maioria, 24 ministros)
- 19:00: 30% dos disponíveis (20 ministros)
```

### Para Novembro 2025+ (Ideal)

**Implementar Opção 3 (Questionário V2.0)**

- Perguntar TODOS os horários separadamente
- Domingos: 08:00, 10:00, 19:00
- Dias de semana: 06:30
- Missas especiais: cada horário separado

---

## 📋 Próximos Passos (Outubro)

1. **Implementar distribuição inteligente**
   - Adicionar método `distributeForSundayMasses()` no AvailabilityService
   - Configurar proporções (30/40/30)

2. **Testar distribuição**
   - Verificar se 08:00 e 19:00 ficam com ministros suficientes
   - Validar que 10:00 mantém maioria

3. **Gerar escalas de outubro**
   - Com nova distribuição

4. **Coordenador valida**
   - Revisar escalações de 08:00 e 19:00
   - Ajustar manualmente se necessário

5. **Documentar para ministros**
   - Avisar que podem ser escalados em 08:00 ou 19:00
   - Mesmo tendo marcado apenas 10:00

---

## 📝 Observações Importantes

### Dias de Semana (06:30)

**Mesmo problema:**
- Questionário não pergunta sobre dias de semana
- Apenas 2 ministros (Eliane e Daniela) marcaram "disponível para missas diárias"
- Resultado: 06:30 tem apenas 2 ministros ❌

**Solução:**
- **Para outubro:** Deixar com 2 ministros (suficiente para missa diária)
- **Para novembro+:** Incluir dias de semana no questionário V2.0

### Missas Especiais (Cura e Libertação, Sagrado Coração)

**Situação:**
- Cura e Libertação (quinta 19:30): sem disponibilidades específicas
- Sagrado Coração (sexta 06:30): sem disponibilidades específicas

**Solução:**
- Sistema deve usar disponibilidade geral de quinta/sexta
- Ou escalar manualmente essas missas especiais

---

## ✅ Conclusão

A leitura do sistema está **100% correta**.

O problema não é técnico, é de **dados faltantes** no questionário.

Solução imediata: **distribuição inteligente** dos ministros que marcaram 10:00.

Solução definitiva: **questionário V2.0** com todos os horários.
