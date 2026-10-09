// TARA Asset Data — parsed from Asset_Structured_Mapping.xlsx
// Organized by ProjectScope: vehicle | domain | component | ecu

import type { ProjectScope } from '@/types/tara';

// === Type Definitions ===

export interface VehicleAsset {
    assetClass: string;
    item: string;
}

export interface DomainAsset {
    assetClass: string;
    processElement: string;
    asset: string;
    attackSurface: string;
}

export interface ComponentAsset {
    assetCategory: string;
    component: string;
    type: string;
    attackSurface: string;
}

export interface ECUAsset {
    assetClass: string;
    subCategory: string;
    item: string;
    rationale: string;
    function: string;
}

export type TaraAssetItem = VehicleAsset | DomainAsset | ComponentAsset | ECUAsset;

/** Returns the grouping key (category header) for a given asset */
export function getCategoryKey(asset: TaraAssetItem, scope: ProjectScope): string {
    switch (scope) {
        case 'vehicle':
            return (asset as VehicleAsset).assetClass;
        case 'domain':
            return (asset as DomainAsset).assetClass;
        case 'component':
            return (asset as ComponentAsset).assetCategory;
        case 'ecu':
            return (asset as ECUAsset).assetClass;
        default:
            return '';
    }
}

/** Returns the display name (draggable label) for a given asset */
export function getDisplayName(asset: TaraAssetItem, scope: ProjectScope): string {
    switch (scope) {
        case 'vehicle':
            return (asset as VehicleAsset).item;
        case 'domain':
            return (asset as DomainAsset).asset;
        case 'component':
            return (asset as ComponentAsset).component;
        case 'ecu':
            return (asset as ECUAsset).item;
        default:
            return '';
    }
}

// === Vehicle Level Asset Register ===

const vehicleAssets: VehicleAsset[] = [
    { assetClass: 'Process', item: 'Vehicle' },
    { assetClass: 'Data Store', item: 'Vehicle' },
    { assetClass: 'Data Store', item: 'Server' },
    { assetClass: 'Data Flow', item: 'Vehicle to infrastructure communication' },
    { assetClass: 'Data Flow', item: 'Vehicle to Vehicle communication' },
    { assetClass: 'Data Flow', item: 'Vehicle to server communication' },
    { assetClass: 'Data Flow', item: 'Vehicle to mobile communication' },
    { assetClass: 'Data Flow', item: 'Vehicle to key communication' },
    { assetClass: 'External Entity', item: 'Server' },
    { assetClass: 'External Entity', item: 'Remote key' },
    { assetClass: 'External Entity', item: 'Mobile' },
    { assetClass: 'External Entity', item: 'User' },
    { assetClass: 'External Entity', item: 'Vehicle' },
    { assetClass: 'External Entity', item: 'Infrastructure' },
];

// === Domain Level Asset & Attack Surface Mapping ===

