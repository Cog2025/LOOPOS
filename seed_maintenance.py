# seed_maintenance.py
import re
import sys
from pathlib import Path
from uuid import uuid4

sys.path.append(str(Path(__file__).parent / "attachments"))
from app.core.database import SessionLocal, engine
from app.core import models

# ==============================================================================
# DADOS COMPLETOS
# ==============================================================================
RAW_DATA = r"""
Plano de tarefas 0001 - LOOP
Ativo: Rotina de O&M

TAREFA: ACOMPANHAMENTO DE ACESSO AS USINAS
TIPO DE TAREFA: Acompanhamento de Serviço
CRITICIDADE: Médio
CLASSIFICAÇÃO 1:
CLASSIFICAÇÃO 2:
TEMPO DE INATIVIDADE PLANEJADO DO ATIVO: 00mins
DURAÇÃO ESTIMADA: 02H:00mins
FAZER A TAREFA QUANDO? Criada manualmente.
SUBTAREFAS:
1) Verificar, no momento do acesso, o cumprimento aos requisitos de acesso
2) Solicitar a todos os visitantes o preenchimento do Livro de Registro de Acesso
3) Acompanhar os visitantes durante todo o tempo que permanecerem dentro da usina
4) Registrar as atividades desempenhadas pelos acessantes e relatar ao COG Loop
5) Observações gerais

TAREFA: IMPLANTAÇÃO DE PLANO DE EMERGENCIA
TIPO DE TAREFA: Projeto
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Melhoria & Adequação de Projetos
CLASSIFICAÇÃO 2:
DURAÇÃO ESTIMADA: 10mins
FAZER A TAREFA QUANDO? Manual.
SUBTAREFAS:
1) Imprimir, tirar foto do documento exposto no O&M e anexar em OS

TAREFA: INSPEÇÃO DE CURTO CIRCUITO
TIPO DE TAREFA: Inspeção
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Manual.
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
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada para a cada 1 mês.
SUBTAREFAS:
1) Alicate Amperímetro CAT IV Minipa ET-4710: Verificar funcionamento e sinais de desgaste
2) Alicate Crimpador RJ45: Inspecionar o estado geral e a funcionalidade.
3) Alicate de Bico: Conferir alinhamento das pontas e presença de ferrugem.
4) Alicate de Corte 6": Examinar fio de corte.
5) Alicate de Pressão: Verificar funcionamento da trava.
6) Alicate Prensa Terminal MC4: Inspecionar funcionamento.
7) Alicate Universal 8": Conferir estado das lâminas.
8) Arco de Serra: Verificar se a lâmina está em boas condições.
9) Caixa de Ferramenta Sanfonada: Inspecionar o estado das gavetas.
10) Câmera Termográfica Flir: funcionamento e limpeza.
11) Conjunto de Chave Fenda e Philips Isoladas: Conferir isolamento.
12) Chave Inglesa 10": Verificar funcionamento.
13) Chave MC4: Inspecionar garras.
14) Conjunto de Aterramento Temporário: Inspecionar cabos.
15) Conjunto de Bits p/ Parafusadeira: Conferir estado.
16) Conjunto de Chave Sextavada Catraca: Conferir mecanismo.
17) Conjunto de Chave Torx 9PCS: Inspecionar chaves.
18) Detector de Tensão até 50kV: Verificar sinal sonoro.
19) Estilete 18mm: Verificar lâmina.
20) Fasímetro Minipa: Testar funcionamento.
21) Broca Engate Rápido para Ferro e Inox: Verificar desgaste.
22) Kit de Bloqueio LOTO: Conferir cadeado.
23) Marreta 1,5kg: Inspecionar cabeça.
24) Marreta de Borracha: Verificar integridade.
25) Martelo Unha 18mm: Conferir cabo.
26) Megômetro Digital Minipa: Teste de funcionalidade.
27) Paquímetro 150mm: Testar precisão.
28) Passa Fio 30m: Conferir danos no fio.
29) Serra Fixa 12": Verificar lâmina.
30) Termo Higrômetro: Testar precisão.
31) Testador de Cabo de Rede: Verificar funcionamento.
32) Torquímetro Estalo 1/2": Testar precisão.
33) Detector de Tensão por Aproximação: Verificar funcionalidade.
34) Alicate Corta Cabo: Verificar lâminas.
35) Alicate para Terminal Pré-Isolado: Testar funcionalidade.
36) Trena 8m: Verificar mecanismo.
37) Spray Galvanização a Seco: Verificar bico.
38) Jogo de Soquetes 1/2 Pol: Inspecionar soquetes.
39) Tapete de Borracha Média Tensão: Inspecionar furos.
40) Informar no campo abaixo caso seja encontrado alguma ferramenta danificada

TAREFA: LIMPEZA DOS FILTROS DE ADMISSÃO DE AR DOS COOLERS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Condicional
CLASSIFICAÇÃO 2: Mecânica
DURAÇÃO ESTIMADA: 01H00mins
FAZER A TAREFA QUANDO? Manual.
SUBTAREFAS:
1) Realizar a limpeza dos filtros de admissão de ar
2) Observações gerais

TAREFA: RELIGAMENTO EMERGENCIAL
TIPO DE TAREFA: Inspeção
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Manual.
SUBTAREFAS:
1) Registre com uma foto as proteções atuadas no relé
2) Realizar a coleta da oscilografia
3) Verifique se há condições para religamento
4) Solicitar ao COG autorização para religamento
5) Realize o fechamento do disjuntor de média tensão
6) Observações gerais

TAREFA: ROTINA DIÁRIA DE O&M
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 40mins
FAZER A TAREFA QUANDO? Agendada a cada 1 dia.
SUBTAREFAS:
1) A Análise Preliminar de Risco (APR) foi preenchida?
2) Verificar se todos os trackers estão na posição correta
3) Inspeção visual do para-raios e chave religadora
4) Checar LEDs de sinalização, chaves e relé
5) Checar Status dos Disjuntores de Baixa Tensão
6) Verificar relé de temperatura do transformador
7) Quantos desligamentos ocorreram no dia?
8) Quantos Trackers estão fora de operação?
9) Quantos Inversores estão fora de operação?
10) Quantas Strings estão fora de operação?
11) Quantos módulos estão danificados?
12) Observações gerais

TAREFA: ROTINA MENSAL DOS EXTINTORES
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Levantamento de informações
DURAÇÃO ESTIMADA: 01H00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês.
SUBTAREFAS:
1) Escrever na legenda a localização do extintor
2) Quantos extintores tem na UFV?
3) Anexar uma foto de cada extintor a 1 metro de distância
4) Anexar foto mostrando tipo (pó/CO2) e classe
5) Anexar foto da validade
6) Anexar foto da capacidade
7) Anexar foto do selo INMETRO
8) Observações gerais

TAREFA: ROTINA SEMANAL DE O&M
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Serviços Gerais
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 semana.
SUBTAREFAS:
1) Inspeção geral dos equipamentos e alambrado
2) Verificar condições da britagem e limpeza da Subestação
3) Registrar com foto a altura da vegetação
4) Registrar o nível de sujidade dos módulos
5) Observações gerais

TAREFA: VERIFICAÇÃO SEMANAL DA ALTURA DA VEGETAÇÃO
TIPO DE TAREFA: Inspeção
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 1 semana.
SUBTAREFAS:
1) Registrar com fotos a altura da vegetação
2) Realizar a medição da altura
3) Observações gerais

TAREFA: VERIFICAÇÃO SEMANAL DA SUJIDADE DOS MÓDULOS
TIPO DE TAREFA: Inspeção
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Levantamento de informações
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 1 semana.
SUBTAREFAS:
1) Tirar foto do nível de sujidade
2) Caso encontrados pontos de sujeira pontuais, realizar limpeza
3) Observações gerais

TAREFA: VERIFICAR CONSUMO E INJEÇÃO DE ENERGIA
TIPO DE TAREFA: Coleta de dados
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Instrumentação
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês.
SUBTAREFAS:
1) Verificar consumo de energia (código 003)
2) Verificar injeção de energia (código 103)

TAREFA: VISTORIA GERAL DA UFV
TIPO DE TAREFA: Inspeção
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Levantamento de informações
DURAÇÃO ESTIMADA: 02H00mins
FAZER A TAREFA QUANDO? Manual.
SUBTAREFAS:
1) Registro fotográfico da área da usina
2) Verificação das condições de limpeza geral
3) Checagem da integridade dos Inversores
4) Verificar condições dos trackers
5) Inspeção do QGBT
6) Checar Transformador
7) Verificação do SCADA
8) Registrar condição do CFTV
9) Verificar cercamento e drenagem
10) Conferir almoxarifado
11) Observações gerais

Plano de tarefas 0002 - LOOP
Ativo: Estação Solarimétrica

TAREFA: ATIVIDADE SEMANAL EM ESTAÇÃO SOLARIMÉTRICA
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 1 semana.
SUBTAREFAS:
1) Realizar inspeção visual completa da estação
2) Realizar limpeza dos sensores
3) Verificar nivelamento dos Piranômetros

TAREFA: ATIVIDADES SEMESTRAIS EM ESTAÇÃO SOLARIMÉTRICA
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Instrumentação
DURAÇÃO ESTIMADA: 01H00mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses.
SUBTAREFAS:
1) Inspecione a qualidade dos cabos
2) Inspecione os conectores elétricos
3) Inspecione a estrutura de montagem
4) Realize a limpeza de todos os instrumentos
5) Verifique o nivelamento do piranômetro
6) Inspecione as conexões de cada instrumento
7) Inspecione a cúpula do piranômetro
8) Realizar o backup de dados
9) Inspecionar aterramento
10) Observações gerais

TAREFA: REALIZAR A RECALIBRAÇÃO DO PIRANÔMETRO
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 2 anos.
SUBTAREFAS:
1) Realizar o desmonte e envio para calibração
2) Observações gerais

Plano de tarefas 0003 - LOOP
Ativo: Atividades de Limpeza e Roçagem

TAREFA: ACOMPANHAMENTO DAS ATIVIDADES DE LIMPEZA DOS MÓDULOS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
DURAÇÃO ESTIMADA: 05Dias 00H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses.
SUBTAREFAS:
1) Realizar o acompanhamento diário
2) O serviço foi satisfatório?
3) Observações gerais

TAREFA: ACOMPANHAMENTO DAS ATIVIDADES DE ROÇAGEM
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
DURAÇÃO ESTIMADA: 05Dias 00H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses.
SUBTAREFAS:
1) Realizar o acompanhamento diário
2) O serviço foi satisfatório?
3) Observações gerais

TAREFA: INSPEÇÃO DE SERVIÇOS DE LIMPEZA REALIZADOS PELA EQUIPE TERCEIRA
TIPO DE TAREFA: Inspeção
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Condicional
CLASSIFICAÇÃO 2: Serviços Gerais
DURAÇÃO ESTIMADA: 02H 00mins
FAZER A TAREFA QUANDO? Manual.
SUBTAREFAS:
1) Inspecionar TODOS os Trackers
2) Caso houveram quebras de módulos, cite quantos
3) Observações gerais

TAREFA: INSPEÇÃO DE SERVIÇOS DE ROÇAGEM REALIZADOS PELA EQUIPE TERCEIRA
TIPO DE TAREFA: Inspeção
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Serviços Gerais
DURAÇÃO ESTIMADA: 02H 00mins
FAZER A TAREFA QUANDO? Manual.
SUBTAREFAS:
1) Inspecionar TODOS os Trackers
2) Caso houveram quebras de módulos, cite quantos
3) Observações gerais

Plano de tarefas 0004 - LOOP
Ativo: Transformador a seco

TAREFA: INSPEÇÃO GERAL NO TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Verifique se existem pontos de oxidação.
2) Verifique conexões a terra, terminais e cabos.
3) Verifique aperto de parafusos e porcas.
4) Verifique o aterramento.
5) Verifique o circuito de alimentação externo.
6) Observações gerais

TAREFA: INSPEÇÕES PREDITIVAS COM EQUIPAMENTOS EM TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 01H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Realizar teste de resistência de isolamento
2) Realizar teste de continuidade
3) Realizar testes com TTR
4) Realizar inspeção e torqueamento dos terminais
5) Conferir as conexões do relé de temperatura
6) Realizar simulação das proteções
7) Observações gerais

TAREFA: LIMPEZA DO TRANSFORMADOR E DA SALA
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
DURAÇÃO ESTIMADA: 01H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Realizar limpeza do transformador
2) Realizar verificação e limpeza do sistema de ventilação
3) Observações gerais

TAREFA: TERMOGRAFIA DO TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses.
SUBTAREFAS:
1) Realizar termografia do núcleo
2) Realizar termografia terminais ALTA TENSÃO
3) Realizar termografia terminais BAIXA TENSÃO
4) Alguma anomalia encontrada?
5) Observações gerais

Plano de tarefas 0005 - LOOP
Ativo: Transformador a óleo

TAREFA: ANÁLISE CROMATOGRÁFICA DO ÓLEO ISOLANTE
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 20mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Realizar a retirada e armazenagem do óleo

TAREFA: ANÁLISE FÍSICO-QUÍMICA DO ÓLEO ISOLANTE
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 20mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Realizar a retirada e armazenagem do óleo
2) Observações gerais

TAREFA: INSPEÇÃO GERAL NO TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 40mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Verifique vazamentos de óleo
2) Verifique pontos de oxidação
3) Verifique conexões a terra e terminais
4) Verifique aperto de parafusos
5) Válvula de alivio de pressão: Verificar estado e vazamento
6) Indicador de nível do óleo: Verificar estado
7) Termômetro do óleo: Verificar estado
8) Verifique o aterramento
9) Verifique o circuito de alimentação externo
10) Observações gerais

TAREFA: INSPEÇÕES PREDITIVAS COM EQUIPAMENTOS EM TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 01H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Realizar teste de resistência de isolamento
2) Realizar teste de continuidade
3) Realizar testes com TTR
4) Observações gerais

TAREFA: INSPEÇÕES TRIMESTRAIS EM TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 3 meses.
SUBTAREFAS:
1) Verifique a temperatura
2) Verifique o nível do óleo
3) Verifique vazamento no perímetro
4) Verifique pontos de oxidação
5) Verifique vazamento no painel e flanges
6) Verifique trincas na bucha
7) Verifique comutador de tensão
8) Observações gerais

TAREFA: LIMPEZA DO TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Realizar limpeza do transformador
2) Observações gerais

TAREFA: TERMOGRAFIA DO TRANSFORMADOR
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Muito alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses.
SUBTAREFAS:
1) Termografia do núcleo
2) Termografia terminais ALTA TENSÃO
3) Termografia terminais BAIXA TENSÃO
4) Alguma anomalia?
5) Observações gerais

Plano de tarefas 0006 - LOOP
Ativo: Inversores

TAREFA: AFERIÇÕES EM STRINGS DE VOC, V+ E V-
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 50mins
FAZER A TAREFA QUANDO? Manual.
SUBTAREFAS:
1) Utilize os EPIs adequados
2) Informe COG sobre desligamento
3) Desconecte o disjuntor CA
4) Realize medição das Strings CC
5) Realize medições de tensão CA
6) Desligue interruptores CC
7) Medir corrente CC na Combiner Box (se aplicável)
8) Realize medições de tensão (Voc, V+, V-)
9) Tire foto dos resultados
10) Observações gerais

TAREFA: ATIVIDADES MENSAIS EM INVERSORES
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 20mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês.
SUBTAREFAS:
1) Verificar danos visíveis no invólucro
2) Verificar aberturas de ventilação
3) Inspecionar conexões de entrada e saída
4) Realizar reaperto das conexões
5) Verificar alarmes no display
6) Verificar erosões na base
7) Observações gerais

TAREFA: ATIVIDADES SEMESTRAIS EM INVERSORES
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 20mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses.
SUBTAREFAS:
1) Realize o desligamento do equipamento
2) Realize a limpeza da carcaça
3) Verifique poeira nas entradas de ar
4) Verificar ruído anormal
5) Limpeza dos ventiladores
6) Verifique danos ou deformação
7) Verifique cabos soltos
8) Verifique danos nos cabos
9) Verifique plugues de vedação CC
10) Verifique portas COM e USB
11) Verifique aterramento
12) Verificar segurança do abrigo
13) Verificar correspondência do disjuntor QGBT
14) Observações gerais

TAREFA: CAPTURA DE DADOS CURVA IV
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 01H00mins
FAZER A TAREFA QUANDO? Manual.
SUBTAREFAS:
1) Pedir permissão para desligamento
2) Desligar chave CC
3) Verificar se equipamento está desligado
4) Reportar hora de desligamento
5) Realizar testes em todas as STRINGS
6) Descrever dificuldades
7) Hora de término
8) Alguma String anômala?
9) Observações Gerais

TAREFA: CONTROLE DE ESTANQUEIDADE
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 3 meses.
SUBTAREFAS:
1) Verificar conexões e invólucros
2) Garantir ausência de danos
3) Verificar espuma expansiva
4) Aplicar espuma se necessário

TAREFA: TERMOGRAFIA DE INVERSORES
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses.
SUBTAREFAS:
1) Medição com termohigrometro?
2) Medição da corrente CA?
3) Medição da corrente CC?
4) Valor corrente CA
5) Valor corrente CC
6) Temperatura da carcaça
7) Temperatura cabos CA
8) Temperatura cabos CC
9) Ponto quente encontrado?
10) Observações gerais

TAREFA: TESTE DE RESISTÊNCIA DE ISOLAMENTO EM STRINGS
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Performance
DURAÇÃO ESTIMADA: 50mins
FAZER A TAREFA QUANDO? Manual.
SUBTAREFAS:
1) Inspeção das strings
2) Verificação de conexões e cabos
3) Teste de resistência com megôhmetro

TAREFA: VERIFICAÇÃO DE BACKTRACKING
TIPO DE TAREFA: Inspeção
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Melhoria & Adequação de Projetos
CLASSIFICAÇÃO 2: Performance
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Manual.
SUBTAREFAS:
1) Registro fotográfico das mesas as 7h00
2) Mostrar se há sombreamento

TAREFA: VERIFICAÇÃO DE DESEMPENHO DO INVERSOR
TIPO DE TAREFA: Inspeção
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Condicional
CLASSIFICAÇÃO 2: Performance
DURAÇÃO ESTIMADA: 01H30mins
FAZER A TAREFA QUANDO? Manual.
SUBTAREFAS:
1) Tirar foto do inversor correspondente a OS
2) Verificar vegetação
3) Verificar conectores MC4 do inversor
4) Verificar alinhamento dos trackers
5) Verificar sujidade dos módulos
6) Verificar altura da vegetação nos módulos
7) Verificar conexões MC4 dos módulos
8) Verificar sombreamento
9) Observações gerais

TAREFA: VERIFICAÇÃO DE PARÂMETROS DO INVERSOR
TIPO DE TAREFA: Inspeção
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
DURAÇÃO ESTIMADA: 10mins
FAZER A TAREFA QUANDO? Manual.
SUBTAREFAS:
1) Verificar status gerais
2) Verificar avisos e alarmes
3) Verificar dados de geração e falhas
4) Verificar tensão, corrente, frequência
5) Verificar informações das Strings
6) Relatar discrepâncias
7) Observações gerais

Plano de tarefas 0009 - LOOP
Ativo: Trackers

TAREFA: INSPEÇÃO GERAL NOS TRACKERS E MÓDULOS
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Mecânica
DURAÇÃO ESTIMADA: 10mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês.
SUBTAREFAS:
1) Verificar condições dos módulos
2) Inspeção visual no tracker
3) Verificar conexões cabos CC
4) Supressão de vegetação se necessário
5) Verificar casquilho, porcas e parafusos
6) Observações gerais

TAREFA: LUBRIFICAÇÃO ANUAL TRACKERS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Mecânica
DURAÇÃO ESTIMADA: 01H00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Lubrificação do rolamento principal
2) Lubrificação das engrenagens
3) Observações gerais

TAREFA: MANUTENÇÃO PREVENTIVA ANUAL TRACKERS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Mecânica
DURAÇÃO ESTIMADA: 01H00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Verificar fixação do módulo
2) Verificar curto-circuito
3) Inspeção cabos e terminais
4) Verificação terminais de terra
5) Verificação etiquetas de identificação
6) Verificação ruptura ou água
7) Verificação caixas elétricas
8) Verificação etiquetas e chapas
9) Inspeção juntas parafusadas
10) Inspeção galvanizada
11) Inspeção soldagem
12) Inspeção fundação
13) Inspeção fuga de corrente motor
14) Controle sistema de controle
15) Verificação cabo do motor
16) Verificação cabo alimentação TCU
17) Observações gerais
18) Controle aperto parafusos transmissão

TAREFA: SUBSTITUIÇÃO DE TCU
TIPO DE TAREFA: Manutenção Corretiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Corretiva Emergencial
CLASSIFICAÇÃO 2: Mecânica
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Manual.
SUBTAREFAS:
1) Registrar serial da TCU retirada
2) Registrar MAC da TCU retirada
3) Registrar serial da TCU nova
4) Registrar MAC da TCU nova

TAREFA: TERMOGRAFIA DOS MÓDULOS
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Manual.
SUBTAREFAS:
1) Realizar termografia dos módulos
2) Abrir SS se encontrar anomalias
3) Observações gerais

TAREFA: TORQUEAMENTO E CONECTORES ANUAL TRACKERS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Mecânica
DURAÇÃO ESTIMADA: 02H00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Verificação aperto parafusos estrutura
2) Controle fuga sistema transmissão
3) Ajuste conectores cabo módulo
4) Observações gerais

TAREFA: VERIFICAÇÃO E REAPERTO NOS PARAFUSOS DA ESTRUTURA
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Condicional
CLASSIFICAÇÃO 2: Mecânica
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Reapertar parafusos com torquímetro
2) Verificar integridade do casquilho
3) Observações gerais

Plano de tarefas 0010 - LOOP
Ativo: RSU/NCU

TAREFA: ATIVIDADES ANUAIS EM RSU
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Verifique conexões mecânicas e aperte se necessário
2) Verifique corrosão ou deterioração na caixa
3) Simular comportamento anormal e alarmes
4) Observações gerais

Plano de tarefas 0011 - LOOP
Ativo: SCADA

TAREFA: INSPEÇÃO VISUAL E LIMPEZA DO SISTEMA SUPERVISÓRIO (SCADA)
TIPO DE TAREFA: Inspeção
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Automação
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês.
SUBTAREFAS:
1) Realizar inspeção de sujidade
2) Verificar conexões e operação
3) Realizar limpeza do Rack
4) Observações gerais

Plano de tarefas 0012 - LOOP
Ativo: Sala de Controle

TAREFA: CONDIÇÕES DE LIMPEZA DA SALA DE CONTROLE, BANHEIRO E AFINS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Civil
DURAÇÃO ESTIMADA: 01H30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 semana.
SUBTAREFAS:
1) Inspeção visual limpeza sala
2) Limpeza sala e fotos
3) Inspeção visual banheiro
4) Limpeza banheiro e fotos
5) Observações gerais

TAREFA: CONDIÇÕES DE PINTURA DA SALA DE CONTROLE E VALIDADE DOS EXTINTORES
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses.
SUBTAREFAS:
1) Inspeção estrutura sala
2) Abrir SS se necessário
3) Verificar validade extintores
4) Abrir SS se extintor vencido
5) Observações gerais

TAREFA: INSPEÇÃO DOS PONTOS DE ILUMINAÇÃO DA ÁREA EXTERNA E DOS LOCAIS TÉCNICOS
TIPO DE TAREFA: Inspeção
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Serviços Gerais
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês.
SUBTAREFAS:
1) Inspecionar iluminação
2) Abrir SS se falha
3) Observações gerais

TAREFA: LIMPEZA DO ALMOXARIFADO
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês.
SUBTAREFAS:
1) Limpeza almoxarifado e fotos
2) Reorganizar materiais
3) Separar resíduos

Plano de tarefas 0013 - LOOP
Ativo: Aterramento

TAREFA: INSPEÇÃO COM MICROOHMÍMETRO EM MALHA DE ATERRAMENTO DE TODA UFV
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preditiva Instrumentada
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 05Dias 00H 00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Realizar medições na malha
2) Relatório a parte (anexar)
3) Observações gerais

TAREFA: VERIFICAÇÃO DE TODAS AS CAIXAS DE INSPEÇÃO DE ATERRAMENTO DA UFV
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 08H00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Verificar caixas de inspeção (ninhos, corrosão)
2) Observações gerais

Plano de tarefas 0014 - LOOP
Ativo: Planta de Alarme e CFTV

TAREFA: REALIZAR LIMPEZA DOS DISPOSITIVOS DE CFTV
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
DURAÇÃO ESTIMADA: 03H00mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses.
SUBTAREFAS:
1) Limpeza Quadros Elétricos CFTV
2) Limpeza câmeras CFTV
3) Observações gerais

TAREFA: ROTINA DE INSPEÇÃO EM CÂMERAS, SENSORES, CABOS E CONEXÕES
TIPO DE TAREFA: Inspeção
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Inspeção de Equipamentos
CLASSIFICAÇÃO 2: Automação
DURAÇÃO ESTIMADA: 01H00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês.
SUBTAREFAS:
1) Verificar computador e NVR
2) Verificar câmeras
3) Verificar quadros elétricos
4) Câmera não funcionando?
5) Observações gerais

Plano de tarefas 0015 - LOOP
Ativo: Vias de acesso

TAREFA: INSPEÇÃO MENSAL DAS VIAS DE ACESSO
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Civil
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês.
SUBTAREFAS:
1) Verificar pavimento
2) Limpeza se necessário
3) Inspecionar sinalização
4) Verificar drenagem lateral
5) Observações Gerais

Plano de tarefas 0017 - LOOP
Ativo: Drenagem

TAREFA: INSPEÇÃO MENSAL DA DRENAGEM
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Civil
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês.
SUBTAREFAS:
1) SKID: Verificar erosão e acúmulo de água
2) TRACKERS: Verificar erosão e acúmulo de água
3) CERCAMENTO: Verificar erosão e acúmulo de água
4) CUBICULO BLINDADO: Verificar erosão e acúmulo de água
5) POSTES DE CFTV E ILUMINAÇÃO: Verificar erosão e acúmulo de água
6) VIAS DE ACESSO: Verificar erosão e acúmulo de água
7) Avaliar inclinação e escoamento
8) Inspecionar valetas e canais
9) Verificar desvio de água
10) Inspecionar bueiros e tubulações
11) Verificar integridade estrutural
12) Verificar erosões gerais (abrir SS se necessário)

TAREFA: LIMPEZA DA CANALETA DE DRENAGEM, BOLSÕES E CAIXAS DISSIPADORAS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Baixo
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Serviços Gerais
DURAÇÃO ESTIMADA: 01H00mins
FAZER A TAREFA QUANDO? Agendada a cada 15 dias.
SUBTAREFAS:
1) Identificar danos estruturais
2) Remover grandes detritos
3) Remover lodo e sedimentos
4) Verificar fluxo de água
5) Limpeza caixas dissipadoras
6) Observações gerais

Plano de tarefas 0018 - LOOP
Ativo: Cercamento

TAREFA: INSPEÇÃO DO CERCAMENTO
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preditiva Sensitiva
CLASSIFICAÇÃO 2: Civil
DURAÇÃO ESTIMADA: 20mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês.
SUBTAREFAS:
1) Inspecionar Cercamento, aterramento, erosão
2) Abrir SS se anomalia
3) Observações gerais

Plano de tarefas 0019 - LOOP
Ativo: Ar Condicionado

TAREFA: INSPEÇÕES SEMESTRAIS NO AR CONDICIONADO
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Mecânica
DURAÇÃO ESTIMADA: 01H30mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses.
SUBTAREFAS:
1) Limpar ou substituir filtros
2) Verificar pressão gás
3) Inspecionar conexões elétricas
4) Verificar e limpar aletas
5) Conferir drenagem
6) Testar modos de operação
7) Observações Gerais

TAREFA: INSPEÇÕES TRIMESTRAIS NO AR CONDICIONADO
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Mecânica
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 3 meses.
SUBTAREFAS:
1) Inspecionar e limpar filtros
2) Escutar ruídos incomuns
3) Verificar obstruções externas
4) Testar controle remoto
5) Observações Gerais

Plano de tarefas 0020 - LOOP
Ativo: NoBreak

TAREFA: INSPEÇÃO DAS BATERIAS E CONEXÕES ELÉTRICAS
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 3 meses.
SUBTAREFAS:
1) Medir tensão e corrente baterias
2) Verificar conexões e corrosão

TAREFA: INSPEÇÃO MENSAL EM NOBREAK
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Instrumentação
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês.
SUBTAREFAS:
1) Verificar danos físicos gabinete
2) Garantir cabos intactos
3) Inspecionar terminais
4) Reaperto se necessário
5) Garantir refrigeração
6) Verificar baterias
7) Observações gerais

TAREFA: INSPEÇÃO SEMESTRAL EM NOBREAK
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Elétrica
DURAÇÃO ESTIMADA: 01H30mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses.
SUBTAREFAS:
1) Desligar fonte principal (teste comutação)
2) Inspecionar e limpar ventiladores
3) Apertar parafusos e conexões
4) Teste de descarga bateria (10%)

Plano de tarefas 0021 - LOOP
Ativo: Relé de Proteção

TAREFA: ATUALIZAÇÃO DE FIRMWARE E VERIFICAÇÃO DE PARÂMETROS
TIPO DE TAREFA: Manutenção Preditiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
DURAÇÃO ESTIMADA: 01H30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Conferir firmware e atualizações
2) Revisar parâmetros de proteção
3) Confirmar alinhamento com política

TAREFA: INSPEÇÃO VISUAL E FUNCIONAL
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês.
SUBTAREFAS:
1) Inspecionar painel e conectores
2) Verificar alarmes no display
3) Certificar-se de LEDs ok
4) Observações gerais

TAREFA: LIMPEZA PREVENTIVA
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Serviços Gerais
DURAÇÃO ESTIMADA: 45mins
FAZER A TAREFA QUANDO? Agendada a cada 3 meses.
SUBTAREFAS:
1) Limpar terminais (pincel antiestático)
2) Verificar e limpar filtro de ar
3) Limpar tela e saídas

TAREFA: TESTE DE COMUNICAÇÃO E BACKUP DE CONFIGURAÇÕES
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
DURAÇÃO ESTIMADA: 01H00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Realizar backup de configurações e teste de comunicação

TAREFA: TESTE DE FUNCIONALIDADE
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Automação
DURAÇÃO ESTIMADA: 01H00mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses.
SUBTAREFAS:
1) Verificar atuação proteções
2) Confirmar comunicação SCADA
3) Observações Gerais

Plano de tarefas 0022 - LOOP
Ativo: Sistema de Incêndio

TAREFA: INSPEÇÃO DIÁRIA NO SISTEMA DE ALARME E DETECÇÃO DE INCÊNDIO
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Civil
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 dia.
SUBTAREFAS:
1) Verificar sistema ligado
2) Confirmar luzes operacionais
3) Testar funcionalidades painel
4) Confirmar detecção sem falhas
5) Checar display e luzes
6) Observações gerais

TAREFA: INSPEÇÃO MENSAL NOS SISTEMAS DE INCÊNDIO
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Civil
DURAÇÃO ESTIMADA: 30mins
FAZER A TAREFA QUANDO? Agendada a cada 1 mês.
SUBTAREFAS:
1) Garantir baterias ok
2) Limpar detectores
3) Verificar acionadores manuais
4) Inspecionar cabos e conexões
5) Verificar etiquetas
6) Teste funcional sensores
7) Teste acionadores
8) Inspecionar fiação
9) Confirmar conexões elétricas
10) Verificar identificação sensores
11) Observações gerais

Plano de tarefas 0023 - LOOP
Ativo: Frotas

TAREFA: A CADA 20.000 KM (OU 1 ANO)
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Veículo
DURAÇÃO ESTIMADA: 04H00mins
FAZER A TAREFA QUANDO? Agendada a cada 1 ano.
SUBTAREFAS:
1) Revisão geral conforme manual (20k km)

TAREFA: A CADA 5.000 A 10.000 KM (OU 6 MESES)
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Alto
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Veículo
DURAÇÃO ESTIMADA: 04H00mins
FAZER A TAREFA QUANDO? Agendada a cada 6 meses.
SUBTAREFAS:
1) Troca de óleo e filtro
2) Verificação filtro de ar
3) Revisão freios
4) Inspeção pneus

TAREFA: Inspeção Quinzenal do veículo
TIPO DE TAREFA: Manutenção Preventiva
CRITICIDADE: Médio
CLASSIFICAÇÃO 1: Preventiva Sistemática
CLASSIFICAÇÃO 2: Veículo
DURAÇÃO ESTIMADA: 15mins
FAZER A TAREFA QUANDO? Agendada a cada 15 dias.
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
    print("🧹 Limpando templates antigos...")
    db.query(models.TaskTemplate).delete()
    db.commit()

    print("🚀 Iniciando importação (MODO STATE MACHINE)...")
    
    # 1. Normalização: Remove \r e caracteres nulos
    # mas mantém a quebra de linha normal \n
    normalized_text = RAW_DATA.replace('\r', '').replace('\u200b', '')
    lines = normalized_text.split('\n')
    
    current_plan_asset = "Geral"
    current_task = {}
    tasks_to_save = []
    
    subtasks_mode = False

    for line in lines:
        clean_line = line.strip()
        if not clean_line: continue
        
        # Detecta Plano/Ativo
        if clean_line.startswith("Ativo:"):
            current_plan_asset = clean_line.split(":", 1)[1].strip()
            continue

        # Detecta Nova Tarefa
        if clean_line.startswith("TAREFA:"):
            # Salva a anterior
            if current_task:
                tasks_to_save.append(current_task)
            
            # Inicia nova
            current_task = {
                "asset_category": current_plan_asset,
                "title": clean_line.split(":", 1)[1].strip(),
                "subtasks": [],
                "task_type": "", "criticality": "", "c1": "", "c2": "", "dur": "", "freq": ""
            }
            subtasks_mode = False
            continue
            
        if not current_task: continue

        u_line = clean_line.upper()
        
        # Modo Subtarefas
        if u_line.startswith("SUBTAREFAS"):
            subtasks_mode = True
            continue
            
        if subtasks_mode:
            # Regex Flexível: "1)", "1.", "  1)", "10."
            # Removemos o strip do 'line' original aqui para preservar a logica se precisasse, 
            # mas clean_line ja esta sem espaco.
            if re.match(r'^\d+[\)\.]', clean_line):
                # Remove numero e parentese
                content = re.sub(r'^\d+[\)\.]\s*', '', clean_line)
                current_task["subtasks"].append(content)
        else:
            # Metadados
            if u_line.startswith("TIPO"): current_task["task_type"] = clean_line.split(":", 1)[1].strip()
            elif u_line.startswith("CRITICIDADE"): current_task["criticality"] = clean_line.split(":", 1)[1].strip()
            elif u_line.startswith("CLASSIFICAÇÃO 1"): current_task["c1"] = clean_line.split(":", 1)[1].strip()
            elif u_line.startswith("CLASSIFICAÇÃO 2"): current_task["c2"] = clean_line.split(":", 1)[1].strip()
            elif u_line.startswith("DURAÇÃO"): current_task["dur"] = clean_line.split(":", 1)[1].strip()
            elif "FAZER A TAREFA QUANDO" in u_line: 
                parts = clean_line.split("?", 1)
                if len(parts) > 1: current_task["freq"] = parts[1].strip()

    if current_task:
        tasks_to_save.append(current_task)

    count = 0
    for t in tasks_to_save:
        try:
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

            if "CAIXA DE FERRAMENTAS" in t["title"]:
                print(f"🔍 DEBUG: Tarefa '{t['title']}' tem {len(t['subtasks'])} subtarefas.")

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
                frequency=t["freq"],
                frequency_days=freq_days,
                subtasks=t["subtasks"]
            )
            db.add(new_task)
            count += 1
        except Exception as e:
            print(f"❌ Erro ao salvar {t.get('title')}: {e}")

    db.commit()
    print(f"✅ Importação concluída! {count} tarefas cadastradas.")

if __name__ == "__main__":
    # ✅ GARANTE A CRIAÇÃO DE TODAS AS TABELAS (Users, OS, Plants, Maintenance...)
    models.Base.metadata.create_all(bind=engine)
    seed()