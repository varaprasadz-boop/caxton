import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";
import { type Job, type Client, type Machine, type Department, type ProductCategory, type StageDeadlines } from "@shared/schema";

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
    <div className="grid grid-cols-2 gap-1 py-0.5 border-b border-gray-200">
      <span className="font-medium text-xs">{label}:</span>
      <span className="text-xs">{formatValue(value)}</span>
    </div>
  );

  return (
    <div className="flex-1 p-4 print:p-0 print:m-0">
      {/* Action Buttons - Hidden when printing */}
      <div className="flex items-center justify-between mb-4 print:hidden">
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
      <div className="max-w-4xl mx-auto bg-white print:bg-white text-black print:max-w-none">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-2 mb-2">
          <h1 className="text-lg font-bold">CAXTON PRINT</h1>
          <p className="text-xs text-gray-600">Job Card / Work Order</p>
          <div className="mt-1 flex justify-center gap-8">
            <span className="font-bold text-base">{formattedJobNumber}</span>
            <span className="text-xs">Date: {formatDate(job.createdAt)}</span>
          </div>
        </div>

        {/* Client Details */}
        <Card className="mb-1 print:shadow-none print:border">
          <CardHeader className="py-1 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-sm font-semibold">Client Details</CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <InfoRow label="Client Name" value={client?.name} />
                <InfoRow label="Company" value={client?.company} />
                <InfoRow label="GST No" value={client?.gstNo} />
              </div>
              <div>
                <InfoRow label="Email" value={client?.email} />
                <InfoRow label="Phone" value={client?.phone} />
                <InfoRow label="Address" value={client?.address} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 1: Basic Information */}
        <Card className="mb-1 print:shadow-none print:border">
          <CardHeader className="py-1 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-sm font-semibold">1. Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <InfoRow label="Product Category" value={productCategory?.name} />
                <InfoRow label="Job Name" value={job.jobName} />
                <InfoRow label="Job Type" value={job.jobType} />
              </div>
              <div>
                <InfoRow label="Order Date" value={formatDate(job.orderDate)} />
                <InfoRow label="Schedule Date" value={formatDate(job.scheduleDate)} />
                <InfoRow label="Delivery Deadline" value={formatDate(job.deadline)} />
              </div>
            </div>
            <div className="mt-1">
              <InfoRow label="Remarks" value={job.description} />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Specifications & Quantity */}
        <Card className="mb-1 print:shadow-none print:border">
          <CardHeader className="py-1 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-sm font-semibold">2. Specifications & Quantity</CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="grid grid-cols-3 gap-2">
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
            <div className="mt-1">
              <InfoRow label="Remarks" value={job.jobSpecs} />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Additional Process */}
        <Card className="mb-1 print:shadow-none print:border">
          <CardHeader className="py-1 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-sm font-semibold">3. Additional Process</CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="grid grid-cols-3 gap-2">
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

        {/* Section 4: Cutting */}
        <Card className="mb-1 print:shadow-none print:border">
          <CardHeader className="py-1 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-sm font-semibold">4. Cutting</CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <InfoRow label="Paper Size" value={cuttingSlip.paperSize} />
              </div>
              <div>
                <InfoRow label="Cut Size" value={cuttingSlip.cutSize} />
              </div>
              <div>
                <InfoRow label="Issue Sheets" value={cuttingSlip.issueSheets} />
              </div>
            </div>
            <div className="mt-1">
              <InfoRow label="Remarks" value={cuttingSlip.notes} />
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Printing Information */}
        <Card className="mb-1 print:shadow-none print:border">
          <CardHeader className="py-1 bg-gray-100 print:bg-gray-100">
            <CardTitle className="text-sm font-semibold">5. Printing Information</CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="grid grid-cols-4 gap-2">
              <div>
                <InfoRow label="Machine" value={printingInfo.machine} />
              </div>
              <div>
                <InfoRow label="Issued Sheets" value={printingInfo.issuedSheets} />
              </div>
              <div>
                <InfoRow label="Printed Sheets" value={printingInfo.printedSheets} />
              </div>
              <div>
                <InfoRow label="Wastage" value={printingInfo.wastage} />
              </div>
            </div>
            <div className="mt-1">
              <InfoRow label="Remarks" value={printingInfo.notes} />
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-2 pt-1 border-t text-center text-xs text-gray-500">
          <p>Generated on {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
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
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:m-0 {
            margin: 0 !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
}
