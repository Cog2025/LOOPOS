// File: constants.ts
// Este arquivo define constantes globais que são usadas em várias partes da aplicação para manter a consistência.

// Importa os tipos `OSStatus` e `Role` para garantir a tipagem correta das constantes.
import { OSStatus, Role } from './types';

// Exporta um array com todos os valores do enum `Role`. Útil para popular dropdowns de seleção de função.
export const ROLES = Object.values(Role);

// Exporta um array com todos os valores do enum `OSStatus`. Usado para criar as colunas no painel Kanban.
export const OS_STATUSES = Object.values(OSStatus);

// Mapeia cada status de OS para uma classe de cor de fundo do Tailwind CSS. Usado para colorir os cabeçalhos das colunas.
export const STATUS_COLORS: { [key in OSStatus]: string } = {
    [OSStatus.PENDING]: 'bg-yellow-500',
    [OSStatus.IN_PROGRESS]: 'bg-blue-500',
    [OSStatus.IN_REVIEW]: 'bg-purple-500',
    [OSStatus.COMPLETED]: 'bg-green-500',
};

// Mapeia cada status de OS para o título que será exibido no cabeçalho da coluna correspondente.
export const STATUS_COLUMN_TITLES: { [key in OSStatus]: string } = {
    [OSStatus.PENDING]: 'OSs Pendentes',
    [OSStatus.IN_PROGRESS]: 'OSs em Processo',
    [OSStatus.IN_REVIEW]: 'OSs em Revisão',
    [OSStatus.COMPLETED]: 'OSs Concluídas',
};

// Lista de todos os ativos padrão que podem ser pré-selecionados ao criar uma nova usina.
export const DEFAULT_PLANT_ASSETS: string[] = [
    'Albedômetro', 'Anemômetro', 'Barramento', 'Bucha plug-in "botinha"', 'Cabo CA', 'Cabo CC',
    'Cabo comunicação', 'CFTV', 'Chave seccionadora skid', 'Combiner box', 'Comunicação',
    'Controlador de carga estação solarimétrica', 'Conversor', 'Data logger', 'Disjuntor BT',
    'Disjuntor geral MT', 'Disjuntor MT', 'Elo fusível', 'Estação solarimétrica', 'Exaustor',
    'Fonte capacitiva', 'Fonte chaveada 12/24v', 'Fonte CC', 'Inversor', 'Logger', 'MC4', 'Módulo',
    'Módulo fotovoltaico', 'Mufla', 'NCU', 'No-break', 'Para-raio', 'Piranômetro', 'QGBT', 'Relé',
    'Relé de proteção', 'Relé de temperatura', 'Religador automático', 'RSU', 'Sensor de temperatura',
    'Sala O&M', 'Câmera', 'DVR', 'Computador', 'Sensor de temperatura ambiente', 'Sensor de temperatura modulo',
    'Sensor termo-higrômetro', 'SKC', 'Smartlogger', 'String', 'Stringbox', 'Switch', 'TC concessionária',
    'TC proteção', 'TCU', 'Torneira', 'TP concessionária', 'TP de serviços auxiliares', 'TP proteção',
    'Tracker', 'Transformador', 'TSA', 'UFV', 'Usina', 'Ventilação forçada'
];

// Lista de todas as atividades principais que podem ser selecionadas ao criar uma nova Ordem de Serviço.
export const OS_ACTIVITIES: string[] = [
    'Acompanhamento concessionária', 'Comissionamento', 'Inspeção', 'Inspeção anual',
    'Inspeção mensal', 'Inspeção semestral', 'Instalação de equipamento', 'Limpeza',
    'Manutenção corretiva', 'Manutenção preditiva', 'Manutenção preventiva', 'Religamento',
    'Religamento DJBT', 'Religamento DJMT', 'Religamento QGBT', 'Religamento à vazio',
    'Teste de curva IV', 'Testes', 'Testes de religamento remoto', 'Troca de equipamento'
];