#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Algoritmo Alternativo de Geração de Escalas
Baseado em lógica simplificada de disponibilidade e preferências
"""
import json
import sys
from collections import defaultdict

def gerar_escala(users, responses):
    """
    Gera escala de ministros baseado em disponibilidade e preferências
    
    Args:
        users: Lista de usuários/ministros
        responses: Respostas do questionário de disponibilidade
    
    Returns:
        Lista de alocações por missa
    """
    # Definição das missas padrão
    missas = [
        {"id": 1, "descricao": "Sábado 17h", "ministros_necessarios": 4},
        {"id": 2, "descricao": "Domingo 08h", "ministros_necessarios": 4},
        {"id": 3, "descricao": "Domingo 10h", "ministros_necessarios": 6},
        {"id": 4, "descricao": "Domingo 19h", "ministros_necessarios": 6},
    ]
    
    # Organizar respostas por usuário
    respostas_por_user = defaultdict(list)
    for r in responses:
        respostas_por_user[r["user_id"]].append(r)
    
    # Estrutura para armazenar a escala gerada
    escala = []
    
    # Contador de atribuições por ministro (para distribuição justa)
    contagem = defaultdict(int)
    
    # Processar cada missa
    for missa in missas:
        candidatos = []
        
        # Filtrar candidatos disponíveis para esta missa
        for u in users:
            respostas = respostas_por_user.get(u["id"], [])
            
            # Verificar disponibilidade para o horário da missa
            disponivel = any(
                missa["descricao"].split(" ")[1] in s
                for r in respostas
                for s in r.get("available_sundays", [])
            )
            
            # Verificar se o ministro evita esta posição
            evita = missa["id"] in u.get("avoid_positions", [])
            
            if disponivel and not evita:
                candidatos.append(u)
        
        # Ordenar candidatos por:
        # 1. Preferência pela posição (preferidos primeiro)
        # 2. Menor número de atribuições (distribuição justa)
        candidatos.sort(
            key=lambda u: (
                missa["id"] not in u.get("preferred_positions", []),
                contagem[u["id"]],
            )
        )
        
        # Selecionar ministros necessários
        selecionados = candidatos[: missa["ministros_necessarios"]]
        
        # Registrar na escala e atualizar contadores
        for sel in selecionados:
            contagem[sel["id"]] += 1
            escala.append({
                "missa": missa["descricao"],
                "ministro": sel["name"],
                "ministro_id": sel["id"],
                "preferido": missa["id"] in sel.get("preferred_positions", []),
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
