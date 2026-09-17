// Communication Protocol Types for Automotive Architecture
// Based on common automotive and industrial communication standards

export type CommunicationProtocol = 
  | 'can'
  | 'can-fd'
  | 'lin'
  | 'ethernet'
  | 'spi'
  | 'i2c'
  | 'internal-bus'
  | 'wifi'
  | 'bluetooth'
  | 'cellular'
  | 'v2x'
  | 'most'
  | 'flexray'
  | 'sent'
  | 'rs232'
  | 'v-eth'
  | 'lvds'
  | 'custom';

export interface ProtocolConfig {
  id: CommunicationProtocol;
  label: string;
  shortLabel: string;
  category: 'wired' | 'wireless' | 'internal';
  color: string;
  strokeWidth: number;
  strokeDasharray?: string;
  description: string;
}

export const PROTOCOL_CONFIGS: Record<CommunicationProtocol, ProtocolConfig> = {
  'can': {
    id: 'can',
    label: 'CAN (Controller Area Network)',
    shortLabel: 'CAN',
    category: 'wired',
    color: 'hsl(var(--chart-1))',
    strokeWidth: 2,
    description: 'Standard automotive bus for real-time control'
  },
  'can-fd': {
    id: 'can-fd',
    label: 'CAN FD (Flexible Data-Rate)',
    shortLabel: 'CAN-FD',
    category: 'wired',
    color: 'hsl(var(--chart-1))',
    strokeWidth: 3,
    description: 'High-speed CAN with larger payloads'
  },
  'lin': {
    id: 'lin',
    label: 'LIN (Local Interconnect Network)',
    shortLabel: 'LIN',
    category: 'wired',
    color: 'hsl(var(--muted-foreground))',
    strokeWidth: 1,
    strokeDasharray: '4 2',
    description: 'Low-cost serial network for sensors/actuators'
  },
  'ethernet': {
    id: 'ethernet',
    label: 'Automotive Ethernet',
    shortLabel: 'ETH',
    category: 'wired',
    color: 'hsl(220, 70%, 55%)',
    strokeWidth: 4,
    description: 'High-bandwidth vehicle networking'
  },
  'spi': {
    id: 'spi',
    label: 'SPI (Serial Peripheral Interface)',
    shortLabel: 'SPI',
    category: 'internal',
    color: 'hsl(180, 60%, 45%)',
    strokeWidth: 2,
    strokeDasharray: '2 2',
    description: 'Short-distance chip-to-chip communication'
  },
  'i2c': {
    id: 'i2c',
    label: 'I²C (Inter-Integrated Circuit)',
    shortLabel: 'I²C',
    category: 'internal',
    color: 'hsl(160, 50%, 45%)',
    strokeWidth: 2,
    strokeDasharray: '3 2',
    description: 'Multi-master serial bus for ICs'
  },
  'internal-bus': {
    id: 'internal-bus',
    label: 'Internal Bus',
    shortLabel: 'INT',
    category: 'internal',
    color: 'hsl(var(--muted-foreground))',
    strokeWidth: 2,
    strokeDasharray: '1 1',
    description: 'Internal ECU communication'
  },
  'wifi': {
    id: 'wifi',
    label: 'Wi-Fi',
    shortLabel: 'WiFi',
    category: 'wireless',
    color: 'hsl(45, 80%, 50%)',
    strokeWidth: 2,
    strokeDasharray: '6 3',
    description: 'Wireless LAN connectivity'
  },
  'bluetooth': {
    id: 'bluetooth',
    label: 'Bluetooth',
    shortLabel: 'BT',
    category: 'wireless',
    color: 'hsl(210, 80%, 55%)',
    strokeWidth: 2,
    strokeDasharray: '6 3',
    description: 'Short-range wireless connectivity'
  },
  'cellular': {
    id: 'cellular',
    label: 'Cellular (4G/5G)',
    shortLabel: 'CELL',
    category: 'wireless',
    color: 'hsl(0, 70%, 55%)',
    strokeWidth: 3,
    strokeDasharray: '8 4',
    description: 'Mobile network connectivity'
  },
  'v2x': {
    id: 'v2x',
    label: 'V2X (Vehicle-to-Everything)',
    shortLabel: 'V2X',
    category: 'wireless',
    color: 'hsl(280, 70%, 55%)',
    strokeWidth: 3,
    strokeDasharray: '8 4',
    description: 'Vehicle-to-infrastructure/vehicle communication'
  },
  'most': {
    id: 'most',
    label: 'MOST (Media Oriented Systems Transport)',
    shortLabel: 'MOST',
    category: 'wired',
    color: 'hsl(320, 60%, 50%)',
    strokeWidth: 3,
    description: 'High-bandwidth multimedia network'
  },
  'flexray': {
    id: 'flexray',
    label: 'FlexRay',
    shortLabel: 'FLEX',
    category: 'wired',
    color: 'hsl(280, 60%, 55%)',
    strokeWidth: 2,
    strokeDasharray: '8 4',
    description: 'High-speed, deterministic network for x-by-wire'
  },
  'sent': {
    id: 'sent',
    label: 'SENT (Single Edge Nibble Transmission)',
    shortLabel: 'SENT',
    category: 'wired',
    color: 'hsl(100, 50%, 45%)',
    strokeWidth: 2,
    strokeDasharray: '3 3',
    description: 'Point-to-point sensor interface'
  },
  'rs232': {
    id: 'rs232',
    label: 'RS-232',
    shortLabel: 'RS232',
    category: 'wired',
    color: 'hsl(30, 50%, 45%)',
    strokeWidth: 2,
    strokeDasharray: '5 2',
    description: 'Serial communication standard'
  },
  'v-eth': {
    id: 'v-eth',
    label: 'Virtual Ethernet',
    shortLabel: 'V-ETH',
    category: 'internal',
    color: 'hsl(200, 70%, 50%)',
    strokeWidth: 3,
    strokeDasharray: '4 4',
    description: 'Virtualized Ethernet connections'
  },
  'lvds': {
    id: 'lvds',
    label: 'LVDS (Low-Voltage Differential Signaling)',
    shortLabel: 'LVDS',
    category: 'wired',
    color: 'hsl(260, 60%, 55%)',
    strokeWidth: 3,
    description: 'High-speed video/data transmission'
  },
  'custom': {
    id: 'custom',
    label: 'Custom Protocol',
    shortLabel: 'CUSTOM',
    category: 'wired',
    color: 'hsl(var(--foreground))',
    strokeWidth: 2,
    strokeDasharray: '2 4',
    description: 'User-defined communication protocol'
  }
};

export const PROTOCOL_CATEGORIES = {
  wired: {
    label: 'Wired',
    protocols: ['can', 'can-fd', 'lin', 'ethernet', 'flexray', 'most', 'lvds', 'sent', 'rs232'] as CommunicationProtocol[]
  },
  wireless: {
    label: 'Wireless',
    protocols: ['wifi', 'bluetooth', 'cellular', 'v2x'] as CommunicationProtocol[]
  },
  internal: {
    label: 'Internal',
    protocols: ['spi', 'i2c', 'internal-bus', 'v-eth', 'custom'] as CommunicationProtocol[]
  }
};

export function getProtocolStyle(protocol: CommunicationProtocol) {
  const config = PROTOCOL_CONFIGS[protocol] || PROTOCOL_CONFIGS['custom'];
  return {
    stroke: config.color,
    strokeWidth: config.strokeWidth,
    strokeDasharray: config.strokeDasharray
  };
}

export function getProtocolLabel(protocol: CommunicationProtocol) {
  return PROTOCOL_CONFIGS[protocol]?.shortLabel || protocol.toUpperCase();
}
