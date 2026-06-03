import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  FileText, 
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Shield,
  Printer,
  Eye,
  FileCheck,
  Loader2,
} from 'lucide-react';
import { AuditProgress, ExportTemplate, ThreatScenario } from '@/types/risk-assessment';

interface ReportExportCenterProps {
  scenarios: ThreatScenario[];
  className?: string;
}

const auditProgressData: AuditProgress[] = [
  { category: 'item-definition', label: 'Item Definition', progress: 100, total: 100 },
  { category: 'asset-identification', label: 'Asset Identification', progress: 95, total: 100 },
  { category: 'threat-scenarios', label: 'Threat Scenarios', progress: 88, total: 100 },
  { category: 'risk-assessment', label: 'Risk Assessment', progress: 85, total: 100 },
  { category: 'risk-treatment', label: 'Risk Treatment', progress: 72, total: 100 },
  { category: 'verification', label: 'Verification & Validation', progress: 45, total: 100 },
];

const exportTemplates: ExportTemplate[] = [
  {
    id: 'auditor',
    name: 'Auditor View',
    description: 'High-level summary with compliance status and critical findings',
    type: 'auditor',
  },
  {
    id: 'engineering',
    name: 'Engineering Deep Dive',
    description: 'Detailed technical analysis with full threat scenarios and mitigations',
    type: 'engineering',
  },
];