const domainAssets: DomainAsset[] = [
    { assetClass: 'Process', processElement: 'ECU', asset: 'Software update', attackSurface: 'Long range wireless access' },
    { assetClass: 'Process', processElement: 'ECU', asset: 'Software update', attackSurface: 'EOBD-II' },
    { assetClass: 'Process', processElement: 'ECU', asset: 'Software update', attackSurface: 'CAN Open Interface' },
    { assetClass: 'Process', processElement: 'ECU', asset: 'Software update', attackSurface: 'Tester Tool' },
    { assetClass: 'Process', processElement: 'ECU', asset: 'Diagnostics', attackSurface: 'EOBD II' },
    { assetClass: 'Process', processElement: 'ECU', asset: 'Diagnostics', attackSurface: 'CAN Open Interface' },
    { assetClass: 'Process', processElement: 'ECU', asset: 'Diagnostics', attackSurface: 'Long range wireless access' },
    { assetClass: 'Process', processElement: 'ECU', asset: 'Diagnostics', attackSurface: 'Other' },
    { assetClass: 'Process', processElement: 'ECU', asset: 'EOL services', attackSurface: 'CAN Open Interface' },
    { assetClass: 'Process', processElement: 'ECU', asset: 'Key provisioning', attackSurface: 'CAN Open Interface' },
    { assetClass: 'Process', processElement: 'ECU', asset: 'Key provisioning', attackSurface: 'EOL Services' },
    { assetClass: 'Process', processElement: 'ECU', asset: 'Key provisioning', attackSurface: 'Long range wireless access' },
    { assetClass: 'Process', processElement: 'ECU', asset: 'Ports/Interface', attackSurface: 'Ports/Interfaces' },
    { assetClass: 'Process', processElement: 'Sensors', asset: 'Sensor', attackSurface: 'Sensor' },
    { assetClass: 'Process', processElement: 'Standard sensors', asset: 'Sensor', attackSurface: 'Sensor pin' },
    { assetClass: 'Process', processElement: 'Infotainment system', asset: 'Other', attackSurface: 'HMI' },
    { assetClass: 'Process', processElement: 'Infotainment system', asset: 'Other', attackSurface: 'User Devices' },
    { assetClass: 'Process', processElement: 'Infotainment system', asset: 'Other', attackSurface: 'Media player' },
    { assetClass: 'Process', processElement: 'Infotainment system', asset: 'Other', attackSurface: 'USB port' },
    { assetClass: 'Process', processElement: 'Infotainment system', asset: 'Other', attackSurface: 'Docking station' },
    { assetClass: 'Data Store', processElement: 'Software', asset: 'Software', attackSurface: 'EOBD II' },
    { assetClass: 'Data Store', processElement: 'Software', asset: 'Software', attackSurface: 'Ports/Interfaces' },
    { assetClass: 'Data Store', processElement: 'Software', asset: 'Software', attackSurface: 'CAN open interface' },
    { assetClass: 'Data Store', processElement: 'Software', asset: 'Software', attackSurface: 'Bugs in Software' },
    { assetClass: 'Data Store', processElement: 'Memory', asset: 'ECU data', attackSurface: 'EOBD-II' },
    { assetClass: 'Data Store', processElement: 'Memory', asset: 'ECU data', attackSurface: 'CAN Open Interface' },
    { assetClass: 'Data Store', processElement: 'Memory', asset: 'ECU data', attackSurface: 'Ports / Interfaces' },
    { assetClass: 'Data Store', processElement: 'Memory', asset: 'ECU data', attackSurface: 'Physical access' },
    { assetClass: 'Data Store', processElement: 'Security Artifacts', asset: 'Crypto key', attackSurface: 'Long range wireless access' },
    { assetClass: 'Data Store', processElement: 'Security Artifacts', asset: 'Crypto key', attackSurface: 'CAN Open Interface' },
    { assetClass: 'Data Store', processElement: 'Security Artifacts', asset: 'Crypto key', attackSurface: 'Physical Access' },
    { assetClass: 'Data Store', processElement: 'Security Artifacts', asset: 'Crypto algo', attackSurface: 'Long range wireless' },
    { assetClass: 'Data Store', processElement: 'Security Artifacts', asset: 'Crypto algo', attackSurface: 'Ports/interface' },
    { assetClass: 'Data Store', processElement: 'Security Artifacts', asset: 'Crypto algo', attackSurface: 'Insufficient use of cryptographic algorithms' },
];

// === Component Level Asset Register ===

