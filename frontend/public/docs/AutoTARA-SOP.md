# AutoTARA System - Standard Operating Procedure (SOP)

**Document Version:** 1.0  
**Effective Date:** January 2026  
**Compliance Standard:** ISO/SAE 21434 - Cybersecurity Engineering for Road Vehicles

---

## 1. Purpose

This Standard Operating Procedure (SOP) defines the operational guidelines for using the AutoTARA (Threat Analysis and Risk Assessment) system to conduct cybersecurity assessments for automotive systems in compliance with ISO/SAE 21434.

---

## 2. Scope

This SOP applies to all personnel involved in:
- Vehicle architecture definition
- Threat identification and analysis
- Risk assessment and treatment
- Compliance documentation and audit preparation

---

## 3. Roles and Responsibilities

### 3.1 Engineer
| Responsibility | Description |
|----------------|-------------|
| Architecture Definition | Create and maintain vehicle architecture models |
| Asset Identification | Define cybersecurity assets and their security goals |
| Threat Scenario Creation | Document potential threat scenarios |
| Treatment Implementation | Implement risk mitigation measures |

### 3.2 Analyst
| Responsibility | Description |
|----------------|-------------|
| Risk Assessment Review | Validate threat scenarios and risk calculations |
| Compliance Verification | Ensure ISO/SAE 21434 compliance |
| Audit Preparation | Approve assessments for audit readiness |
| Quality Assurance | Request revisions when needed |

### 3.3 Administrator
| Responsibility | Description |
|----------------|-------------|
| User Management | Manage user accounts and permissions |
| System Configuration | Configure threat catalogs and templates |
| Report Generation | Generate compliance dossiers |

---

## 4. System Overview

### 4.1 Main Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        AutoTARA Interface                        │
├──────────┬──────────────────────────────────────┬───────────────┤
│  Global  │                                      │   Inspector   │
│   Nav    │         Main Workspace               │    Panel      │
│          │                                      │               │
│ □ Dash   │  ┌─────────────────────────────────┐ │ ┌───────────┐ │
│ □ Projects│  │ Architecture │ Threats │ Risk  │ │ │Properties │ │
│ □ Assets │  │  Visualizer  │  Grid   │ Grid  │ │ │           │ │
│ □ Threats│  ├─────────────────────────────────┤ │ │ Security  │ │
│ □ Settings│  │                                 │ │ │  Goals    │ │
│          │  │    [Active Tab Content]          │ │ │           │ │
│          │  │                                 │ │ │ Comm.     │ │
│          │  │                                 │ │ │ Channels  │ │
│          │  └─────────────────────────────────┘ │ └───────────┘ │
├──────────┴──────────────────────────────────────┴───────────────┤
│  Project Explorer (Hierarchical Tree View)                       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Workspace Tabs

| Tab | Purpose |
|-----|---------|
| **Architecture Visualizer** | Visual node-based canvas for ECU and communication mapping |
| **Threat Analysis** | Spreadsheet interface for threat scenario documentation |
| **Risk Assessment** | Data grid for impact/feasibility scoring and risk calculation |
| **Reports** | Audit readiness dashboard and export center |

---

## 5. Operating Procedures

### 5.1 Creating a New Project

1. Click **"New Project"** button in the Project Explorer
2. Complete the Project Wizard:
   - **Step 1 - Scope Selection:** Choose project scope (Vehicle, Domain, Component, or ECU)
   - **Step 2 - Workflow Mode:** Select AI-Assisted or Manual workflow
   - **Step 3 - Document Upload:** (AI-Assisted only) Upload reference documents
   - **Step 4 - Project Name:** Enter project identifier
3. Click **"Create Project"** to initialize

### 5.2 Defining Vehicle Architecture

#### 5.2.1 Adding ECU Nodes
1. Navigate to the **Architecture Visualizer** tab
2. Open the **Component Library** panel
3. Drag components onto the canvas:
   - **ECU** - Electronic Control Units
   - **Sensor** - Input devices
   - **Actuator** - Output devices
   - **Gateway** - Network bridges
   - **Network** - Communication buses

#### 5.2.2 Defining Communication Channels
1. Click on a source node
2. Drag connection to target node
3. Select protocol type:
   - CAN Bus
   - CAN-FD
   - Ethernet
   - FlexRay
   - LIN

#### 5.2.3 Running AI Scan
1. Click the **"AI Scan"** button in the toolbar
2. Wait for the scanning sequence to complete:
   - System parses communication matrix
   - Identifies safety-critical assets
   - Maps potential attack paths
3. Review highlighted assets and auto-generated tags

### 5.3 Threat Analysis

#### 5.3.1 Threat Scenario Documentation
| Field | Description | Example |
|-------|-------------|---------|
| Threat ID | Unique identifier | TS-001 |
| Name | Descriptive title | CAN Bus Message Injection |
| Target Node | Affected ECU/component | Engine Control Module |
| Attack Vector | Method of attack | Network exploitation |
| Impact Category | S/F/O/P classification | Safety |

#### 5.3.2 Impact Categories (ISO/SAE 21434)
- **S - Safety:** Physical harm to vehicle occupants or road users
- **F - Financial:** Monetary losses to stakeholders
- **O - Operational:** Disruption to vehicle functions
- **P - Privacy:** Exposure of personal data

### 5.4 Risk Assessment

#### 5.4.1 Impact Rating Scale
| Level | Description | Criteria |
|-------|-------------|----------|
| **Negligible** | No significant impact | Minor inconvenience |
| **Moderate** | Limited impact | Recoverable issues |
| **Major** | Significant impact | Serious consequences |
| **Severe** | Critical impact | Life-threatening or catastrophic |

