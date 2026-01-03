import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import type { Job, Client } from "@shared/schema";

function formatJobNumber(jobNumber: number, createdAt: Date | null): string {
  if (!createdAt) return `CAX${String(jobNumber).padStart(4, '0')}`;
  const date = new Date(createdAt);
  const paddedNumber = String(jobNumber).padStart(4, '0');
  const year = date.getFullYear();
  const nextYear = String(year + 1).slice(-2);
  return `CAX${paddedNumber}/${year}-${nextYear}`;
}

export default function JobSheetPreview() {
  const { id } = useParams<{ id: string }>();

  const { data: job, isLoading: jobLoading } = useQuery<Job>({
    queryKey: [`/api/jobs/${id}`],
    enabled: !!id,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading job sheet...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Job not found</div>
      </div>
    );
  }

  const client = clients.find(c => c.id === job.clientId);
  const formattedJobNumber = formatJobNumber(job.jobNumber, job.createdAt);
  
  // Parse JSON fields safely
  const prePress = job.prePress as Record<string, string> | null;
  const printing = job.printing as Record<string, string> | null;
  const additionalProcess = job.additionalProcess as Record<string, string> | null;
  const cuttingSlip = job.cuttingSlip as Record<string, string> | null;
  const customerDelivery = job.customerDelivery as Record<string, string> | null;
  const items = (job.items as Array<{ item1?: string; item2?: string; remarks?: string }>) || [];

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    window.close();
  };

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-container { padding: 0 !important; }
        }
        @media screen {
          .print-container { max-width: 1200px; margin: 0 auto; }
        }
      `}</style>

      {/* Action Buttons - hidden when printing */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Close
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Job Sheet Content */}
      <div className="print-container bg-white p-8 min-h-screen">
        <h1 className="text-3xl font-bold text-center mb-8 border-b-2 border-black pb-4">
          JOB SHEET
        </h1>

        {/* Client Info & Job Info */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="border rounded p-4">
            <h3 className="font-bold text-lg mb-3 border-b pb-2">Client Info</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Client Name:</strong> {client?.name || "N/A"}</p>
              <p><strong>Company:</strong> {client?.company || "N/A"}</p>
              <p><strong>Email:</strong> {client?.email || "N/A"}</p>
              <p><strong>Phone:</strong> {client?.phone || "N/A"}</p>
            </div>
          </div>

          <div className="border rounded p-4">
            <h3 className="font-bold text-lg mb-3 border-b pb-2">Job Info</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Job Name:</strong> {job.jobName || "N/A"}</p>
              <p><strong>Job ID:</strong> {formattedJobNumber}</p>
              <p><strong>Created Date:</strong> {job.createdAt ? format(new Date(job.createdAt), "MMM dd, yyyy") : "N/A"}</p>
              <p><strong>Delivery Deadline:</strong> {format(new Date(job.deadline), "MMM dd, yyyy")}</p>
            </div>
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6 border rounded p-4">
          <div>
            <label className="font-semibold text-xs text-gray-600">Order Date</label>
            <p className="border-b pb-1">{job.orderDate ? format(new Date(job.orderDate), "MMM dd, yyyy") : "-"}</p>
          </div>
          <div>
            <label className="font-semibold text-xs text-gray-600">Machine</label>
            <p className="border-b pb-1">{job.machineIds?.join(", ") || "-"}</p>
          </div>
          <div>
            <label className="font-semibold text-xs text-gray-600">Job Specs</label>
            <p className="border-b pb-1">{job.jobSpecs || "-"}</p>
          </div>
          <div>
            <label className="font-semibold text-xs text-gray-600">Schedule Date</label>
            <p className="border-b pb-1">{job.scheduleDate ? format(new Date(job.scheduleDate), "MMM dd, yyyy") : "-"}</p>
          </div>
          <div>
            <label className="font-semibold text-xs text-gray-600">Size</label>
            <p className="border-b pb-1">{job.size || "-"}</p>
          </div>
          <div>
            <label className="font-semibold text-xs text-gray-600">Cls</label>
            <p className="border-b pb-1">{job.cls || "-"}</p>
          </div>
          <div>
            <label className="font-semibold text-xs text-gray-600">Paper</label>
            <p className="border-b pb-1">{job.paper || "-"}</p>
          </div>
          <div>
            <label className="font-semibold text-xs text-gray-600">Qty</label>
            <p className="border-b pb-1">{job.quantity?.toLocaleString() || "-"}</p>
          </div>
        </div>

        {/* Pre Press Specifications */}
        <div className="mb-6">
          <h2 className="font-bold text-lg mb-3 border-b-2 pb-2">Pre Press Specifications</h2>
          <div className="grid grid-cols-4 gap-4 border rounded p-4">
            <div className="col-span-2">
              <label className="font-semibold text-xs text-gray-600">Special Instructions</label>
              <p className="border-b pb-1 min-h-[40px]">{prePress?.specialInstructions || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">File Name</label>
              <p className="border-b pb-1">{prePress?.fileName || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Out Put ST</label>
              <p className="border-b pb-1">{prePress?.outputST || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Out Put FT</label>
              <p className="border-b pb-1">{prePress?.outputFT || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Paper / GSM</label>
              <p className="border-b pb-1">{prePress?.paperGSM || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Paper Size</label>
              <p className="border-b pb-1">{prePress?.paperSize || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">No. of Sheets Cut</label>
              <p className="border-b pb-1">{prePress?.sheetsCount || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Cut Size</label>
              <p className="border-b pb-1">{prePress?.cutSize || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Machine</label>
              <p className="border-b pb-1">{prePress?.machine || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Duration Time ST</label>
              <p className="border-b pb-1">{prePress?.durationST || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Duration Time FT</label>
              <p className="border-b pb-1">{prePress?.durationFT || "-"}</p>
            </div>
          </div>
        </div>

        {/* Printing Information */}
        <div className="mb-6">
          <h2 className="font-bold text-lg mb-3 border-b-2 pb-2">Printing Information</h2>
          <div className="grid grid-cols-4 gap-4 border rounded p-4">
            <div>
              <label className="font-semibold text-xs text-gray-600">Printing Size</label>
              <p className="border-b pb-1">{printing?.printingSize || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Colors</label>
              <p className="border-b pb-1">{job.colors || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Impression</label>
              <p className="border-b pb-1">{printing?.impression || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Coating</label>
              <p className="border-b pb-1">{printing?.coating || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Duration Time ST</label>
              <p className="border-b pb-1">{printing?.durationST || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Duration Time FT</label>
              <p className="border-b pb-1">{printing?.durationFT || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Wastage</label>
              <p className="border-b pb-1">{printing?.wastage || "-"}</p>
            </div>
          </div>
        </div>

        {/* Additional Process */}
        <div className="mb-6">
          <h2 className="font-bold text-lg mb-3 border-b-2 pb-2">Additional Process</h2>
          <div className="grid grid-cols-4 gap-4 border rounded p-4">
            <div>
              <label className="font-semibold text-xs text-gray-600">Coating</label>
              <p className="border-b pb-1">{additionalProcess?.coating || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Threading</label>
              <p className="border-b pb-1">{additionalProcess?.threading || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Lamination</label>
              <p className="border-b pb-1">{additionalProcess?.lamination || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">'I' Lets</label>
              <p className="border-b pb-1">{additionalProcess?.iLets || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Foiling</label>
              <p className="border-b pb-1">{additionalProcess?.foiling || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Folding</label>
              <p className="border-b pb-1">{additionalProcess?.folding || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Spot U.V</label>
              <p className="border-b pb-1">{additionalProcess?.spotUV || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Section / Centre</label>
              <p className="border-b pb-1">{additionalProcess?.sectionCentre || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Punching</label>
              <p className="border-b pb-1">{additionalProcess?.punching || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Perfect Binding</label>
              <p className="border-b pb-1">{additionalProcess?.perfectBinding || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Pasting</label>
              <p className="border-b pb-1">{additionalProcess?.pasting || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Centre Pinning</label>
              <p className="border-b pb-1">{additionalProcess?.centrePinning || "-"}</p>
            </div>
          </div>
        </div>

        {/* Cutting Slip */}
        <div className="mb-6">
          <h2 className="font-bold text-lg mb-3 border-b-2 pb-2">Cutting Slip</h2>
          <div className="grid grid-cols-4 gap-4 border rounded p-4">
            <div>
              <label className="font-semibold text-xs text-gray-600">Job Name</label>
              <p className="border-b pb-1">{job.jobName || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Quantity</label>
              <p className="border-b pb-1">{job.quantity?.toLocaleString() || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Bill No</label>
              <p className="border-b pb-1">{cuttingSlip?.billNo || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Cut Size</label>
              <p className="border-b pb-1">{cuttingSlip?.cutSize || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">GSM</label>
              <p className="border-b pb-1">{cuttingSlip?.gsm || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Machine</label>
              <p className="border-b pb-1">{cuttingSlip?.machine || "-"}</p>
            </div>
          </div>
        </div>

        {/* Customer & Delivery */}
        <div className="mb-6">
          <h2 className="font-bold text-lg mb-3 border-b-2 pb-2">Customer & Delivery</h2>
          <div className="grid grid-cols-4 gap-4 border rounded p-4">
            <div>
              <label className="font-semibold text-xs text-gray-600">Customer</label>
              <p className="border-b pb-1">{client?.name || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Wastage</label>
              <p className="border-b pb-1">{customerDelivery?.wastage || "-"}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Delivery Date</label>
              <p className="border-b pb-1">{format(new Date(job.deadline), "MMM dd, yyyy")}</p>
            </div>
            <div>
              <label className="font-semibold text-xs text-gray-600">Client Details</label>
              <p className="border-b pb-1">{customerDelivery?.clientDetails || "-"}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <h2 className="font-bold text-lg mb-3 border-b-2 pb-2">Items</h2>
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Item</th>
                <th className="border p-2 text-left">Item</th>
                <th className="border p-2 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="border p-2">-</td>
                  <td className="border p-2">-</td>
                  <td className="border p-2">-</td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={index}>
                    <td className="border p-2">{item.item1 || "-"}</td>
                    <td className="border p-2">{item.item2 || "-"}</td>
                    <td className="border p-2">{item.remarks || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Party Press Remarks */}
        <div className="mb-6">
          <h2 className="font-bold text-lg mb-3 border-b-2 pb-2">Party Press Remarks</h2>
          <div className="border rounded p-4 min-h-[80px]">
            {job.partyPressRemarks || "-"}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t">
          Generated on {format(new Date(), "MMMM dd, yyyy 'at' hh:mm a")}
        </div>
      </div>
    </>
  );
}