const componentAssets: ComponentAsset[] = [
    { assetCategory: 'Update', component: 'OTA Master (connected to backend server)', type: 'Functionality', attackSurface: '' },
    { assetCategory: 'Update', component: 'OTA Slave', type: 'Functionality', attackSurface: '' },
    { assetCategory: 'Update', component: 'Update via CAN (CANonUDS)', type: 'Functionality', attackSurface: '' },
    { assetCategory: 'Update', component: 'Update via Eth (IPonUDS)', type: 'Functionality', attackSurface: '' },
    { assetCategory: 'Storage', component: 'Firmware (includes system functions)', type: 'Data', attackSurface: '' },
    { assetCategory: 'Storage', component: 'Calibration data', type: 'Data', attackSurface: '' },
    { assetCategory: 'Storage', component: 'Configuration data', type: 'Data', attackSurface: '' },
    { assetCategory: 'Storage', component: 'Security Artifacts', type: 'Data', attackSurface: '' },
    { assetCategory: 'Storage', component: 'OEM specific data', type: 'Data', attackSurface: '' },
    { assetCategory: 'Storage', component: 'Log & Trace', type: 'Data', attackSurface: '' },
    { assetCategory: 'Storage', component: 'SW update packages (stored in external flash)', type: 'Data', attackSurface: '' },
    { assetCategory: 'Storage', component: 'Bootloader', type: 'Data / Functionality', attackSurface: '' },
    { assetCategory: 'Storage', component: 'DTC', type: 'Data', attackSurface: '' },
    { assetCategory: 'Storage', component: 'Video recordings', type: 'Data', attackSurface: '' },
    { assetCategory: 'Storage', component: 'Switch configurations', type: 'Data', attackSurface: '' },
    { assetCategory: 'Storage', component: 'EOL SW', type: 'Data', attackSurface: '' },
    { assetCategory: 'Security Artifacts', component: 'Certificates', type: 'Data', attackSurface: '' },
    { assetCategory: 'Security Artifacts', component: 'Public keys', type: 'Data', attackSurface: '' },
    { assetCategory: 'Security Artifacts', component: 'Private / Secret keys', type: 'Data', attackSurface: '' },
    { assetCategory: 'Diagnostics', component: 'UDS services via CAN', type: 'Functionality', attackSurface: '' },
    { assetCategory: 'Diagnostics', component: 'UDS services via Ethernet', type: 'Functionality', attackSurface: '' },
    { assetCategory: 'ECU', component: 'Storage flash', type: 'Physical', attackSurface: '' },
    { assetCategory: 'ECU', component: 'MCU (Application + base software)', type: 'Physical', attackSurface: '' },
    { assetCategory: 'ECU', component: 'Analog/digital inputs', type: 'Physical', attackSurface: '' },
    { assetCategory: 'ECU', component: 'eSIM', type: 'Physical', attackSurface: '' },
    { assetCategory: 'ECU', component: 'Drivers', type: 'Physical', attackSurface: '' },
    { assetCategory: 'ECU', component: 'UWB / BLE beacon', type: 'Physical', attackSurface: '' },
    { assetCategory: 'ECU', component: 'ASIC', type: 'Physical', attackSurface: '' },
    { assetCategory: 'ECU', component: 'Power block', type: 'Physical', attackSurface: '' },
    { assetCategory: 'ECU', component: 'Signal conditioning (ADC/DAC)', type: 'Physical', attackSurface: '' },
    { assetCategory: 'ECU', component: 'Deserializer / Ser', type: 'Physical', attackSurface: '' },
    { assetCategory: 'OS', component: 'QNX', type: 'Platform', attackSurface: '' },
    { assetCategory: 'OS', component: 'Linux', type: 'Platform', attackSurface: '' },
    { assetCategory: 'Communication Data', component: 'Sensor Data', type: 'Data', attackSurface: '' },
    { assetCategory: 'Communication Data', component: 'Video streams', type: 'Data', attackSurface: '' },
    { assetCategory: 'Communication Data', component: 'Wireless communication (UWB / BLE / NFC / WiFi)', type: 'Data', attackSurface: '' },
    { assetCategory: 'Communication Data', component: 'PLC communication (Twisted pair / RS / OTN)', type: 'Data', attackSurface: '' },
    { assetCategory: 'Communication Data', component: 'Serial Bus Communication', type: 'Data', attackSurface: '' },
    { assetCategory: 'Communication Data', component: 'CAN communication', type: 'Data', attackSurface: '' },
    { assetCategory: 'Sensors', component: 'Radar', type: 'Physical', attackSurface: '' },
    { assetCategory: 'Sensors', component: 'LiDAR', type: 'Physical', attackSurface: '' },
    { assetCategory: 'Sensors', component: 'Sonar', type: 'Physical', attackSurface: '' },
    { assetCategory: 'Sensors', component: 'Front/Reverse Camera', type: 'Physical', attackSurface: '' },
    { assetCategory: 'Sensors', component: 'GPS', type: 'Physical', attackSurface: '' },
    { assetCategory: 'Sensors', component: 'Ultrasonic sensor', type: 'Physical', attackSurface: '' },
    { assetCategory: 'Sensors', component: 'Optical sensors', type: 'Physical', attackSurface: '' },
    { assetCategory: 'Sensors', component: 'Physical/Chemical quantity', type: 'Physical', attackSurface: '' },
    { assetCategory: 'Actuators', component: 'Solenoid actuator', type: 'Physical', attackSurface: '' },
    { assetCategory: 'Actuators', component: 'Motorized actuator (DC motor, AC motor, steering motor)', type: 'Physical', attackSurface: '' },
    { assetCategory: 'Actuators', component: 'Thermal actuator (Pump, Valve, compressor, Chiller)', type: 'Physical', attackSurface: '' },
    { assetCategory: 'Actuators', component: 'Piezoelectric actuator', type: 'Physical', attackSurface: '' },
    { assetCategory: 'Actuators', component: 'Engine brakes', type: 'Physical', attackSurface: '' },
    { assetCategory: 'Actuators', component: 'Gear box', type: 'Physical', attackSurface: '' },
    { assetCategory: 'Actuators', component: 'Relay switches', type: 'Physical', attackSurface: '' },
];

