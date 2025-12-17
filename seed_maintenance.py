# seed_maintenance.py
import re
import sys
from pathlib import Path
from uuid import uuid4

# Configura o caminho para encontrar os módulos da aplicação
sys.path.append(str(Path(__file__).parent / "attachments"))
from app.core.database import SessionLocal, engine
from app.core import models

# ==============================================================================
# DADOS COMPLETOS FORNECIDOS PELO USUÁRIO
# ==============================================================================
RAW_DATA = r"""
Plano de tarefas 0001 - LOOP
Ativo: Rotina de O&M

TAREFA: ACOMPANHAMENTO DE ACESSO AS USINAS
TIPO OE TAREFA: Acompanhamento de Serviço
CRITICIDADE: Médio
CLASSIFICAÇÃO 1:
CLASSIFICAÇÃO 2:
TEMPO OE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 02H:00mins
FAZER A TAREFA QUANDO? Criada manualmente pelo administrador, coordenador, supervisor ou operador em um evento de acesso as usinas (não há uma recorrência específica).
SUBTAREFAS:
1) Verificar, no momento do acesso, o cumprimento aos requisitos de acesso (certificar-se de que o visitante esteja portando documento de identificação, bem como a utilização de calças compridas e EPI's indicados pelo setor de SSMA)
2) Solicitar a todos os visitantes o preenchimento do Livro de Registro de Acesso (Anexar foto do Verificação livro de registro com a assinatura do acessante)
3) Acompanhar os visitantes durante todo o tempo que permanecerem dentro da usina
4) Registrar as atividades desempenhadas pelos acessantes e relatar ao COG Loop
5) Observações gerais

TAREFA: IMPLANTAÇÃO DE PLANO DE EMERGENCIA
TIPO DE TAREFA: Projeto
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Melhoria & Adequação de Projetos
CLASSIFICAÇÃO 2:
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 10mins
FAZER A TAREFA QUANDO? Criada manualmente pelo administrador, coordenador, supervisor ou operador (não há uma recorrência específica).
SUBTAREFAS:
1) Imprimir, tirar foto do documento exposto no O&M e anexar em OS

TAREFA: INSPEÇÃO DE CURTO CIRCUITO
TIPO DE TAREFA: Inspeção
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 30mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Criada manualmente pelo administrador, coordenador, supervisor ou operador (não há uma recorrência específica).
SUBTAREFAS:
1) Inspeção visual do circuito MT
2) Inspeção visual dos circuitos de BT
3) Inspeção visual do transformador
4) Inspeção dos inversores
5) Inspeção dos trackers
6) Foi encontrada alguma anomalia? Se sim, como foi solucionada?

TAREFA: INSPEÇÃO NA CAIXA DE FERRAMENTAS E EQUIPAMENTOS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Levantamento de informações
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada para a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor.
SUBTAREFAS:
1) Alicate Amperímetro CAT IV Minipa ET-4710: Verificar funcionamento e sinais de desgaste
2) Alicate Crimpador RJ45: Inspecionar o estado geral e a funcionalidade. Limpar resíduos, se presentes.
3) Alicate de Bico: Conferir alinhamento das pontas, presença de ferrugem e lubrificar articulações.
4) Alicate de Corte 6": Examinar fio de corte e verificar se há danos ou deformações.
5) Alicate de Pressão: Verificar funcionamento da trava e lubrificar mecanismo de ajuste.
6) Alicate Prensa Terminal MC4: Inspecionar funcionamento, sinais de desgaste e limpeza do mecanismo de prensagem.
7) Alicate Universal 8": Conferir estado das lâminas e articulações, realizando lubrificação se necessário.
8) Arco de Serra: Verificar se a lâmina está em boas condições e firmemente fixada.
9) Caixa de Ferramenta Sanfonada: Inspecionar o estado das gavetas, dobradiças e verificar ferrugem.
10) Câmera Termográfica Flir: funcionamento, precisão da leitura e limpeza da lente.
11) Conjunto de Chave Fenda e Philips Isoladas: Conferir isolamento, estado das pontas e desgaste geral.
12) Chave Inglesa 1 O": Verificar funcionamento do ajuste e sinais de desgaste ou ferrugem.
13) Chave MC4: Inspecionar para verificar se as garras estão em boas condições e livres de danos.
14) Conjunto de Aterramento Temporário: Inspecionar cabos, conectores e sinais de desgaste. Testar funcionalidade.
15) Conjunto de Bits p/ Parafusadeira: Conferir estado das pontas e se estão adequados para uso.
16) Conjunto de Chave Sextavada Catraca: Conferir a funcionalidade do mecanismo de catraca e verificar desgaste das chaves.
17 Conjunto de Chave Torx 9PCS: Inspecionar cada chave para sinais de desgaste ou deformação.
18) Detector de Tensão até 50kV: Verificar funcionamento do sinal sonoro, LED, e realizar teste em equipamento adequado.
19) Estilete 18mm: Verificar lâmina, funcionamento do mecanismo de retração e lubrificar se necessário.
20) Fasímetro Minipa: Testar funcionamento e verificar estado geral do equipamento.
21) Broca Engate Rápido para Ferro e Inox: Verificar desgaste e realizar limpeza das brocas.
22) Kit de Bloqueio LOTO: Conferir funcionalidade do cadeado e integridade das etiquetas.
23) Marreta 1,5kg: Inspecionar a cabeça para trincas e o cabo para segurança.
24) Marreta de Borracha: Verifica r integridade da borracha e fixação ao cabo.
25) Martelo Unha 18mm: Conferir estado geral do cabo e da cabeça, verificando alinhamento.
26) Megômetro Digital Minipa: Realizar teste de funcionalidade e verificar cabos de teste.
27) Paquímetro 150mm: Testar precisão da medição e verificar desgaste nos componentes.
28) Passa Fio 30m: Conferir se há desgaste ou danos no fio e no enrolador.
29) Serra Fixa 12": Verificar lâmina e fixação adequada ao suporte.
30) Termo Higrômetro: Testar funcionalidade e verificar precisão das medições.
31) Testador de Cabo de Rede RJ45 e RJ 11: Verificar funcionamento e testar em cabos de rede.
32) Torquímetro Estalo 1/2": Testar precisão e verificar lubrificação do mecanismo de ajuste.
33) Detector de Tensão por Aproximação: Verificar funcionalidade e testar em ambiente controlado.
34) Alicate Corta Cabo: Verificar estado das lâminas e articulações.
35 Alicate para Terminal Pré-Isolado: Testar funcionalidade e inspecionar para sinais de desgaste.
36) Trena 8m: Verificar funcionamento do mecanismo retrátil e estado da fita métrica.
37) Spray Galvanização a Seco: Verificar integridade do bico e agitar para testar funcionalidade.
38) Jogo de Soquetes 1/2 Pol. 8 a 32mm: Inspecionar cada soquete e verificar desgaste.
39) Tapete de Borracha Média Tensão: Inspecionar para verificar rachaduras ou furos.
40) Informar no campo abaixo caso seja encontrado alguma ferramenta danificada

TAREFA: LIMPEZA DOS FILTROS DE ADMISSÃO DE AR DOS COOLERS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Condicional
CLASSIFICAÇÃO 2: Mecânica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 01H00mins
FAZER A TAREFA QUANDO? Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador (não há uma recorrência específica).
SUBTAREFAS:
1) Realizar a limpeza dos filtros de admissão de ar para evitar avaria dos coolers bem como melhorar a arrefecimento das cabines.
2) Observações gerais

TAREFA: RELIGAMENTO EMERGENCIAL
TIPO DE TAREFA: Inspeção
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 30mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador (não há uma recorrência específica).
SUBTAREFAS:
1) Registre com uma foto as proteções atuadas no relé (Siga procedimento da IT_LOOP _001_Energização Pós-falha)
2) Realizar a coleta da oscilografia
3) Verifique se há condições para religamento
4) Solicitar ao COG autorização para religamento
5) Realize o fechamento do disjuntor de média tensão e tire foto do status do relé após atividade
6) Observações gerais

TAREFA: ROTINA DIÁRIA DE O&M
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 40mins
FAZER A TAREFA QUANDO? Agendada a cada 1 dia. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) A Análise Preliminar de Risco (APR) localizada na aba de ANEXOS, foi devidamente preenchida e assinada antes do inicio da atividade? (ANEXAR PRINT DO PREENCHIMENTO DA APR)
2) Verificar se todos os trackers estão na posição correta
3) Inspeção visual do para-raios e chave religadora da concessionária
4) Checar LEDs de sinalização, chaves de manobra e status do relé de proteção e disjuntor de média tensão
5) Checar Status dos Disjuntores de Baixa Tensão
6) Verificar relé de temperatura do transformador, reportar caso temperatura esteja acima do normal
7) Quantos desligamentos ocorreram no dia?
8) Quantos Trackers estão fora de operação? (citar todos os trackers parados, não somente Leitura do medidor os que pararam no dia).
9) Quantos Inversores estão fora de operação? Leitura do medidor
10) Quantas Strings estão fora de operação? Leitura do medidor
11) Quantos módulos estão com anomalias/danificados na usina?
12) Observações gerais

TAREFA: ROTINA MENSAL DOS EXTINTORES
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Levantamento de informações
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 01H00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Para cada extintor, deverá ser escrito na legenda da foto a localização do extintor (área de subestação, cabine, UFV 1, etc ) e nome da UFV
2) Quantos extintores tem na UFV? Número
3) Anexar uma foto de cada extintor a ± 1 metro de distância, onde apareça a localização onde ele está e se o equipamento está desobstruído
4) Anexar uma foto de cada extintor que apareça qual é o tipo (pó químico ou CO2) e qual a categoria (classe B, classe C, classe BC)
5) Anexar uma foto de cada etiqueta que mostre a validade do extintor
6) Anexar uma foto da capacidade de cada extintor (Kg ou litro)
7) Anexar uma foto de cada etiqueta do INMETRO
8) Observações gerais

TAREFA: ROTINA SEMANAL DE O&M
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Serviços Gerais
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 semana. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Inspeção geral dos equipamentos, alambrado, placas de identificação, cadeado do portão de acesso;
2) Verificar condições da britagem interna e externa, ver condições de limpeza e organização e ausência de vegetação na área da Subestação;
3) Registrar com foto a altura da vegetação da UFV
4) Registrar o nível de sujidade dos módulos fotovoltaicos
5) Observações gerais

TAREFA: VERIFICAÇÃO SEMANAL DA ALTURA DA VEGETAÇÃO
TIPO DE TAREFA: Inspeção
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 1 semana. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Registrar com fotos a altura da vegetação da UFV em pontos específicos
2) Realizar a medição da altura em que a vegetação se encontra
3) Observações gerais

TAREFA: VERIFICAÇÃO SEMANAL DA SUJIDADE DOS MÓDULOS
TIPO DE TAREFA: Inspeção
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Levantamento de informações
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 1 semana. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Tirar foto do nível de sujidade que se encontram os módulos fotovoltaicos
2) Caso encontrados pontos de sujeira pontuais nos módulos (como fezes de pássaros), realizar a limpeza e tirar algumas fotos representando o antes e depois
3) Observações gerais

TAREFA: VERIFICAR CONSUMO E INJEÇÃO DE ENERGIA NO MEDIDOR DA CONCESSIONÁRIA
TIPO DE TAREFA: Coleta de dados
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Instrumentação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verificar e registrar com foto quanto está o consumo de energia no medidor (código 003 no medidor)
2) Verificar e registrar com foto quanto está a injeção de energia no medidor (código 103 ou 55 no medidor)

TAREFA: VISTORIA GERAL DA UFV
TIPO DE TAREFA: Inspeção
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Levantamento de informações
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 02H00mins
FAZER A TAREFA QUANDO? Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Registro fotográfico da área da usina (portão de acesso, áreas comuns)
2) Verificação das condições de limpeza geral (área de módulos, cabines, vias de acesso)
3) Checagem da integridade física e operacional de todos os Inversores
4) Verificar condições estruturais e mecânicas dos trackers
5) Inspeção de cabos, bornes, conexões, disjuntores e demais componentes do QGBT
6) Checar integridade física e operacional do Transformador
7) Verificação do funcionamento do sistema SCADA
8) Registrar condição do sistema de câmeras e CFTV
9) Verificar condições do cercamento e sistema de drenagem da usina
10) Conferir organização do almoxarifado e da sala deO&M
11) Observações gerais

Plano de tarefas 0002 - LOOP
Ativo: Estação Solarimétrica

TAREFA: ATIVIDADE SEMANAL EM ESTAÇÃO SOLARIMÉTRICA
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 1 semana. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar inspeção visual completa da estação solarimétrica, verificar também quadro de comunicação.
2) Realizar limpeza dos sensores da estação e dos sensores no tracker (Piranômetro e Albedômetro)
3) Verificar nivelamento dos Piranômetros

TAREFA: ATIVIDADES SEMESTRAIS EM ESTAÇÃO SOLARIMÉTRICA
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Instrumentação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 01H00mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Inspecione a qualidade dos cabos da estação solarimétrica
2) Inspecione os conectores elétricos do quadro da estação
3) Inspecione a estrutura de montagem da estação, verifique conexões frouxas, problemas de corrosão, etc.
4) Realize a limpeza de todos os instrumentos e do quadro da estação
5) Verifique o nivelamento do piranômetro, mude o ângulo de inclinação do instrumento caso esteja fora da especificação
6) Inspecione as conexões de cada instrumento
7) Inspecione o interior da cúpula do piranômetro para verificar se há indícios de condensação de água
8) Realizar o backup de dados do Fieldlogger
9) Inspecionar as condições de aterramento da estação
10) Observações gerais

TAREFA: REALIZAR A RECALIBRAÇÃO DO PIRANÔMETRO
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 2 anos. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar o desmonte e armazenamento do piranômetro para envio para calibração
2) Observações gerais

Plano de tarefas 0003 - LOOP
Ativo: Atividades de Limpeza e Roçagem

TAREFA: ACOMPANHAMENTO DAS ATIVIDADES DE LIMPEZA DOS MÓDULOS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 05Dias 00H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar o acompanhamento diário das atividades de limpeza que estão sendo realizadas, relatar qualquer problema encontrado com equipe terceirizada
2) O serviço da terceirizada foi satisfatório? (somente finalizar essa OS quando trabalho da terceirizada acabar 100%)
3) Observações gerais

TAREFA: ACOMPANHAMENTO DAS ATIVIDADES DE ROÇAGEM
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 05Dias 00H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar o acompanhamento diário das atividades de roçagem que estão sendo realizadas, relatar qualquer problema encontrado com equipe terceirizada
2) O serviço da terceirizada foi satisfatório? (somente fina lizar essa OS quando trabalho da terceirizada acabar 100%)
3) Observações gerais

TAREFA: INSPEÇÃO DE SERVIÇOS DE LIMPEZA REALIZADOS PELA EQUIPE TERCEIRA
TIPO DE TAREFA: Inspeção
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Condicional
CLASSIFICAÇÃO 2: Serviços Gerais
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 02H 00mins
FAZER A TAREFA QUANDO? Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Inspecionar TODOS os Trackers para verificar se houveram módulos ou estruturas quebradas após atividades realizadas pela equipe terceirizada
2) Caso houveram quebras de módulos, cite quantos módulos quebraram
3) Observações gerais

TAREFA: INSPEÇÃO DE SERVIÇOS DE ROÇAGEM REALIZADOS PELA EQUIPE TERCEIRA
TIPO DE TAREFA: Inspeção
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Serviços Gerais
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 02H 00mins
FAZER A TAREFA QUANDO? Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Inspecionar TODOS os Trackers para verificar se houveram módulos quebrados após atividades realizadas pela equipe terceirizada
2) Caso houveram quebras de módulos, cite quantos módulos quebraram
3) Observações gerais

Plano de tarefas 0004 - LOOP
Ativo: Transformador a seco

TAREFA: INSPEÇÃO GERAL NO TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 30mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verifique se existem pontos de oxidação.
2) Verifique se as conexões a terra, os terminais e cabos de ligação, os tubos e as barras de ligação, etc., estão posicionados corretamente e suficientemente apertados.
3) Verifique se todos os parafusos e porcas estão suficientemente apertados.
4) Verifique o aterramento
5) Verifique o circuito de alimentação externo
6) Observações gerais

TAREFA: INSPEÇÕES PREDITIVAS COM EQUIPAMENTOS EM TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 01H 00mins
DURAÇÃO ESTIMADA: 01 H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar teste de resistência de isolamento
2) Realizar teste de continuidade dos enrolamentos com micro ohmímetro
3) Realizar testes com TTR
4) Realizar inspeção e torqueamento dos terminais de ALTA e BAIXA tensão
5) Conferir as conexões do relé de temperatura
6) Realizar simulação das proteções intrínsecas do transformador para verificar o sistema de proteção
7) Observações gerais

TAREFA: LIMPEZA DO TRANSFORMADOR E DA SALA
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 01 H 00mins
DURAÇÃO ESTIMADA: 01H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar limpeza do transformador conforme procedimento
2) Realizar verificação e limpeza do sistema de ventilação
3) Observações gerais

TAREFA: TERMOGRAFIA DO TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar termografia e anotar maior valor encontrado no núcleo do transformador
2) Realizar termografia e anotar maior valor encontrado nos terminais de ALTA TENSÃO do transformador
3) Realizar termografia e anotar maior valor encontrado nos terminais de BAIXA TENSÃO do transformador
4) Alguma anomalia encontrada?
5) Observações gerais

Plano de tarefas 0005 - LOOP
Ativo: Transformador a óleo

TAREFA: ANÁLISE CROMATOGRÁFICA DO ÓLEO ISOLANTE
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 20mins
DURAÇÃO ESTIMADA: 20mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar a retirada e armazenagem do óleo para Análise cromatográfica conforme procedimento

TAREFA: ANÁLISE FÍSICO-QUÍMICA DO ÓLEO ISOLANTE
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 20mins
DURAÇÃO ESTIMADA: 20mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar a retirada e armazenagem do óleo para Análise físico-química conforme procedimento
2) Observações gerais

TAREFA: INSPEÇÃO GERAL NO TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 40mins
DURAÇÃO ESTIMADA: 40mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verifique se existem vazamentos de óleo.
2) Verifique se existem pontos de oxidação.
3) Verifique se as conexões a terra, os terminais e cabos de ligação, os tubos e as barras de ligação, etc., estão posicionados corretamente e suficientemente apertados.
4) Verifique se todos os parafusos e porcas estão suficientemente apertados.
5) Válvula de alivio de pressão:
5.1) Verifique o estado externo da válvula.
5.2) Verifique se existem vazamentos de óleo.
5.3) Verifique o acionamento do pino indicador de atuação.
6) Indicador de nível do óleo:
6.1) Verifique o estado externo.
6.2) Teste o funcionamento do componente.
7) Termômetro do óleos:
7.1) Verifique o estado externo
8) Verifique o aterramento Sim/Não
9) Verifique o circuito de alimentação externo
10) Observações gerais

TAREFA: INSPEÇÕES PREDITIVAS COM EQUIPAMENTOS EM TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 01H 00mins
DURAÇÃO ESTIMADA: 01H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar teste de resistência de isolamento
2) Realizar teste de continuidade dos enrolamentos com micro ohmímetro
3) Realizar testes com TTR
4) Observações gerais Texto

TAREFA: INSPEÇÕES TRIMESTRAIS EM TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 3 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verifique a temperatura mediante uma inspeção visual. Comparar com os dados da placa de identificação do transformador.
2) Verifique o nível do óleo mediante uma inspeção visual. Verificar o nível de óleo indicado pelo instrumento. Se muito próximo do nível mínimo, será necessário contatar fabricante.
3) Verifique se há algum vazamento mediante uma inspeção visual em todo o perímetro do equipamento.
4) Verifique se existem pontos de oxidação
5) Verifique se há algum vazamento mediante uma inspeção visual no painel corrugado, flanges de conexão e válvulas do sistema de resfriamento.
6) Verifique no corpo da bucha que não haja trincas e/ou peças quebradas.
7) Verifique se existe dano ao acionamento manual ou manivela do comutador de tensão.
8) Observações gerais

TAREFA: LIMPEZA DO TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 30mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar limpeza do transformador conforme procedimento
2) Observações gerais

TAREFA: TERMOGRAFIA DO TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar termografia e anotar maior valor encontrado no núcleo do transformador
2) Realizar termografia e anotar maior valor encontrado nos terminais de ALTA TENSÃO do Leitura do medidor transformador
3) Realizar termografia e anotar maior valor encontrado nos terminais de BAIXA TENSÃO Leitura do medidor do transformador
4) Alguma anomalia encontrada?
5) Observações gerais

Plano de tarefas 0006 - LOOP
Ativo: Inversores

TAREFA: AFERIÇÕES EM STRINGS DE voe, V+ E V- COM AMPERÍMETRO
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 50mins
DURAÇÃO ESTIMADA:50mins
FAZER A TAREFA QUANDO? Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Utilize os EPls adequados para atividade, conforme procedimento IT_LOOP_009.
2) Informe COG que será iniciado desligamento do equipamento
3) Desconecte o disjuntor CA situado entre o inversor e a rede elétrica
4) Realize a medição das Strings CC conectados ao INVERSOR, para verificar existência de corrente
5) Realize as medições de tensão CA no inversor, para averiguar que o mesmo se encontra desenergizado
6) Desligue todos os interruptores de entrada de corrente contínua do inversor (e da Combiner se aplicável) e confirme que todos estejam na posição desligado (OFF).
7) Em casos que o inversor possua Combiner Box, será necessário realizar as medições de todas as Strings Fotovoltaicas conectadas a combiner para verificar a ausência de corrente antes de realizar qualquer aferição ou seccionamento do fusível. Utilize uma pinça amperimétrica para medir a corrente contínua (CC) em cada entrada das Strings fotovoltaicas conectadas a Combiner.
8) Realize as medições de tensão solicitadas (Voc, V+ e V-), e registre todas as medições no IT_LOOP_016_Testes_Amperímetro_STRING_Anexo01
9) Anotando todas as medições, tire uma foto da folha com os resultados e coloque em anexo deste tópico.
10) Observações gerais

TAREFA: ATIVIDADES MENSAIS EM INVERSORES
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 20mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verificar se há sinais visíveis de danos, como amassados, rachaduras ou corrosão no invólucro do inversor.
2) Verificar se as aberturas de ventilação estão livres de obstruções.
3) Inspecionar visualmente as conexões de entrada e saída do inversor para verificar possíveis afrouxamentos, oxidações ou danos.
4) Realizar o reaperto das conexões, caso necessário, verificando a soltura dos cabos de ligações;
5) Verificar a existência de alarmes ou mensagens de erro no sistema de controle do inversor.
6) Verificar se não há erosões nas bases ou entorno do equipamento;
7) Observações gerais

TAREFA: ATIVIDADES SEMESTRAIS EM INVERSORES
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 20mins
DURAÇÃO ESTIMADA: 20mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realize o desligamento do equipamento conforme procedimento operacional de desligamento de Inversores
2) Realize a limpeza da carcaça do inversor e do ambiente em seu entorno
3) Verifique se há poeira ou objetos estranhos nas aberturas de entrada e saída de ar, caso haja remova (para remoção Inversor deve estar desligado)
4) Este inversor está com algum ruído anormal durante operação?
5) Realize a limpeza dos ventiladores do inversor (caso aplicável)
6) Verifique se o equipamento está com algum dano ou deformação
7) Verifique se algum cabo está desconectado ou solto
8) Verifique se os cabos estão danificados, especialmente se o revestimento do cabo que entra em contato com uma superfície metálica está danificado.
9) Verifique se os plugues de vedação dos terminais de entrada CC não usados caíram.
10) Verifique se as portas COM e USB não usadas estão bloqueadas por tampas á prova d'água.
11) Verifique se os cabos de aterramento estão bem aterrados, realize o reaperto das conexões.
12) A região onde inversor está abrigado está segura e livre de vazamentos, etc.?
13) Verificar se o disjuntor do QGBT corresponde a posição física do Inversor no SKID.
Colocar uma fita com o número do disjuntor para posteriormente colocarmos uma TAG
14 Observações gerais

TAREFA: CAPTURA DE DADOS CURVA IV
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 01H 00mins
DURAÇÃO ESTIMADA: 01H 00mins
FAZER A TAREFA QUANDO? Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Pedir permissão para desligamento do equipamento para COGT, conforme procedimento.
2) Desligar chave CC do Inversor a ser avaliado
3) Verificar se equipamento está desligado
4)Reportar hora de desligamento do equipamento
5) Realizar testes em todas as STRINGS conforme procedimento e manual anexo.
6) Atividades foram realizadas com sucesso? Descreva caso dificuldades tenham ocorrido.
7) Hora de término do serviço
8) Em análise preliminar, alguma String apresentou comportamento anômalo? Coloque em número quantas.
9) Observações Gerais

TAREFA: CONTROLE DE ESTANQUEIDADE
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 3 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verificar o estado das conexões e invólucros externos do inversor.
2) Garantir que não haja sinais de desgaste ou danos que possam comprometer a estanqueidade.
3) Verificar visualmente se a espuma expansiva está intacta e sem fissuras, rachaduras ou áreas deterioradas.
4) Caso a espuma tenha sido removida ou não haja vedação, aplique a espuma expansiva, limpando a superfície a ser vedada, removendo qualquer resíduo da antiga espuma ou sujeira acumulada.

TAREFA: TERMOGRAFIA DE INVERSORES
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Será feita medição com termohigrometro?
2) Será feita medição da corrente CA dos inversores?
3) Será feita medição da corrente CC?
4) Caso medido corrente CA, anote valor em amperes
5) Caso medido corrente CC, anote valor em amperes
6) Temperatura da carcaça do inversor
7) Temperatura máxima dos cabos CA do inversor
8) Temperatura máxima dos cabos CC do inversor
9) Algum ponto quente encontrado?
10) Observações gerais

TAREFA: TESTE DE RESISTÊNCIA DE ISOLAMENTO EM STRINGS
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Performance
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 50mins
FAZER A TAREFA QUANDO? Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Inspeção completa das strings associadas ao inversor da OS
2) Verificação de conexões e cabos para detectar possíveis pontos de falha.
3) Teste de resistência de isolamento com megôhmetro de 1,5 kV para confirmar a condição dos cabos e módulos.

TAREFA: VERIFICAÇÃO DE BACKTRACKING
TIPO DE TAREFA: Inspeção
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Melhoria & Adequação de Projetos
CLASSIFICAÇÃO 2: Performance
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Fazer o registro fotográfico das mesas do inversor correspondente a OS as 7h00
2) Mostrar se há sombreamento nos módulos

TAREFA: VERIFICAÇÃO DE DESEMPENHO DO INVERSOR
TIPO DE TAREFA: Inspeção
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Condicional
CLASSIFICAÇÃO 2: Performance
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA:  01 H 30mins
FAZER A TAREFA QUANDO? Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Tirar foto do inversor correspondente a OS
2) Verificar vegetação no entorno do inversor
3) Verificar status e condições dos conectores MC4 do inversor
4) Verificar alinhamento entre as mesas de trackers
5) Verificar sujidade dos módulos associados ao inversor da OS
6) Verificar altura da vegetação no entorno dos módulos correspondentes ao inversor da OS
7) Verificar as condições das conexões MC4 dos módulos associados ao inversor da OS
8) Verificar sombreamento nos módulos associados ao inversor da OS
9) Observações gerais.

TAREFA: VERIFICAÇÃO DE PARÂMETROS DO INVERSOR
TIPO DE TAREFA: Inspeção
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 10mins
FAZER A TAREFA QUANDO? Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verificar diariamente os status das condições gerais dos inversores;
2) Verificar se possui avisos e alarmes ativos no supervisório do sistema
3) Verificar abas de Visão Geral (Dados de Geração / Potencial Real) Dispositivos, Falhas e Curvas.
4) Visualizar inversor no sistema, com informações individualizadas de níveis de tensão, corrente, frequência, potência ativa e reativa, verificando se não há discrepância de informações.
5) Verificar Informações gerais do arranjo de cada String.
6) Caso identificar qualquer discrepância das informações, erros ou falhas, relatar imediatamente ao COG e abrir SS (Solicitação de Serviço) para intervenção e correção do item;
7) Observações gerais

Plano de tarefas 0007 - LOOP
Ativo: Subestação MT

TAREFA: ATIVIDADES ANUAIS EM DISJUNTOR MT
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 30mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Examinar o disjuntor em busca de danos externos, desgaste, corrosão e acúmulo de sujeira.
2) Verificar a integridade das etiquetas de identificação e instruções de operação.
3) Remover poeira, sujeira e outros contaminantes dos componentes externos e internos acessíveis do disjuntor.
4) Testar os mecanismos de abertura e fechamento para assegurar que estão operando suavemente e dentro dos tempos esperados.
5) Verificar a continuidade e a integridade das conexões de aterramento.
6) Inspecionar e apertar conexões elétricas, incluindo terminais e braçadeiras.
7) Checar relês, contadores, indicadores e dispositivos de proteção associados ao disjuntor.
8) Observações gerais

TAREFA: ATIVIDADES ANUAIS EM SECCIONADORA MT
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 30mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Remover poeira, sujeira e detritos acumulados em todas as partes acessíveis da seccionadora MT.
2) Realizar manobras de abertura e fechamento para testar a operacionalidade. Observar por quaisquer sinais de hesitação ou dificuldade durante a operação.
3) Inspecionar visualmente os cabos e as conexões de terra para sinais de corrosão ou danos.
4) Apertar parafusos e porcas nos terminais para garantir boa condutividade e fixação segura. (Caso disponível utilizar torquímetro para garantir o torque adequado conforme as recomendações técnicas).
5) Inspecionar buchas, articulações e acoplamentos para garantir que não há folgas excessivas ou desgaste.
6) Testar as funções dos dispositivos de bloqueio e sinalização associados á seccionadora.
7) Observações gerais

TAREFA: ATIVIDADES ANUAIS EM TC
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 30mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Limpar cuidadosamente o TC, removendo acúmulos de poeira, sujeira e outros detritos que possam afetar seu desempenho.
2) Verificar a condição dos isoladores e a integridade das fixações e suportes.
3) Observações gerais

TAREFA: ATIVIDADES ANUAIS EM TP
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 30mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Remover sujeira, detritos e outros contaminantes da superfície externa do transformador, buchas, radiadores e respiradouros para manter a eficiência do resfriamento e prevenir falhas.
2) Inspecionar as conexões elétricas para certificar-se de que estão seguras e sem corrosão, e verificar a eficácia do sistema de aterramento.
3) Medir os níveis de ruído do transformador para detectar problemas como núcleo magnético solto ou vibrações anormais dos enrolamentos.

TAREFA: COLETA DE DADOS DE GERAÇÃO DOS INVERSORES
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Instrumentação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Dados de geração foram coletados conforme procedimento?
2) Anexar neste tópico os dados de geração de cada inversor deste grupo gerador (UG)

TAREFA: INSPEÇÃO VISUAL: SECCIONADORA MT, DISJUNTOR MT, TPS E TCS
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Examinar todas as partes mÃ³veis e fixas da seccionadora para identificar sinais de desgaste anormal.
2) Inspecionar a estrutura metálica, parafusos, e componentes da seccionadora para detectar pontos de corrosão, especialmente em áreas expostas ao ambiente.
3) Avaliação de Isoladores: Checar os isoladores em busca de trincas, quebras, ou qualquer tipo de dano que possa comprometer a isolação elétrica.
4) Checar os acessórios e dispositivos de proteção associados, como fusíveis e dispositivos de bloqueio, para garantir que estão operacionais.
5) Avaliar a aparência externa do disjuntor MT para qualquer sinal Ã³bvio de danos ou sujeira excessiva.
6) Inspecionar os isoladores do disjuntor MT para detectar fissuras, desgaste ou qualquer outro dano que possa comprometer a isolação.
7) Examinar as partes metálicas para identificar sinais de corrosão ou ferrugem que possam afetar a integridade estrutural ou a operação do disjuntor.
8) Inspecionar os isoladores por sinais de trincas, carbonização, ou desgaste que possam comprometer as propriedades dielétricas do TC.
9) Observar a carcaça e as conexões do TC para qualquer sinal de corrosão que possa afetar a estrutura ou a funcionalidade.
10) Certificar-se de que o invólucro está intacto e sem danos, incluindo a tampa e as vedações, para prevenir a entrada de umidade ou detritos.
11) lnspeccionar os suportes e fixações do TC para garantir que estão seguros e sem sinais de desgaste ou danos.
12) Observar o TP (Transformador de potência!) como um todo para verificar a presença de danos externos, tais como amassados ou impactos na estrutura.
13) Examinar os isoladores do TP para qualquer sinal de rachaduras, quebras ou sujeira acumulada que possa afetar a isolação.
14) Avaliar as partes metálicas do TP, para detectar sinais de corrosão ou ferrugem.
15) Verificação de Ruídos Anormais: Escutar para quaisquer ruídos anormais que possam indicar problemas em qualquer um dos componentes citados nessa OS.
16) Observações Gerais

TAREFA: INSPEÇÕES EM BASTÃO DE MANOBRA, TAPETE ISOLADO E LUVA ISOLADA
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Instrumentação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verificar sinais de danos visíveis, como rachaduras, cortes ou desgaste no bastão de manobras e nas luvas de proteção.
2) Checar a data de fabricação e o prazo de validade recomendado pelo fabricante (bastão de manobra e luva isolada).
3) Garantir que o bastão e as luvas estejam limpos e livres de contaminação por óleo, graxa ou qualquer substância que possa comprometer a sua eficácia isolante
4) Teste de Aderência: As luvas devem ser testadas para garantir que proporcionam a aderência necessária para operar o bastão de manobras de forma segura.
5) Verificar se o bastão e as luvas estão sendo armazenados corretamente, em local seco e protegido da luz solar direta, para evitar o envelhecimento precoce do material. Verificar se local de armazenagem está integro.
6) Examinar o tapete isolante em busca de desgaste, rasgos, furos ou qualquer deformidade que possa comprometer suas propriedades isolantes.
7) Certificar-se de que o tapete está limpo e livre de sujeira, óleos, graxas ou substâncias químicas que possam afetar sua capacidade de isolamento.
8) Checar a data de fabricação e seguir as recomendações do fabricante quanto á vida útil do tapete isolante.
9) Verificar se o tapete está livre de qualquer condição que possa causar tropeços ou quedas, como bordas enroladas ou superfícies irregulares.
10) Observações Gerais

TAREFA: MEDIÇÕES ANUAIS EM EQUIPAMENTOS DA SUBESTAÇÃO: DJ MT, SECCIONADORA MT, TP E TC.
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 30mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar a medição da temperatura e humidade na área interna da subestação (Anotar valor de temperatura aqui).
2) Realizar a medição da temperatura e humidade na Área interna da subestação (Anotar valor de humidade aqui).
3) Utilizar um megôhmetro para medir a resistência de isolamento em cada polo da seccionadora. (Anotar aqui valor da menor resistência encontrada). (Nas fotos deve se ter todas as medições realizadas).
4) Verificar a integridade e continuidade do sistema de aterramento com microhmimetro, incluindo todas as conexões. (Anotar maior resistência de contato encontrada). (Nas fotos deve se ter todas as medições realizadas).
5) Medir a resistência de contato para cada fase usando um microohmímetro para assegurar a eficiência das conexões. (Anotar aqui maior resistência encontrada). (Nas fotos deve se ter todas as medições realizadas).
6) Teste de Resistência de Contato com Microohmímetro. Realizar testes para avaliar a qualidade das conexões internas do disjuntor. (Anotar aqui maior resistência encontrada).
(Nas fotos deve se ter todas as medições realizadas).
7) Aplicar uma tensão de teste específica para medir a resistência de isolamento das partes isolantes do disjuntor. (Anotar aqui menor resistência encontrada). (Nas fotos deve se ter todas as medições realizadas).
8) Medir a relação de transformação para garantir que o TC esteja operando dentro das especificações. (Anotar aqui valor encontrado). (Nas fotos deve se ter todas as medições realizadas).
9) Testar a resistência de isolamento dos enrolamentos do TC para detectar qualquer degradação do isolamento.
10) Verificar a relação de transformação para confirmar que o TP está conforme as especificações de fabricação.
11) Avaliar a resistência de isolamento dos enrolamentos e das buchas do TP.
12) Observações gerais (citar se foi encontrada alguma anomalia, se ocorreu tudo bem, etc.)

TAREFA: TERMOGRAFIA DA SECCIONADORA MT, DISJUNTOR MT, TP E TC
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar termografia da seccionadora MT e anotar maior medição obtida em campo. (Inserir uma foto demonstrando termografia realizada)
2) Realizar termografia do disjuntor MT e anotar maior medição obtida em campo. (Inserir uma foto demonstrando termografia realizada)
3) Realizar termografia do TP e anotar maior medição obtida em campo. (Inserir uma foto demonstrando termografia realizada)
4) Realizar termografia do TC e anotar maior medição obtida em campo. (Inserir uma foto demonstrando termografia realizada)
5) Observações Gerais

Plano de tarefas 0008 - LOOP
Ativo: QGBT

TAREFA: ATIVIDADES ANUAIS QGBT
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 01H 00mins
DURAÇÃO ESTIMADA: 01H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Teste de Isolamento entre Barramentos: Verifique a resistência de isolamento entre os diferentes barramentos, como fase-fase e fase-terra. (Anotar o menor valor de isolamento encontrado e registrar fotos de todos os testes realizados)
2) Teste de Isolamento dos Circuitos: Desconecte todos os dispositivos do QGBT e teste cada circuito individualmente. Isso inclui os condutores fase, neutro e terra. (Anotar o menor valor de isolamento encontrado e registrar fotos de todos os testes realizados)
3) Teste de Isolamento dos Disjuntores: Desconecte os disjuntores do circuito e teste a resistência de isolamento entre os terminais e entre cada terminal e a terra. (Anotar o menor valor de isolamento encontrado e registrar fotos de todos os testes realizados)
4) Verificação da Continuidade da Terra: Realizar teste de continuidade com micro ohmímetro, para verificar bom funcionamento do aterramento do QGBT.
5) Lubrificar dobradiças do QGBT
6) Verificar qualidade da pintura, se há sinais de corrosão e afins no QGBT
7) Observações gerais

TAREFA: ATIVIDADES SEMESTRAIS NO QGBT
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 02H 00mins
DURAÇÃO ESTIMADA: 02H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar procedimento para desligamento da planta para realizar atividades em QGBT
2) Realizar reaperto das conexões elétricas do equipamentos internos ao QGBT
3) Realizar reaperto das conexões mecânicas do QGBT
4) Verificar ausência de ruídos advindo do QGBT Realizar limpeza geral do QGBT Observações gerais
5) Realizar limpeza geral do QGBT
6) Observações gerais

TAREFA: INSPEÇÃO DE QUADRO GERAL DE BAIXA TENSÃO
TIPO DE TAREFA: Inspeção
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Utilize os EPIs adequados para inspeção, conforme procedimento
2) Realize a abertura com cuidado para evitar danificar qualquer componente
3) Verifique a presença de sujeira, poeira, resíduos, insetos, roedores ou quaisquer sinais de animais.
4) Verifique se há sinais de danos causados por animais, como fios roídos ou componentes comprometidos
5) Em caso de danos e/ou sujeira, descreva nas observações gerais os locais afetados para reparos posteriores, anexe fotos neste tópico caso existam inconformidades
6) Observações gerais

TAREFA: TERMOGRAFIA QGBT
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Anotar hora que medições começaram a ser realizadas
2) Realizar termografia dos barramentos do QGBT. (Anotar o maior valor de temperatura encontrada e registrar fotos de todos os testes realizados)
3) Realizar termografia dos disjuntores. (Anotar o maior valor de temperatura encontrada e registrar fotos de todos os testes realizados)
4) Realizar termografia dos outros dispositivos auxiliares encontrados no local. Caso haja alguma anomalia descrever neste tópico.
5) Observações gerais

Plano de tarefas 0009 - LOOP
Ativo: Trackers

TAREFA: INSPEÇÃO GERAL NOS TRACKERS E MÓDULOS
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Mecânica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 10mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verificar as condições gerais dos módulos que estão conectados ao tracker da OS
2) Realizar uma inspeção visual geral no tracker
3) Verificar as conexões dos cabos CC e checar se está tudo OK (nas STRINGS referentes ao tracker desta OS)
4) Caso encontrados pontos de vegetação que estão causando sombreamento neste setor, realizar a supressão pontual da mesma
5) Verificar condições do casquilho, porcas e parafusos do tracker
6) Observações gerais

TAREFA: LUBRIFICAÇÃO ANUAL TRACKERS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Mecânica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 01 H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Controle de lubrificação do rolamento principal.
2) Verificação da lubrificação das engrenagens do parafuso sem fim.
3) Observações gerais

TAREFA: MANUTENÇÃO PREVENTIVA ANUAL TRACKERS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Mecânica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 01 H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verificar a fixação do módulo na estrutura do Tracker (Condições gerais)
2) Verifique se há sinais de curto-circuito presentes
3) Inspeção visual dos cabos e terminais das Strings
4) Verificação da torção e corrosão dos terminais de terra
5) Verificação visual de etiquetas de identificação de circuito.
6) Verificação visual de qualquer ruptura, presença de água, problemas de fiação, corrosão.
7) Verificação se há sinais de deformações de caixas elétricas devido ao superaquecimento.
8) Verificação visual das etiquetas de identificação e condições das chapas.
9) Inspeção visual das juntas parafusadas
10) Inspeção visual galvanizada.
11) Inspeção visual da soldagem
12) Inspeção visual da fundação.
13) Inspeção visual da fuga de corrente do motor de engrenagem
14) Controle visual do sistema de controle do tracker.
15) Verificação do cabo do motor
16) Verificação do cabo de alimentação da TCU.
17) Observações gerais
18) Controle do aperto dos parafusos do sistema de transmissão

TAREFA: SUBSTITUIÇÃO DE TCU
TIPO DE TAREFA: Manutenção Corretiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Corretiva Emergencial
CLASSIFICAÇÃO 2: Mecânica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Registrar numeração serial da TCU que está sendo retirada
2) Registrar numero de MAC da TCU que está sendo retirada
3) Registrar numeração serial da TCU nova, que foi instalada no tracker
4) Registrar o numero de MAC da TCU nova, que foi instalada no tracker

TAREFA: TERMOGRAFIA DOS MÓDULOS
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar termografia dos mÃ³dulos solares do setor conectado a este inversor
2) Em casos em que foram encontradas anomalias (pontos quentes) abra uma Solicitação de Serviço indicando em qual string foi encontrado módulo com anomalia, coloque fotos na SS.
3) Observações gerais

TAREFA: TORQUEAMENTO E CONECTORES ANUAL TRACKERS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Mecânica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 02H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verificação de aperto dos parafusos da estrutura
2) Controle de fuga do sistema de transmissão
3) Condição de ajuste dos conectores do cabo do módulo fotovoltaico
4) Observações gerais

TAREFA: VERIFICAÇÃO E REAPERTO NOS PARAFUSOS DA ESTRUTURA
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Condicional
CLASSIFICAÇÃO 2: Mecânica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Utilizar torquímetro para inspecionar e reapertar os parafusos das estruturas do tracker conforme o torque especificado pelo fabricante.
2) Verificar integridade do casquilho
3) Observações gerais

Plano de tarefas 0010 - LOOP
Ativo: RSU/NCU

TAREFA: ATIVIDADES ANUAIS EM RSU
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verifique se todas as conexões mecânicas da unidade estão ajustadas adequadamente; caso contrário, devem ser apertadas com as ferramentas apropriadas.
2) Verifique o bom funcionamento da caixa e se não há sinais de corrosão ou deterioração.
3) Simular um comportamento anormal, como vento, etc., para que todos os alarmes sejam gerados corretamente e o sistema responda conforme o esperado. Reportar como foi andamento do teste.
4) Observações gerais

Plano de tarefas 0011 - LOOP
Ativo: SCADA

TAREFA: INSPEÇÃO VISUAL E LIMPEZA DO SISTEMA SUPERVISÓRIO (SCADA)
TIPO DE TAREFA: Inspeção
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Automação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar inspeção para verificar como está sujidade do supervisório
2) Verificar se componentes estão bem conectados e operacionais
3) Caso esteja suja, realizar limpeza do Rack do supervisório
4) Observações gerais

Plano de tarefas 0012 - LOOP
Ativo: Sala de Controle

TAREFA: CONDIÇÕES DE LIMPEZA DA SALA DE CONTROLE, BANHEIRO E AFINS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Civil
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 01 H 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 semana. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar inspeção visual das condições de limpeza da sala de controle
2) Realizar limpeza da sala de controle e tirar fotos do antes e depois
3) Realizar inspeção visual do banheiro
4) Realizar limpeza do banheiro e tirar fotos do antes e depois
5) Observações gerais

TAREFA: CONDIÇÕES DE PINTURA DA SALA DE CONTROLE E VALIDADE DOS EXTINTORES
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar inspeção minuciosa das condições da estrutura da sala de controle: Pintura, terreno no interno e etc.
2) Caso encontrado algum ponto passível de correção, abrir solicitação de serviço
3) Verifique a validade de todos os extintores da UFV
4) Existem disjuntores fora da validade? Se sim, quais? Caso existam abrir Solicitação de Serviço.
5) Observações gerais

TAREFA: INSPEÇÃO DOS PONTOS DE ILUMINAÇÃO DA ÁREA EXTERNA E DOS LOCAIS TÉCNICOS
TIPO DE TAREFA: Inspeção
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Serviços Gerais
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Inspecionar todos pontos de iluminação da planta e verificar seu funcionamento
2) Caso encontrado algum ponto com falha, abrir solicitação de serviço
3) Observações gerais

TAREFA: LIMPEZA DO ALMOXARIFADO
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar limpeza do almoxarifado e tirar fotos do antes e depois
2) Reorganizar os materiais de forma lógica e de fácil acesso, agrupando-os por categorias (ferramentas, EPIs, materiais elétricos, etc.), se necessário.
3) Separar os resíduos gerados durante a limpeza, como embalagens vazias, produtos inutilizáveis e materiais de descarte, em lixo comum, reciclável e resíduos perigosos, conforme aplicável.

Plano de tarefas 0013 - LOOP
Ativo: Aterramento

TAREFA: INSPEÇÃO COM MICROOHMÍMETRO EM MALHA DE ATERRAMENTO DE TODA UFV
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 05D 00H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar todas as medições e testes na malha de aterramento da UFV, de acordo com procedimento
2) Relatório a parte deve ser elaborado para esse procedimento, marcar data de entrega desse relatório. Caso ele tenha sido finalizado, anexar ele a esta OS
3) Observações gerais

TAREFA: VERIFICAÇÃO DE TODAS AS CAIXAS DE INSPEÇÃO DE ATERRAMENTO DA UFV
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA:  08H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Realizar verificação das caixas de inspeção e verificar se há alguma anomalia, ninhos, conexão folgada, corrosão dos cabos, etc.
2) Observações gerais

Plano de tarefas 0014 - LOOP
Ativo: Planta de Alarme e CFTV

TAREFA: REALIZAR LIMPEZA DOS DISPOSITIVOS DE CFTV
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 03H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Limpeza dos Quadros Elétricos que alimentam CFTV
2) Limpeza das câmeras de CFTV
3) Observações gerais

TAREFA: ROTINA DE INSPEÇÃO EM CÂMERAS, SENSORES, CABOS E CONEXÕES
TIPO DE TAREFA: Inspeção
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Automação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 01 H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verificar estado do computador e NVR onde o CFTV está conectado
2) Verificar estado de cada uma das câmeras da Planta
3) Verificar estado interno dos quadros elétricos conectados as câmeras
4) Existe alguma câmera que não está funcionando?
5) Observações gerais

Plano de tarefas 0015 - LOOP
Ativo: Vias de acesso

TAREFA: INSPEÇÃO MENSAL DAS VIAS DE ACESSO
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Civil
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verificar a superfície do pavimento das vias de acesso para identificar rachaduras, buracos, desgaste ou deformações
2) Realizar limpeza da superfície das vias para remover detritos, poeira e resíduos que possam prejudicar a integridade do pavimento ou a segurança dos veículos, caso necessário.
3) Inspecionar as placas de sinalização e demarcações na via para garantir que estejam em boas condições de visibilidade.
4) Verificar os pontos de drenagem laterais e áreas com potencial de erosão ao longo da via, especialmente após chuvas.
5) Observações Gerais

Plano de tarefas 0017 - LOOP
Ativo: Drenagem

TAREFA: INSPEÇÃO MENSAL DA DRENAGEM
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Civil
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) SKID: Verificar sinais de erosão, Identificar áreas com acúmulo de água (poças, lama), Avaliar a inclinação e o escoamento natural do terreno.
2) TRACKERS: Verificar sinais de erosão, Identificar áreas com acúmulo de água (poças, lama), Avaliar a inclinação e o escoamento natural do terreno.
3) CERCAMENTO: Verificar sinais de erosão, Identificar áreas com acúmulo de água (poças, lama), Avaliar a inclinação e o escoamento natural do terreno.
4) CUBICULO BLINDADO: Verificar sinais de erosão, Identificar áreas com acúmulo de água (poças, lama), Avaliar a inclinação e o escoamento natural do terreno.
5) POSTES DE CFTV E ILUMINAÇÃO: Verificar sinais de erosão, Identificar áreas com acúmulo de água (poças, lama), Avaliar a inclinação e o escoamento natural do terreno.
6) VIAS DE ACESSO: Verificar sinais de erosão, Identificar áreas com acúmulo de água (poças, lama). Avaliar a inclinação e o escoamento natural do terreno.
7) Avaliar a inclinação e o escoamento natural do terreno.
8) Inspecionar valetas, canais ou sulcos de drenagem: Avaliar se estão entupidos, danificados ou assoreados.
9) Verificar se os drenos desviam a água corretamente.
10) Inspecionar bueiros e tubulações para detectar bloqueios.
11) Verificar a integridade estrutural (rachaduras, infiltrações).
12) Verificar se há erosões, ravinas e voçoroca em toda área da UFV. (caso seja identificado qualquer indício, início de erosões, ABRIR SS com fotos para que seja evidenciado a anomalia.)

TAREFA: LIMPEZA DA CANALETA DE DRENAGEM, BOLSÕES E CAIXAS DISSIPADORAS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Serviços Gerais
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 01 H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 15 dias. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Identificar e registrar possíveis rachaduras, erosões ou danos estruturais na canaleta.
2) Remover manualmente grandes detritos (folhas, galhos, pedras) e outros resíduos acumulados nas canaletas e bolsões.
3) Usar uma pá pequena ou raspador para remover lodo, areia e sedimentos que se acumularam no fundo dos bolsões.
4) Verificar se a água flui corretamente após a limpeza, sem pontos de retenção.
5) Realizar a limpeza das caixas dissipadoras
6) Observações gerais

Plano de tarefas 0018 - LOOP
Ativo: Cercamento

TAREFA: INSPEÇÃO DO CERCAMENTO
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Civil
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 20mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Inspecionar Cercamento por completo, malha de aterramento, pontos de erosão, pontos de possível invasão, etc.
2) Caso existam anomalias, abrir solicitação de serviço
3) Observações gerais

Plano de tarefas 0019 - LOOP
Ativo: Ar Condicionado

TAREFA: INSPEÇÕES SEMESTRAIS NO AR CONDICIONADO
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Mecânica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 01 H 30mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Limpar ou substituir os filtros, garantindo que estejam livres de poeira e detritos.
2) Verificar a pressão do gás refrigerante para garantir que está dentro da faixa correta. Recarregar, se necessário.
3) Inspecionar o estado das conexões elétricas e os cabos para detectar sinais de desgaste, corrosão ou mau contato.
4) Verificar e limpar as aletas da unidade condensadora e evaporadora para garantir que não haja bloqueio do fluxo de ar e troca de calor eficiente.
5) Conferir o sistema de drenagem e, se necessário, limpar o tubo de drenagem para evitar entupimentos e vazamentos.
6) Testar o ar-condicionado em todos os modos de operação, como resfriamento, aquecimento (se aplicável), ventilação e desumidificação, para garantir que todas as funções estejam operando corretamente.
7) Observações Gerais

TAREFA:  INSPEÇÕES TRIMESTRAIS NO AR CONDICIONADO
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Mecânica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 3 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Inspecionar e limpar os filtros de ar. Se estiverem muito sujos ou danificados, substituir conforme necessário.
2) Escutar o funcionamento do compressor e ventilador para identificar ruídos incomuns que possam indicar problemas mecânicos.
3) Verificar a unidade externa e interna para garantir que não haja obstruções (folhas, detritos, poeira) que possam comprometer o fluxo de ar.
4) Testar todas as funções do controle remoto e verificar a resposta do equipamento.
5) Observações Gerais

Plano de tarefas 0020 - LOOP
Ativo: NoBreak

TAREFA: INSPEÇÃO DAS BATERIAS E CONEXÕES ELÉTRICAS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 3 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Medir a tensão e corrente de cada bateria Verificar o estado das conexões e identificar sinais de corrosão.
2) Verificar o estado das conexões e identificar sinais de corrosão.

TAREFA: INSPEÇÃO MENSAL EM NOBREAK
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Instrumentação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verificar se há sinais de danos físicos no gabinete do nobreak, como amassados, rachaduras ou corrosão.
2) Garantir que os cabos de alimentação e conexões estejam intactos e bem posicionados.
3) Inspecionar visualmente os terminais de entrada e saída quanto a oxidações, afrouxamento ou sinais de superaquecimento.
4) Realizar reaperto de terminais (se necessário e permitido sem risco de danos).
5) Garantir que todos os componentes de refrigeração estejam funcionando corretamente.
6) Verificar a condição da(s) bateria(s), observando sinais de vazamento, corrosão nos terminais e temperatura anormal.
7) Observações gerais

TAREFA: INSPEÇÃO SEMESTRAL EM NOBREAK
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 01 H 30mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Desligar a fonte principal para garantir que o nobreak comute para a bateria de forma suave e sem falhas.
2) Inspecionar e limpar ventiladores e verificar fluxo de ar para evitar sobreaquecimento, caso houver
3) Apertar todos os parafusos e conexões, especialmente nas áreas de alta corrente.
4) Desconectar a alimentação do nobreak, e checar em quanto tempo a bateria atinge 10% de carga; Registrar resultados encontrados;

Plano de tarefas 0021 - LOOP
Ativo: Relé de Proteção

TAREFA: ATUALIZAÇÃO DE FIRMWARE E VERIFICAÇÃO DE PARÂMETROS
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 01H 30mins
DURAÇÃO ESTIMADA: 01 H 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Conferir a versão do firmware e verificar atualizações de segurança.
2) Revisar os parâmetros de proteção configurados no relé, conforme recomendações do fabricante.
3) Confirmar se os parâmetros estão alinhados com a política de proteção do sistema.

TAREFA: INSPEÇÃO VISUAL E FUNCIONAL
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Inspecionar o estado do painel de proteção e conectores.
2) Verificar indicadores visuais de alarme no display do relé.
3) Certificar-se de que não há aquecimento excessivo ou mau funcionamento nos LEDs de status.
4) Observações gerais

TAREFA: LIMPEZA PREVENTIVA
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 45mins
FAZER A TAREFA QUANDO? Agendada a cada 3 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Limpar os terminais e conectores do relé com pincel antiestático.
2) Verificar e limpar o filtro de ar do painel (se aplicável).
3) Limpar a tela e as saídas de ventilação, se houver.

TAREFA: TESTE DE COMUNICAÇÃO E BACKUP DE CONFIGURAÇÕES
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 01 H 00mins
DURAÇÃO ESTIMADA: 01 H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS: Nenhuma.

TAREFA: TESTE DE FUNCIONALIDADE
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 01 H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verificar a atuação das funções de proteção (ex.: sobrecorrente e subtensão).
2) Confirmar o funcionamento da interface de comunicação com o sistema supervisório (SCADA).
3) Observações Gerais

Plano de tarefas 0022 - LOOP
Ativo: Sistema de Incêndio

TAREFA:  INSPEÇÃO DIÁRIA NO SISTEMA DE ALARME E DETECÇÃO DE INCÊNDIO
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Civil
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 dia. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Verificar se o sistema de alarme está ligado e funcionando corretamente
2) Confirmar se as luzes indicadoras do sistema de alarme estão operacionais
3) Testar as funcionalidades do painel (modo de teste, reset, ativação manual) e verificar se há alarmes de falha
4) Confirmar se o painel de detecção de incêndio está ligado e livre de alarmes de falha.
5) Checar a integridade das luzes indicadoras e do display do sistema de detecção de incêndio
6) Observações gerais

TAREFA: INSPEÇÃO MENSAL NOS SISTEMAS DE INCÊNDIO (ALARME E DETECÇÃO)
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Civil
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00min
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Garantir que as baterias do sistema de alarme estão em boas condições
2) Limpar os detectores de poeira ou sujeira que possam afetar o desempenho do sistema de alarme
3) Verificar se os acionadores manuais de alarme estão em bom estado
4) Inspecionar a integridade dos cabos e conexões do sistema de alarme de incêndio.
5) Verificar se todos os dispositivos e equipamentos do sistema de alarme estão devidamente etiquetados e identificados
6) Realizar teste funcional para assegurar que cada sensor de detecção de incêndio responda corretamente.
7) Testar o funcionamento de todos os acionadores manuais.
8) Inspecionar a fiação do sistema de detecção para detectar possíveis desgastes, corrosão ou cortes.
9) Confirmar a integridade das conexões elétricas no sistema de detecção.
10) Verificar se todos os sensores, alarmes e componentes do sistema estão devidamente identificados.
11) Observações gerais

Plano de tarefas 0023 - LOOP
Ativo: Frotas

TAREFA: A CADA 20.000 KM (OU 1 ANO)
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Veículo
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 04H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS: Nenhuma.

TAREFA: A CADA 5.000 A 10.000 KM (OU 6 MESES)
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Veículo
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 04H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Troca de óleo e filtro de óleo.
2) Verificação do filtro de ar, substituindo se necessário.
3) Revisão do sistema de freios (pastilhas, fluido e discos).
4) Inspeção dos pneus (pressão, desgaste e alinhamento)

TAREFA: Inspeção Quinzenal do veículo
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Veículo
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 15 dias. Pode ser criada manualmente pelo administrador, coordenador, supervisor ou operador.
SUBTAREFAS:
1) Tirar foto da frente, traseira e laterais do veículo
2) Verificar no Hodômetro do veiculo a quilometragem percorrida e anotar o valor.
3) Ao se aproximar da quilometragem estabelecida para manutenção no veiculo entrar em contato com a central de atendimento da locadora pelo 0800 e agendar revisão
4) Utilize a vareta para verificar o nível do óleo. Complete se necessário, respeitando as especificações do fabricante.
5) Teste os faróis baixos, altos, de neblina, lanternas, luzes de freio e indicadores de direção.
6) Observe ruídos ou vibrações excessivas durante o uso.
7) Teste a resposta e o curso do pedal para identificar folgas ou falhas na frenagem.
8) Verificar condições dos pneus traseira e dianteiro.
9) Observações gerais
"""

