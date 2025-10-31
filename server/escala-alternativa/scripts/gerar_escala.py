#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Algoritmo Alternativo de Geração de Escalas
Suporta missas dominicais E missas diárias com disponibilidade por dia da semana
"""
import json
import sys
from collections import defaultdict

# Mapeamento de dias da semana
WEEKDAY_MAP = {
    "Segunda-feira": "monday",
    "Terça-feira": "tuesday", 
    "Quarta-feira": "wednesday",
    "Quinta-feira": "thursday",
    "Sexta-feira": "friday",
    "Sábado": "saturday",
    "Domingo": "sunday"
}

def gerar_escala(users, responses):
    """
    Gera escala de ministros baseado em disponibilidade e preferências
    
    Args:
        users: Lista de usuários/ministros
        responses: Respostas do questionário de disponibilidade
    
    Returns:
        Lista de alocações por missa
    """
    # Definição das missas padrão (dominicais e sabatinas)
    missas_fim_semana = [
        {"id": 1, "descricao": "Sábado 17h", "dia": "saturday", "hora": "17h", "ministros_necessarios": 4},
        {"id": 2, "descricao": "Domingo 08h", "dia": "sunday", "hora": "08h", "ministros_necessarios": 4},
        {"id": 3, "descricao": "Domingo 10h", "dia": "sunday", "hora": "10h", "ministros_necessarios": 6},
        {"id": 4, "descricao": "Domingo 19h", "dia": "sunday", "hora": "19h", "ministros_necessarios": 6},
    ]
    
    # Definição de missas diárias (exemplo: segunda a sexta 07:00)
    missas_diarias = [
        {"id": 101, "descricao": "Segunda-feira 07h", "dia": "monday", "hora": "07h", "ministros_necessarios": 2},
        {"id": 102, "descricao": "Terça-feira 07h", "dia": "tuesday", "hora": "07h", "ministros_necessarios": 2},
        {"id": 103, "descricao": "Quarta-feira 07h", "dia": "wednesday", "hora": "07h", "ministros_necessarios": 2},
        {"id": 104, "descricao": "Quinta-feira 07h", "dia": "thursday", "hora": "07h", "ministros_necessarios": 2},
        {"id": 105, "descricao": "Sexta-feira 07h", "dia": "friday", "hora": "07h", "ministros_necessarios": 2},
    ]
    
    # Organizar respostas por usuário
    respostas_por_user = defaultdict(list)
    for r in responses:
        respostas_por_user[r["user_id"]].append(r)
    
    # Estrutura para armazenar a escala gerada
    escala = []
    
    # Contador de atribuições por ministro (para distribuição justa)
    contagem = defaultdict(int)
    
    # ========== PROCESSAR MISSAS DE FIM DE SEMANA ==========
    for missa in missas_fim_semana:
        candidatos = []
        
        # Filtrar candidatos disponíveis para esta missa
        for u in users:
            respostas = respostas_por_user.get(u["id"], [])
            
            # Verificar disponibilidade para o horário da missa
            disponivel = any(
                missa["hora"] in s or missa["descricao"].split(" ")[1] in s
                for r in respostas
                for s in r.get("available_sundays", [])
            )
            
            # Verificar se o ministro evita esta posição
            evita = missa["id"] in u.get("avoid_positions", [])
            
            if disponivel and not evita:
                candidatos.append(u)
        
        # Ordenar e selecionar ministros
        candidatos.sort(
            key=lambda u: (
                missa["id"] not in u.get("preferred_positions", []),
                contagem[u["id"]],
            )
        )
        
        selecionados = candidatos[: missa["ministros_necessarios"]]
        
        # Registrar na escala
        for sel in selecionados:
            contagem[sel["id"]] += 1
            escala.append({
                "missa": missa["descricao"],
                "tipo": "fim_de_semana",
                "ministro": sel["name"],
                "ministro_id": sel["id"],
                "preferido": missa["id"] in sel.get("preferred_positions", []),
                "atribuicoes_totais": contagem[sel["id"]]
            })
    
    # ========== PROCESSAR MISSAS DIÁRIAS ==========
    for missa in missas_diarias:
        candidatos = []
        
        # Filtrar candidatos disponíveis para este dia da semana
        for u in users:
            respostas = respostas_por_user.get(u["id"], [])
            
            # Verificar se o ministro está disponível neste dia da semana
            disponivel = False
            for r in respostas:
                # Verificar no campo daily_mass_availability
                daily_avail = r.get("daily_mass_availability", [])
                
                # Converter dia da missa para formato português
                dia_pt = next((k for k, v in WEEKDAY_MAP.items() if v == missa["dia"]), None)
                
                if dia_pt in daily_avail:
                    disponivel = True
                    break
                
                # Verificar também no campo weekdays (formato detalhado)
                weekdays = r.get("weekdays", {})
                if isinstance(weekdays, dict) and weekdays.get(missa["dia"], False):
                    disponivel = True
                    break
            
            if disponivel:
                candidatos.append(u)
        
        # Ordenar por menor número de atribuições (distribuição justa)
        candidatos.sort(key=lambda u: contagem[u["id"]])
        
        # Selecionar ministros necessários
        selecionados = candidatos[: missa["ministros_necessarios"]]
        
        # Registrar na escala
        for sel in selecionados:
            contagem[sel["id"]] += 1
            escala.append({
                "missa": missa["descricao"],
                "tipo": "missa_diaria",
                "ministro": sel["name"],
                "ministro_id": sel["id"],
                "preferido": False,  # Missas diárias não têm preferência
                "atribuicoes_totais": contagem[sel["id"]]
            })
    
    return escala


if __name__ == "__main__":
    try:
        # Ler dados de entrada do stdin
        data = json.loads(sys.stdin.read())
        users = data.get("users", [])
        responses = data.get("responses", [])
        
        # Gerar escala
        resultado = gerar_escala(users, responses)
        
        # Retornar resultado em JSON
        print(json.dumps(resultado, ensure_ascii=False, indent=2))
        
    except Exception as e:
        # Em caso de erro, retornar JSON de erro
        error_result = {
            "error": True,
            "message": str(e),
            "type": type(e).__name__
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)
