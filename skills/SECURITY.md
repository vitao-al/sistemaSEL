# Política de Segurança

Este documento descreve como reportar vulnerabilidades no SistemaSEL e quais versões recebem correções de segurança.

## Versões Suportadas

| Versão | Suporte de segurança |
| --- | --- |
| main (última versão) | ✅ Sim |
| versões antigas / forks desatualizados | ❌ Não |

Somente a versão mais recente na branch principal recebe correções e hardening de segurança.

## Como Reportar uma Vulnerabilidade

1. **Não publique a falha em issue pública inicialmente.**
2. Use o recurso de **report privado de vulnerabilidade do GitHub** (aba Security do repositório).
3. Se o report privado não estiver disponível, entre em contato diretamente com os mantenedores do repositório.

Inclua no reporte:
- descrição objetiva da falha
- impacto esperado (exposição de dados, bypass de autenticação, elevação de privilégio etc.)
- passos de reprodução
- evidências (logs, payloads, telas)
- sugestão de mitigação, se houver

## SLA de Resposta

- Confirmação de recebimento: até 72 horas
- Triagem inicial: até 7 dias corridos
- Correção e publicação: conforme severidade e risco de exploração

## Escopo e Princípios de Segurança do Projeto

As medidas de segurança adotadas atualmente incluem:
- autenticação com JWT assinado e armazenado em cookie HttpOnly
- controle de sessão com cookies essenciais
- controle de acesso por papel (Admin e Cabo Eleitoral)
- validações de dados no backend e no frontend
- uso de ORM com Prisma para reduzir risco de injeção em consultas

## Boas Práticas para Ambiente de Produção

- use segredo forte e único por ambiente para assinatura JWT
- não versione arquivos .env nem credenciais
- mantenha dependências atualizadas e rode auditorias periódicas
- desative fallback de banco em memória em produção

## Política de Divulgação

Após correção validada, a vulnerabilidade pode ser divulgada de forma responsável com:
- resumo do problema
- versões impactadas
- versão com correção
- orientações de atualização
