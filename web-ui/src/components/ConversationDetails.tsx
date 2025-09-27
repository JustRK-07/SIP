import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type ConversationDetailsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: {
    id: string;
    transcript?: string | null;
    results?: {
      outcome: string;
      summary: string;
      data: Record<string, string>;
    } | null;
    callStartTime?: Date | null;
    callEndTime?: Date | null;
    duration?: number | null;
  };
};

export function ConversationDetails({
  open,
  onOpenChange,
  conversation,
}: ConversationDetailsProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Conversation Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Call Information */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-500">Start Time</div>
              <div className="font-medium">
                {conversation.callStartTime
                  ? new Date(conversation.callStartTime).toLocaleString()
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Duration</div>
              <div className="font-medium">
                {conversation.duration
                  ? formatDuration(conversation.duration)
                  : "-"}
              </div>
            </div>
          </div>

          {/* Conversation Results */}
          {conversation.results && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-2">Outcome</div>
                <div className="font-medium">{conversation.results.outcome}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-2">Summary</div>
                <div className="font-medium">{conversation.results.summary}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-2">Collected Data</div>
                <div className="grid gap-2">
                  {Object.entries(conversation.results.data).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-medium">{key}:</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Transcript */}
          {conversation.transcript && (
            <div>
              <div className="text-sm text-gray-500 mb-2">Transcript</div>
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {conversation.transcript}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 