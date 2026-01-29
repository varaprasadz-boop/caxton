import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";
import type { Job, Client, Employee, ProductCategory } from "@shared/schema";

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

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"]
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
  
  const prePressSpecs = job.prePressSpecs as any || {};
  const printingInfo = job.printingInfo as any || {};
  const additionalProcess = job.additionalProcess as any || {};
  const cuttingSlip = job.cuttingSlip as any || {};
  const customerDelivery = job.customerDelivery as any || {};
  const items = (job.items as any[]) || [];

  const InfoRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    value !== null && value !== undefined && value !== '' ? (
      <div className="grid grid-cols-2 gap-2 py-1 border-b border-gray-100">
        <span className="font-medium text-sm">{label}:</span>
        <span className="text-sm">{value}</span>
      </div>
    ) : null
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
      <div className="max-w-4xl mx-auto bg-white print:bg-white">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold">CAXTON PRINT</h1>
          <p className="text-sm text-muted-foreground">Job Card / Work Order</p>
          <div className="mt-2 flex justify-center gap-8">
            <span className="font-bold text-lg">{formattedJobNumber}</span>
            <span className="text-sm">Date: {job.createdAt ? format(new Date(job.createdAt), "dd/MM/yyyy") : 'N/A'}</span>
          </div>
        </div>

        {/* Basic Information */}
        <Card className="mb-4 print:shadow-none print:border">
          <CardHeader className="py-2">
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <InfoRow label="Job Name" value={job.jobName} />
                <InfoRow label="Client" value={client?.name} />
                <InfoRow label="Company" value={client?.company} />
                <InfoRow label="Job Type" value={job.jobType} />
                <InfoRow label="Product Category" value={productCategory?.name} />
              </div>
              <div>
                <InfoRow label="Quantity" value={job.quantity?.toLocaleString()} />
                <InfoRow label="Status" value={job.status} />
                <InfoRow label="Deadline" value={job.deadline ? format(new Date(job.deadline), "dd/MM/yyyy") : undefined} />
                <InfoRow label="Order Date" value={job.orderDate ? format(new Date(job.orderDate), "dd/MM/yyyy") : undefined} />
                <InfoRow label="Schedule Date" value={job.scheduleDate ? format(new Date(job.scheduleDate), "dd/MM/yyyy") : undefined} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Specifications */}
        <Card className="mb-4 print:shadow-none print:border">
          <CardHeader className="py-2">
            <CardTitle className="text-lg">Specifications</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <InfoRow label="Size" value={job.size} />
                <InfoRow label="Paper GSM" value={prePressSpecs.paperGsm} />
                <InfoRow label="Paper Size" value={prePressSpecs.paperSize} />
                <InfoRow label="Cut Size" value={prePressSpecs.cutSize} />
              </div>
              <div>
                <InfoRow label="Sheets Count" value={prePressSpecs.sheetsCount} />
                <InfoRow label="Machine" value={prePressSpecs.machine || printingInfo.machine} />
                <InfoRow label="Duration ST" value={prePressSpecs.durationST} />
                <InfoRow label="Duration FT" value={prePressSpecs.durationFT} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pre-Press */}
        {Object.keys(prePressSpecs).length > 0 && (
          <Card className="mb-4 print:shadow-none print:border">
            <CardHeader className="py-2">
              <CardTitle className="text-lg">Pre-Press</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <InfoRow label="Plate Making" value={prePressSpecs.plateMaking} />
                  <InfoRow label="Positives" value={prePressSpecs.positives} />
                  <InfoRow label="CTP Plate" value={prePressSpecs.ctpPlate} />
                </div>
                <div>
                  <InfoRow label="Layout Size" value={prePressSpecs.layoutSize} />
                  <InfoRow label="Layout Ups" value={prePressSpecs.layoutUps} />
                  <InfoRow label="Party Paper" value={prePressSpecs.partyPaper ? 'Yes' : prePressSpecs.partyPaper === false ? 'No' : undefined} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Printing */}
        {Object.keys(printingInfo).length > 0 && (
          <Card className="mb-4 print:shadow-none print:border">
            <CardHeader className="py-2">
              <CardTitle className="text-lg">Printing</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <InfoRow label="Machine" value={printingInfo.machine} />
                  <InfoRow label="No. of Impressions" value={printingInfo.noOfImpressions} />
                  <InfoRow label="Printing Sheets" value={printingInfo.printingSheets} />
                </div>
                <div>
                  <InfoRow label="Press Size" value={printingInfo.pressSize} />
                  <InfoRow label="Gripper" value={printingInfo.gripper} />
                  <InfoRow label="Tail" value={printingInfo.tail} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Process */}
        {Object.keys(additionalProcess).length > 0 && (
          <Card className="mb-4 print:shadow-none print:border">
            <CardHeader className="py-2">
              <CardTitle className="text-lg">Additional Process</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="grid grid-cols-3 gap-4">
                <InfoRow label="Lamination" value={additionalProcess.lamination} />
                <InfoRow label="Varnish" value={additionalProcess.varnish} />
                <InfoRow label="UV" value={additionalProcess.uv} />
                <InfoRow label="Aqueous Coating" value={additionalProcess.aqueousCoating} />
                <InfoRow label="Embossing" value={additionalProcess.embossing} />
                <InfoRow label="Foiling" value={additionalProcess.foiling} />
                <InfoRow label="Die Cutting" value={additionalProcess.dieCutting} />
                <InfoRow label="Punching" value={additionalProcess.punching} />
                <InfoRow label="Pasting" value={additionalProcess.pasting} />
                <InfoRow label="Binding" value={additionalProcess.binding} />
                <InfoRow label="Numbering" value={additionalProcess.numbering} />
                <InfoRow label="Perforation" value={additionalProcess.perforation} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cutting Slip */}
        {Object.keys(cuttingSlip).length > 0 && (
          <Card className="mb-4 print:shadow-none print:border">
            <CardHeader className="py-2">
              <CardTitle className="text-lg">Cutting Slip</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <InfoRow label="Cutting Size" value={cuttingSlip.cuttingSize} />
                  <InfoRow label="Cutting Sheets" value={cuttingSlip.cuttingSheets} />
                </div>
                <div>
                  <InfoRow label="Cutting Notes" value={cuttingSlip.cuttingNotes} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivery */}
        {Object.keys(customerDelivery).length > 0 && (
          <Card className="mb-4 print:shadow-none print:border">
            <CardHeader className="py-2">
              <CardTitle className="text-lg">Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <InfoRow label="Delivery Mode" value={customerDelivery.deliveryMode} />
                  <InfoRow label="Delivery Address" value={customerDelivery.deliveryAddress} />
                </div>
                <div>
                  <InfoRow label="Delivery Contact" value={customerDelivery.deliveryContact} />
                  <InfoRow label="Delivery Notes" value={customerDelivery.deliveryNotes} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        {items.length > 0 && (
          <Card className="mb-4 print:shadow-none print:border">
            <CardHeader className="py-2">
              <CardTitle className="text-lg">Items</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">#</th>
                    <th className="text-left py-2 px-2">Description</th>
                    <th className="text-right py-2 px-2">Quantity</th>
                    <th className="text-right py-2 px-2">Rate</th>
                    <th className="text-right py-2 px-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, index: number) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-2">{index + 1}</td>
                      <td className="py-2 px-2">{item.description || '-'}</td>
                      <td className="text-right py-2 px-2">{item.quantity || 0}</td>
                      <td className="text-right py-2 px-2">{item.rate || 0}</td>
                      <td className="text-right py-2 px-2">{item.amount || 0}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan={4} className="text-right py-2 px-2">Total:</td>
                    <td className="text-right py-2 px-2">
                      {items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Remarks */}
        {(job.partyPressRemarks || job.description) && (
          <Card className="mb-4 print:shadow-none print:border">
            <CardHeader className="py-2">
              <CardTitle className="text-lg">Remarks</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              {job.partyPressRemarks && (
                <div className="mb-2">
                  <span className="font-medium">Party Press Remarks:</span>
                  <p className="text-sm mt-1">{job.partyPressRemarks}</p>
                </div>
              )}
              {job.description && (
                <div>
                  <span className="font-medium">Description:</span>
                  <p className="text-sm mt-1">{job.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground print:mt-4">
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
        }
      `}</style>
    </div>
  );
}
