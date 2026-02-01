import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";
import { TASK_STAGES, type Job, type Client, type Machine, type Department, type ProductCategory, type StageDeadlines } from "@shared/schema";

function formatJobNumber(jobNumber: number, createdAt: Date | null): string {
  if (!createdAt) return `CAX${String(jobNumber).padStart(4, '0')}`;
  const date = new Date(createdAt);
  const paddedNumber = String(jobNumber).padStart(4, '0');
  const year = date.getFullYear();
  const nextYear = String(year + 1).slice(-2);
  return `CAX${paddedNumber}/${year}-${nextYear}`;
}

export default function JobPrintPreview() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: job, isLoading, isError, error } = useQuery<Job>({
    queryKey: ["/api/jobs", id],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${id}`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Job not found');
        throw new Error('Failed to fetch job');
      }
      return res.json();
    },
    enabled: !!id,
    retry: false
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", job?.clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${job?.clientId}`, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch client');
      return res.json();
    },
    enabled: !!job?.clientId
  });

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ["/api/machines"]
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"]
  });

  const { data: productCategories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"]
  });

  const handleBack = () => {
    setLocation(`/jobs/${id}`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    const errorMessage = error?.message?.includes('not found') 
      ? "The requested job could not be found."
      : "An error occurred while loading the job. Please try again.";
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">
            {error?.message?.includes('not found') ? 'Job Not Found' : 'Error Loading Job'}
          </h2>
          <p className="text-muted-foreground mb-4">{errorMessage}</p>
          <Button onClick={() => setLocation('/jobs')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  const formattedJobNumber = formatJobNumber(job.jobNumber, job.createdAt);
  const productCategory = productCategories.find(c => c.id === job.productCategoryId);
  
  const prePressSpecs = (job.prePressSpecs as any) || {};
  const printingInfo = (job.printingInfo as any) || {};
  const additionalProcess = (job.additionalProcess as any) || {};
  const cuttingSlip = (job.cuttingSlip as any) || {};
  const customerDelivery = (job.customerDelivery as any) || {};
  const items = (job.items as any[]) || [];
  const stageDeadlines = (job.stageDeadlines as StageDeadlines) || {};
  const machineIds = (job.machineIds as string[]) || [];

  const selectedMachines = machines.filter(m => machineIds.includes(m.id));
  const machinesByDept: Record<string, Machine[]> = {};
  selectedMachines.forEach(machine => {
    const deptId = machine.departmentId;
    if (!machinesByDept[deptId]) machinesByDept[deptId] = [];
    machinesByDept[deptId].push(machine);
  });

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const formatDate = (date: any): string => {
    if (!date) return '-';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '-';
      return format(d, "dd/MM/yyyy");
    } catch {
      return '-';
    }
  };

  const InfoRow = ({ label, value }: { label: string; value: any }) => (
    <div className="grid grid-cols-2 gap-2 py-1 border-b border-gray-200">
      <span className="font-medium text-sm">{label}:</span>
      <span className="text-sm">{formatValue(value)}</span>
    </div>
  );

  return (
    <div className="flex-1 p-6">
      {/* Action Buttons - Hidden when printing */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button variant="outline" onClick={handleBack} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Job
        </Button>
        <Button onClick={handlePrint} data-testid="button-print">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Print Content */}
      <div className="max-w-4xl mx-auto bg-white print:bg-white text-black">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold">CAXTON PRINT</h1>
          <p className="text-sm text-gray-600">Job Card / Work Order</p>
          <div className="mt-2 flex justify-center gap-8">
            <span className="font-bold text-lg">{formattedJobNumber}</span>
            <span className="text-sm">Date: {formatDate(job.createdAt)}</span>
          </div>
        </div>

        {/* Section 1: Basic Information */}
        <Card className="mb-4 print:shadow-none print:border">
          <CardHeader className="py-2 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-lg">1. Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <InfoRow label="Client" value={client?.name} />
                <InfoRow label="Company" value={client?.company} />
                <InfoRow label="Product Category" value={productCategory?.name} />
                <InfoRow label="Job Name" value={job.jobName} />
              </div>
              <div>
                <InfoRow label="Job Type" value={job.jobType} />
                <InfoRow label="Order Date" value={formatDate(job.orderDate)} />
                <InfoRow label="Schedule Date" value={formatDate(job.scheduleDate)} />
                <InfoRow label="Delivery Deadline" value={formatDate(job.deadline)} />
              </div>
            </div>
            <div className="mt-2">
              <InfoRow label="Job Description" value={job.description} />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Specifications & Quantity */}
        <Card className="mb-4 print:shadow-none print:border">
          <CardHeader className="py-2 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-lg">2. Specifications & Quantity</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <InfoRow label="Quantity" value={job.quantity} />
                <InfoRow label="Size/Dimensions" value={job.size} />
                <InfoRow label="CLS" value={job.cls} />
              </div>
              <div>
                <InfoRow label="Colors" value={job.colors} />
                <InfoRow label="Paper" value={job.paper} />
                <InfoRow label="Finishing Options" value={job.finishingOptions} />
              </div>
              <div>
                <InfoRow label="Status" value={job.status} />
              </div>
            </div>
            <div className="mt-2">
              <InfoRow label="Job Specifications (Details)" value={job.jobSpecs} />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Pre-Press Specifications */}
        <Card className="mb-4 print:shadow-none print:border">
          <CardHeader className="py-2 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-lg">3. Pre-Press Specifications</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <InfoRow label="Artwork Received" value={prePressSpecs.artworkReceived} />
                <InfoRow label="Proof Sent" value={prePressSpecs.proofSent} />
                <InfoRow label="Proof Approved" value={prePressSpecs.proofApproved} />
              </div>
              <div>
                <InfoRow label="Plate Making" value={prePressSpecs.plateMaking} />
              </div>
            </div>
            <div className="mt-2">
              <InfoRow label="Pre-Press Notes" value={prePressSpecs.notes} />
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Printing Information */}
        <Card className="mb-4 print:shadow-none print:border">
          <CardHeader className="py-2 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-lg">4. Printing Information</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <InfoRow label="Machine" value={printingInfo.machine} />
                <InfoRow label="Forms" value={printingInfo.forms} />
              </div>
              <div>
                <InfoRow label="Ups" value={printingInfo.ups} />
                <InfoRow label="Print Run" value={printingInfo.printRun} />
              </div>
              <div>
                <InfoRow label="Sheets Required" value={printingInfo.sheetsRequired} />
              </div>
            </div>
            <div className="mt-2">
              <InfoRow label="Printing Notes" value={printingInfo.notes} />
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Additional Process */}
        <Card className="mb-4 print:shadow-none print:border">
          <CardHeader className="py-2 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-lg">5. Additional Process</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <InfoRow label="Lamination" value={additionalProcess.lamination} />
                <InfoRow label="UV Coating" value={additionalProcess.uvCoating} />
              </div>
              <div>
                <InfoRow label="Foiling" value={additionalProcess.foiling} />
                <InfoRow label="Embossing" value={additionalProcess.embossing} />
              </div>
              <div>
                <InfoRow label="Die Cutting" value={additionalProcess.dieCutting} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Cutting Slip */}
        <Card className="mb-4 print:shadow-none print:border">
          <CardHeader className="py-2 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-lg">6. Cutting Slip</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <InfoRow label="Cut Size" value={cuttingSlip.cutSize} />
              </div>
              <div>
                <InfoRow label="Quantity" value={cuttingSlip.quantity} />
              </div>
              <div>
                <InfoRow label="Sections" value={cuttingSlip.sections} />
              </div>
            </div>
            <div className="mt-2">
              <InfoRow label="Cutting Notes" value={cuttingSlip.notes} />
            </div>
          </CardContent>
        </Card>

        {/* Section 7: Customer Delivery */}
        <Card className="mb-4 print:shadow-none print:border">
          <CardHeader className="py-2 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-lg">7. Customer Delivery</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <InfoRow label="Delivery Address" value={customerDelivery.address} />
              </div>
              <div>
                <InfoRow label="Delivery Contact" value={customerDelivery.contact} />
              </div>
            </div>
            <div className="mt-2">
              <InfoRow label="Delivery Instructions" value={customerDelivery.instructions} />
            </div>
          </CardContent>
        </Card>

        {/* Section 8: Items (Line Items) */}
        <Card className="mb-4 print:shadow-none print:border">
          <CardHeader className="py-2 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-lg">8. Items (Line Items)</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <table className="w-full text-sm border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-2 border border-gray-300">Sr. No.</th>
                  <th className="text-left py-2 px-2 border border-gray-300">Particulars</th>
                  <th className="text-right py-2 px-2 border border-gray-300">Qty</th>
                  <th className="text-center py-2 px-2 border border-gray-300">Unit</th>
                  <th className="text-right py-2 px-2 border border-gray-300">Rate</th>
                  <th className="text-right py-2 px-2 border border-gray-300">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="py-2 px-2 border border-gray-300">{item.srNo || index + 1}</td>
                      <td className="py-2 px-2 border border-gray-300">{formatValue(item.particulars)}</td>
                      <td className="text-right py-2 px-2 border border-gray-300">{formatValue(item.quantity)}</td>
                      <td className="text-center py-2 px-2 border border-gray-300">{formatValue(item.unit)}</td>
                      <td className="text-right py-2 px-2 border border-gray-300">{formatValue(item.rate)}</td>
                      <td className="text-right py-2 px-2 border border-gray-300">{formatValue(item.amount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-2 px-2 border border-gray-300">1</td>
                    <td className="py-2 px-2 border border-gray-300">-</td>
                    <td className="text-right py-2 px-2 border border-gray-300">-</td>
                    <td className="text-center py-2 px-2 border border-gray-300">-</td>
                    <td className="text-right py-2 px-2 border border-gray-300">-</td>
                    <td className="text-right py-2 px-2 border border-gray-300">-</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-gray-50">
                  <td colSpan={5} className="text-right py-2 px-2 border border-gray-300">Total:</td>
                  <td className="text-right py-2 px-2 border border-gray-300">
                    {items.length > 0 
                      ? items.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2)
                      : '-'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* Section 9: Machine Selection */}
        <Card className="mb-4 print:shadow-none print:border">
          <CardHeader className="py-2 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-lg">9. Machine Selection</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <InfoRow 
              label="Selected Machines" 
              value={selectedMachines.length > 0 
                ? Object.entries(machinesByDept).map(([deptId, deptMachines]) => {
                    const dept = departments.find(d => d.id === deptId);
                    return `${dept?.name || 'Unknown'}: ${deptMachines.map(m => m.name).join(', ')}`;
                  }).join(' | ')
                : null
              } 
            />
          </CardContent>
        </Card>

        {/* Section 10: PO File */}
        <Card className="mb-4 print:shadow-none print:border">
          <CardHeader className="py-2 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-lg">10. Purchase Order (PO) File</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <InfoRow label="PO File" value={job.poFileUrl ? 'Attached' : null} />
            {job.poFileUrl && (
              <p className="text-xs text-gray-500 mt-1 break-all print:hidden">
                URL: {job.poFileUrl}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Section 11: Stage Time Allocation */}
        <Card className="mb-4 print:shadow-none print:border">
          <CardHeader className="py-2 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-lg">11. Stage Time Allocation</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-2 gap-4">
              {TASK_STAGES.map((stage) => (
                <InfoRow key={stage} label={stage} value={stageDeadlines[stage] ? formatDate(stageDeadlines[stage]) : null} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section 12: Party/Press Remarks */}
        <Card className="mb-4 print:shadow-none print:border">
          <CardHeader className="py-2 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-lg">12. Party/Press Remarks</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <InfoRow label="Party/Press Remarks" value={job.partyPressRemarks} />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500 print:mt-4">
          <p>Generated on {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border {
            border: 1px solid #e5e7eb !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
        }
      `}</style>
    </div>
  );
}