#### 5.4.2 Feasibility Factors (Attack Potential)
| Factor | Range | Description |
|--------|-------|-------------|
| Time | 0-4 | Duration required for attack |
| Expertise | 0-4 | Skill level required |
| Knowledge | 0-4 | System knowledge needed |
| Equipment | 0-4 | Tools and resources required |
| Opportunity | 0-4 | Access window availability |

#### 5.4.3 Risk Calculation
```
Feasibility Score = Average(Time + Expertise + Knowledge + Equipment + Opportunity)
Risk Value = Maximum Impact × Feasibility Score

Risk Matrix:
         │ Feasibility
         │  1    2    3    4    5
─────────┼─────────────────────────
Impact 4 │  2    3    4    5    5
       3 │  2    2    3    4    5
       2 │  1    2    2    3    4
       1 │  1    1    2    2    3
```

#### 5.4.4 Treatment Decisions
| Decision | Action | When to Use |
|----------|--------|-------------|
| **Avoid** | Eliminate the threat | Risk is unacceptable, redesign required |
| **Reduce** | Implement controls | Risk can be mitigated to acceptable level |
| **Share** | Transfer risk | Insurance, contracts, or third-party |
| **Accept** | Acknowledge risk | Risk is within tolerance threshold |

### 5.5 Analyst Review Workflow

#### 5.5.1 Review Queue Access
1. Log in with Analyst credentials
2. Navigate to **Review Queue** from Global Navigation
3. Select pending assessment from the queue

#### 5.5.2 Assessment Review
1. Open the **Audit Checklist** panel
2. Verify each compliance requirement:
   - [ ] Asset identification complete
   - [ ] Threat scenarios documented
   - [ ] Impact ratings justified
   - [ ] Feasibility factors assessed
   - [ ] Treatment decisions appropriate
   - [ ] Cybersecurity goals defined
3. For each scenario:
   - Toggle **"Approved"** if compliant
   - Click **"Request Revision"** with comments if changes needed

#### 5.5.3 Approval Indicators
- ✅ **Green Row:** Assessment approved
- ⏳ **Pending:** Awaiting review
- 🔄 **Revision Requested:** Requires engineer attention

### 5.6 Report Generation

#### 5.6.1 Audit Readiness Dashboard
Monitor compliance progress:
- Item Definition: X%
- Asset Identification: X%
- Threat Scenarios: X%
- Risk Assessment: X%
- Treatment Plans: X%

#### 5.6.2 Export Templates
| Template | Audience | Content |
|----------|----------|---------|
| **Auditor View** | External auditors | High-level summary, compliance evidence |
| **Engineering Deep Dive** | Development team | Detailed technical analysis, all data |

#### 5.6.3 Generating Compliance Dossier
1. Navigate to **Reports** tab
2. Select export template
3. Click **"Generate Compliance Dossier"**
4. Choose format (PDF/DOCX)
5. Review preview before download

---

## 6. Data Management

### 6.1 Project Hierarchy
```
Vehicle Project
├── Domain: Powertrain
│   ├── ECU: Engine Control Module
│   └── ECU: Transmission Control Unit
├── Domain: Infotainment
│   ├── ECU: Head Unit
│   └── ECU: Telematics Gateway
├── Domain: Chassis
│   └── ECU: Electronic Stability Control
└── Domain: ADAS
    ├── ECU: Forward Camera
    └── ECU: Radar Module
```

### 6.2 Security Goals
| Goal | Abbreviation | Description |
|------|--------------|-------------|
| Confidentiality | C | Protection from unauthorized disclosure |
| Integrity | I | Protection from unauthorized modification |
| Availability | A | Ensuring authorized access when needed |

---

## 7. Compliance Requirements

### 7.1 ISO/SAE 21434 Work Products
| Clause | Work Product | AutoTARA Feature |
|--------|--------------|------------------|
| 8.3 | Item Definition | Project Explorer |
| 8.4 | Cybersecurity Goals | Inspector Panel |
| 9.3 | Asset Identification | Architecture Visualizer |
| 9.4 | Threat Scenarios | Threat Analysis Grid |
| 9.5 | Attack Feasibility | Risk Assessment Grid |
| 9.6 | Risk Determination | Risk Matrix |
| 9.7 | Risk Treatment | Treatment Decisions |

### 7.2 UN R155 Mapping
AutoTARA supports mapping to UN Regulation 155 requirements for Cyber Security Management Systems (CSMS).

---

## 8. Troubleshooting

| Issue | Possible Cause | Resolution |
|-------|----------------|------------|
| AI Scan not starting | No nodes on canvas | Add at least one ECU node |
| Risk not calculating | Missing impact values | Complete all impact categories |
| Export failing | Incomplete data | Check audit readiness dashboard |
| Review queue empty | No pending items | All assessments are processed |

---

## 9. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | New Project |
| `Ctrl/Cmd + S` | Save |
| `Delete` | Remove selected node |
| `Escape` | Cancel current action |

## 10. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | System | Initial release |

---

| `Space` | Pan canvas (hold) |
| `Scroll` | Zoom in/out |

---
## 11. References

- ISO/SAE 21434:2021 - Road vehicles — Cybersecurity engineering
- UN Regulation No. 155 - Cyber Security and Cyber Security Management System
- ISO 26262 - Functional Safety for Road Vehicles

---

**End of Document**