def parse_duration(duration_str):
    if not duration_str: return 0
    total = 0
    try:
        s = duration_str.upper().replace(" ", "").strip()
        dias = re.search(r'(\d+)DIAS?', s)
        if dias: total += int(dias.group(1)) * 24 * 60
        horas = re.search(r'(\d+)H', s)
        if horas: total += int(horas.group(1)) * 60
        mins = re.search(r'(\d+)MIN', s)
        if mins: total += int(mins.group(1))
    except: pass
    return total

def seed():
    db = SessionLocal()
    print("🧹 Limpando SOMENTE templates da Biblioteca Padrão...")
    # ATENÇÃO: Isso apaga apenas os MODELOS de tarefa (TaskTemplate).
    # NÃO APAGA OSs, Usinas, Usuários ou Planos já vinculados às usinas.
    db.query(models.TaskTemplate).delete()
    db.commit()

    print("🚀 Iniciando importação com Tempo de Inatividade e Correção de Erros de Digitação...")
    
    # 1. Normalização (Corrige erros comuns do OCR como "OE" em vez de "DE")
    normalized_text = RAW_DATA.replace('\r', '').replace('\u200b', '')
    lines = normalized_text.split('\n')
    
    current_plan_asset = "Geral"
    current_task = {}
    tasks_to_save = []
    
    subtasks_mode = False

    for line in lines:
        clean_line = line.strip()
        if not clean_line: continue
        
        # Correção automática de typos comuns no input
        u_line = clean_line.upper().replace("OE TAREFA", "DE TAREFA").replace("OE INATIVIDADE", "DE INATIVIDADE")

        # Detecta Plano/Ativo
        if clean_line.startswith("Ativo:"):
            current_plan_asset = clean_line.split(":", 1)[1].strip()
            continue

        # Detecta Nova Tarefa
        if clean_line.startswith("TAREFA:"):
            # Salva a anterior se existir
            if current_task:
                tasks_to_save.append(current_task)
            
            # Inicia nova tarefa
            current_task = {
                "asset_category": current_plan_asset,
                "title": clean_line.split(":", 1)[1].strip(),
                "subtasks": [],
                "task_type": "", 
                "criticality": "", 
                "c1": "", 
                "c2": "", 
                "dur": "", 
                "freq": "", 
                "downtime": "0" # Default 0
            }
            subtasks_mode = False
            continue
            
        if not current_task: continue

        # Modo Subtarefas
        if u_line.startswith("SUBTAREFAS"):
            subtasks_mode = True
            continue
            
        if subtasks_mode:
            # Regex Flexível para pegar itens: 1), 1., 35, etc
            if re.match(r'^\d+(\.\d+)?[\)\.]', clean_line) or re.match(r'^\d+\s', clean_line):
                # Remove o numero do inicio para salvar limpo
                content = re.sub(r'^\d+(\.\d+)?[\)\.]\s*', '', clean_line).strip()
                current_task["subtasks"].append(content)
        else:
            # Metadados
            if u_line.startswith("TIPO"): 
                current_task["task_type"] = clean_line.split(":", 1)[1].strip()
            elif u_line.startswith("CRITICIDADE"): 
                current_task["criticality"] = clean_line.split(":", 1)[1].strip()
            elif u_line.startswith("CLASSIFICAÇÃO 1"): 
                current_task["c1"] = clean_line.split(":", 1)[1].strip()
            elif u_line.startswith("CLASSIFICAÇÃO 2"): 
                current_task["c2"] = clean_line.split(":", 1)[1].strip()
            elif u_line.startswith("DURAÇÃO"): 
                current_task["dur"] = clean_line.split(":", 1)[1].strip()
            # ✅ Captura do Tempo de Inatividade (com correção de typo OE/DE já aplicada em u_line)
            elif "TEMPO DE INATIVIDADE" in u_line: 
                current_task["downtime"] = clean_line.split(":", 1)[1].strip()
            elif "FAZER A TAREFA QUANDO" in u_line: 
                parts = clean_line.split("?", 1)
                if len(parts) > 1: current_task["freq"] = parts[1].strip()

    # Adiciona a última tarefa processada
    if current_task:
        tasks_to_save.append(current_task)

    count = 0
    for t in tasks_to_save:
        try:
            # Cálculo de Frequência em Dias
            freq_days = 0
            f_lower = t["freq"].lower()
            if "1 dia" in f_lower or "diária" in f_lower: freq_days = 1
            elif "semanal" in f_lower or "1 semana" in f_lower: freq_days = 7
            elif "quinzenal" in f_lower or "15 dias" in f_lower: freq_days = 15
            elif "mensal" in f_lower or "1 mês" in f_lower: freq_days = 30
            elif "trimestral" in f_lower or "3 meses" in f_lower: freq_days = 90
            elif "semestral" in f_lower or "6 meses" in f_lower: freq_days = 180
            elif "anual" in f_lower or "1 ano" in f_lower: freq_days = 365
            elif "2 anos" in f_lower: freq_days = 730

            # DEBUG: Verifica se downtime está sendo pego
            downtime_mins = parse_duration(t.get("downtime", "0"))
            if downtime_mins > 0:
                print(f"   ⏱️ {t['title']} -> Inatividade: {downtime_mins} mins")

            new_task = models.TaskTemplate(
                id=str(uuid4()),
                plan_code="LOOP-STD",
                asset_category=t["asset_category"],
                title=t["title"],
                task_type=t["task_type"],
                criticality=t["criticality"],
                classification1=t["c1"],
                classification2=t["c2"],
                estimated_duration_minutes=parse_duration(t["dur"]),
                # ✅ SALVA O DOWNTIME
                planned_downtime_minutes=downtime_mins,
                frequency=t["freq"],
                frequency_days=freq_days,
                subtasks=t["subtasks"]
            )
            db.add(new_task)
            count += 1
        except Exception as e:
            print(f"❌ Erro ao salvar {t.get('title')}: {e}")

    db.commit()
    print(f"✅ Importação concluída! {count} tarefas cadastradas na Biblioteca Padrão.")

if __name__ == "__main__":
    # Garante que as tabelas existam (caso tenha adicionado colunas novas recentemente)
    models.Base.metadata.create_all(bind=engine)
    seed()