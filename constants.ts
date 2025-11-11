
import { OSStatus, Role } from './types';

export const ROLES = Object.values(Role);
export const OS_STATUSES = Object.values(OSStatus);

export const STATUS_COLORS: { [key in OSStatus]: string } = {
    [OSStatus.PENDING]: 'bg-yellow-500',
    [OSStatus.IN_PROGRESS]: 'bg-blue-500',
    [OSStatus.IN_REVIEW]: 'bg-purple-500',
    [OSStatus.COMPLETED]: 'bg-green-500',
};

export const STATUS_COLUMN_TITLES: { [key in OSStatus]: string } = {
    [OSStatus.PENDING]: 'OSs Pendentes',
    [OSStatus.IN_PROGRESS]: 'OSs em Processo',
    [OSStatus.IN_REVIEW]: 'OSs em Revisão',
    [OSStatus.COMPLETED]: 'OSs Concluídas',
};


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

export const OS_ACTIVITIES: string[] = [
    'Acompanhamento concessionária', 'Comissionamento', 'Inspeção', 'Inspeção anual',
    'Inspeção mensal', 'Inspeção semestral', 'Instalação de equipamento', 'Limpeza',
    'Manutenção corretiva', 'Manutenção preditiva', 'Manutenção preventiva', 'Religamento',
    'Religamento DJBT', 'Religamento DJMT', 'Religamento QGBT', 'Religamento à vazio',
    'Teste de curva IV', 'Testes', 'Testes de religamento remoto', 'Troca de equipamento'
];