// === ECU / Component Level Asset Register ===

const ecuAssets: ECUAsset[] = [
    { assetClass: 'Process', subCategory: 'ECU', item: 'Storage flash', rationale: '', function: '' },
    { assetClass: 'Process', subCategory: 'ECU', item: 'MCU (Application + base software)', rationale: '', function: '' },
    { assetClass: 'Process', subCategory: 'ECU', item: 'Analog/digital inputs', rationale: '', function: '' },
    { assetClass: 'Process', subCategory: 'ECU', item: 'eSIM', rationale: '', function: '' },
    { assetClass: 'Process', subCategory: 'ECU', item: 'Drivers', rationale: '', function: '' },
    { assetClass: 'Process', subCategory: 'ECU', item: 'UWB / BLE beacon', rationale: '', function: '' },
    { assetClass: 'Process', subCategory: 'ECU', item: 'ASIC', rationale: '', function: '' },
    { assetClass: 'Process', subCategory: 'ECU', item: 'Power block', rationale: '', function: '' },
    { assetClass: 'Process', subCategory: 'ECU', item: 'Signal conditioning (ADC/DAC)', rationale: '', function: '' },
    { assetClass: 'Process', subCategory: 'ECU', item: 'Deserializer / Ser', rationale: '', function: '' },
    { assetClass: 'Process', subCategory: 'ECU', item: 'Watchdog timer', rationale: '', function: '' },
    { assetClass: 'Process', subCategory: 'ECU', item: 'PWM', rationale: 'Pulse width modulation', function: 'Switching signal for control' },
    { assetClass: 'Process', subCategory: 'ECU', item: 'General purpose timer', rationale: '', function: '' },
    { assetClass: 'Data Store', subCategory: 'Firmware (includes system functions)', item: 'Firmware (includes system functions)', rationale: '', function: '' },
    { assetClass: 'Data Store', subCategory: 'Calibration data', item: 'Calibration data', rationale: '', function: '' },
    { assetClass: 'Data Store', subCategory: 'Configuration data', item: 'Configuration data', rationale: '', function: '' },
    { assetClass: 'Data Store', subCategory: 'Security Artifacts', item: 'Security Artifacts', rationale: '', function: '' },
    { assetClass: 'Data Store', subCategory: 'OEM specific data', item: 'OEM specific data', rationale: '', function: '' },
    { assetClass: 'Data Store', subCategory: 'Log & Trace', item: 'Log & Trace', rationale: '', function: '' },
    { assetClass: 'Data Store', subCategory: 'SW update packages (stored in external flash)', item: 'SW update packages (stored in external flash)', rationale: '', function: '' },
    { assetClass: 'Data Store', subCategory: 'Bootloader', item: 'Bootloader', rationale: '', function: '' },
    { assetClass: 'Data Store', subCategory: 'DTC', item: 'DTC', rationale: '', function: '' },
    { assetClass: 'Data Store', subCategory: 'Video recordings', item: 'Video recordings', rationale: '', function: '' },
    { assetClass: 'Data Store', subCategory: 'Switch configurations', item: 'Switch configurations', rationale: '', function: '' },
    { assetClass: 'Data Store', subCategory: 'EOL SW', item: 'EOL SW', rationale: '', function: '' },
    { assetClass: 'External Interactor', subCategory: 'EOL SW', item: 'EOL SW', rationale: '', function: '' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'JTAG', rationale: 'Joint Test Action Group', function: 'Debug' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'SWD', rationale: 'Serial wire debug', function: 'Debug' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'VEH_CAN', rationale: 'Vehicle CAN', function: 'CAN comm. Between ECU' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'PRIVATE_CAN', rationale: 'Private CAN', function: 'CAN comm inside ECU' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'SPI', rationale: 'Serial peripheral interface', function: 'Serial bus' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'LIN', rationale: 'Local Interconnect Network', function: 'Serial bus' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'GPIO', rationale: 'General purpose IO', function: '' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'GMSL', rationale: 'Gigabit Multimedia Serial Link', function: 'Performance for High Speed Video Links' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'I2C', rationale: 'Inter-Integrated Circuit', function: 'Serial bus' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'PCIE', rationale: 'Peripheral Component Interconnect Express', function: '' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'HSGMII_ETH_Interface', rationale: 'Ethernet interface', function: 'High Speed Comm' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'RGMII_ETH_Interface', rationale: '', function: '' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'SMI_ETH_Interface', rationale: '', function: '' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'UFS_PHY', rationale: '', function: 'Connected to UFS storage flash' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'UART', rationale: 'Universal asynchronous receiver-transmitter', function: 'Hardware Communication Protocol' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'Wireless_COMM (UWB / BLE / WiFi)', rationale: 'Wireless (Ultra-wideband)', function: 'Short range wireless' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'CELLULAR', rationale: 'Wireless', function: 'Long range wireless' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'PHY', rationale: '', function: 'MCU pins which may be used for bootstrapping' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'NFC', rationale: 'Near Field Communication', function: '' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'PWM', rationale: 'Pulse width modulation', function: 'Switching signal for control' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'PLC', rationale: '', function: 'Twisted pair of wire or by remotely through telephone or radio modem' },
    { assetClass: 'Communication', subCategory: 'Communication', item: 'MOST', rationale: '', function: '' },
];

// === Unified lookup by ProjectScope ===

export const taraAssetsByScope: Record<ProjectScope, TaraAssetItem[]> = {
    vehicle: vehicleAssets,
    domain: domainAssets,
    component: componentAssets,
    ecu: ecuAssets,
};

/** Group assets by their category key. Returns entries in insertion order. */
export function groupAssetsByCategory(
    scope: ProjectScope
): Record<string, TaraAssetItem[]> {
    const assets = taraAssetsByScope[scope];
    const grouped: Record<string, TaraAssetItem[]> = {};

    for (const asset of assets) {
        const key = getCategoryKey(asset, scope);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(asset);
    }

    return grouped;
}