export function ReportExportCenter({ scenarios, className }: ReportExportCenterProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  const overallProgress = Math.round(
    auditProgressData.reduce((sum, item) => sum + item.progress, 0) / auditProgressData.length
  );

  const criticalRisks = scenarios.filter(s => s.riskValue >= 4).length;
  const pendingReviews = scenarios.filter(s => s.reviewStatus === 'pending').length;
  const approvedScenarios = scenarios.filter(s => s.reviewStatus === 'approved').length;

  const handleGenerateReport = async () => {
    if (!selectedTemplate) return;
    
    setIsGenerating(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const report = generateReportContent(selectedTemplate, scenarios);
    setGeneratedReport(report);
    setIsGenerating(false);
    setPreviewOpen(true);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Audit Readiness Overview */}
          <Card className="glass-effect">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    ISO/SAE 21434 Audit Readiness
                  </CardTitle>
                  <CardDescription>
                    Overall compliance progress for cybersecurity assessment
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{overallProgress}%</div>
                  <div className="text-xs text-muted-foreground">Overall Progress</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditProgressData.map((item) => (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className={cn(
                        "text-xs font-mono",
                        item.progress === 100 ? "text-sage" : 
                        item.progress >= 75 ? "text-dusty-amber" : 
                        "text-muted-foreground"
                      )}>
                        {item.progress}%
                      </span>
                    </div>
                    <Progress 
                      value={item.progress} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="glass-effect">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{criticalRisks}</div>
                    <div className="text-xs text-muted-foreground">Critical Risks</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-dusty-amber/10">
                    <Clock className="w-5 h-5 text-dusty-amber" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{pendingReviews}</div>
                    <div className="text-xs text-muted-foreground">Pending Reviews</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sage/10">
                    <CheckCircle2 className="w-5 h-5 text-sage" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{approvedScenarios}</div>
                    <div className="text-xs text-muted-foreground">Approved</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Templates */}
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                Generate Compliance Dossier
              </CardTitle>
              <CardDescription>
                Select a template to generate your ISO 21434 compliant documentation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {exportTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all",
                      selectedTemplate?.id === template.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {template.type === 'auditor' ? (
                        <Eye className="w-5 h-5 text-primary mt-0.5" />
                      ) : (
                        <FileSpreadsheet className="w-5 h-5 text-primary mt-0.5" />
                      )}
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {template.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <Button 
                  className="flex-1 gap-2"
                  disabled={!selectedTemplate || isGenerating}
                  onClick={handleGenerateReport}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Generate Report
                    </>
                  )}
                </Button>
                <Button variant="outline" className="gap-2" disabled={!generatedReport}>
                  <Download className="w-4 h-4" />
                  PDF
                </Button>
                <Button variant="outline" className="gap-2" disabled={!generatedReport}>
                  <Download className="w-4 h-4" />
                  DOCX
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Exports */}
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="text-sm">Recent Exports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'TARA_Report_v2.3.pdf', date: '2024-01-15', template: 'Auditor View' },
                  { name: 'Engineering_Analysis_Full.docx', date: '2024-01-12', template: 'Engineering Deep Dive' },
                  { name: 'TARA_Report_v2.2.pdf', date: '2024-01-08', template: 'Auditor View' },
                ].map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{file.name}</div>
                        <div className="text-xs text-muted-foreground">{file.template}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{file.date}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Report Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedTemplate?.name} - Preview
            </DialogTitle>
            <DialogDescription>
              ISO/SAE 21434 Cybersecurity Assessment Report
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 mt-4">
            <div className="bg-card border border-border rounded-lg p-8 prose prose-sm dark:prose-invert max-w-none">
              {generatedReport && (
                <div dangerouslySetInnerHTML={{ __html: generatedReport }} />
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" className="gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Download DOCX
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function generateReportContent(template: ExportTemplate, scenarios: ThreatScenario[]): string {
  const criticalRisks = scenarios.filter(s => s.riskValue >= 4);
  const highRisks = scenarios.filter(s => s.riskValue === 3);
  const totalApproved = scenarios.filter(s => s.reviewStatus === 'approved').length;
  
  if (template.type === 'auditor') {
    return `
      <div class="space-y-8">
        <div class="text-center border-b pb-6">
          <h1 class="text-2xl font-bold">Cybersecurity Assessment Report</h1>
          <p class="text-muted-foreground mt-2">ISO/SAE 21434 Compliance Summary</p>
          <p class="text-sm text-muted-foreground mt-1">Generated: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div>
          <h2 class="text-lg font-semibold border-b pb-2 mb-4">Executive Summary</h2>
          <p>This document presents the findings of the Threat Analysis and Risk Assessment (TARA) conducted in accordance with ISO/SAE 21434 requirements for cybersecurity engineering in road vehicles.</p>
          
          <div class="grid grid-cols-3 gap-4 mt-4 p-4 bg-muted/20 rounded-lg">
            <div class="text-center">
              <div class="text-2xl font-bold text-destructive">${criticalRisks.length}</div>
              <div class="text-xs text-muted-foreground">Critical Risks</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-amber-500">${highRisks.length}</div>
              <div class="text-xs text-muted-foreground">High Risks</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-500">${totalApproved}</div>
              <div class="text-xs text-muted-foreground">Approved</div>
            </div>
          </div>
        </div>
        
        <div>
          <h2 class="text-lg font-semibold border-b pb-2 mb-4">Critical Findings</h2>
          <table class="w-full text-sm">
            <thead class="bg-muted/30">
              <tr>
                <th class="text-left p-2">ID</th>
                <th class="text-left p-2">Threat Scenario</th>
                <th class="text-left p-2">Risk Level</th>
                <th class="text-left p-2">Treatment</th>
              </tr>
            </thead>
            <tbody>
              ${criticalRisks.slice(0, 5).map(s => `
                <tr class="border-b">
                  <td class="p-2 font-mono">${s.threatId}</td>
                  <td class="p-2">${s.name}</td>
                  <td class="p-2"><span class="px-2 py-1 rounded text-xs bg-destructive/20 text-destructive">${s.riskValue}/5</span></td>
                  <td class="p-2 capitalize">${s.treatmentDecision}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div>
          <h2 class="text-lg font-semibold border-b pb-2 mb-4">Compliance Status</h2>
          <p class="text-green-600">✓ Threat Analysis completed per Clause 15</p>
          <p class="text-green-600">✓ Risk Assessment completed per Clause 15.8</p>
          <p class="text-amber-600">⚠ Risk Treatment plan in progress</p>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="space-y-8">
      <div class="text-center border-b pb-6">
        <h1 class="text-2xl font-bold">Technical TARA Report</h1>
        <p class="text-muted-foreground mt-2">Engineering Deep Dive Analysis</p>
        <p class="text-sm text-muted-foreground mt-1">Generated: ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div>
        <h2 class="text-lg font-semibold border-b pb-2 mb-4">Complete Threat Scenario Matrix</h2>
        <p class="text-sm text-muted-foreground mb-4">Total Scenarios Analyzed: ${scenarios.length}</p>
        
        <table class="w-full text-xs">
          <thead class="bg-muted/30">
            <tr>
              <th class="text-left p-2">ID</th>
              <th class="text-left p-2">Scenario</th>
              <th class="text-left p-2">Target</th>
              <th class="text-left p-2">S</th>
              <th class="text-left p-2">F</th>
              <th class="text-left p-2">O</th>
              <th class="text-left p-2">P</th>
              <th class="text-left p-2">Feasibility</th>
              <th class="text-left p-2">Risk</th>
            </tr>
          </thead>
          <tbody>
            ${scenarios.slice(0, 15).map(s => `
              <tr class="border-b">
                <td class="p-2 font-mono">${s.threatId}</td>
                <td class="p-2">${s.name}</td>
                <td class="p-2">${s.targetAsset}</td>
                <td class="p-2 capitalize">${s.impactSafety[0]}</td>
                <td class="p-2 capitalize">${s.impactFinancial[0]}</td>
                <td class="p-2 capitalize">${s.impactOperational[0]}</td>
                <td class="p-2 capitalize">${s.impactPrivacy[0]}</td>
                <td class="p-2">${s.feasibilityScore}/5</td>
                <td class="p-2">${s.riskValue}/5</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${scenarios.length > 15 ? `<p class="text-xs text-muted-foreground mt-2">... and ${scenarios.length - 15} more scenarios</p>` : ''}
      </div>
      
      <div>
        <h2 class="text-lg font-semibold border-b pb-2 mb-4">Cybersecurity Goals</h2>
        ${criticalRisks.slice(0, 5).map(s => `
          <div class="p-3 bg-muted/20 rounded mb-2">
            <div class="font-medium text-sm">${s.threatId}: ${s.name}</div>
            <div class="text-xs text-muted-foreground mt-1">${s.cybersecurityGoal}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
