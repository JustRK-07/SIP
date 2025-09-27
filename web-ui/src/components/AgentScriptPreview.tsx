import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/utils/api";
import { Loader2, FileCode, Download, Copy, Check, Rocket, Sun, Moon, Edit3, Save } from "lucide-react";

interface AgentScriptPreviewProps {
  agent: {
    id: string;
    name: string;
    model: string;
    voice: string;
    temperature: number;
    prompt: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onDeploy?: () => void;
}

export function AgentScriptPreview({ agent, isOpen, onClose, onDeploy }: AgentScriptPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Fetch script preview
  const { data: preview, isLoading, error } = api.agents.previewScript.useQuery(
    { id: agent.id },
    { enabled: isOpen && !!agent.id }
  );

  // Initialize edited script when preview loads
  useEffect(() => {
    if (preview?.script) {
      setEditedScript(preview.script);
      setHasChanges(false);
    }
  }, [preview?.script]);

  const handleCopyScript = async () => {
    const scriptToCopy = isEditing ? editedScript : (preview?.script || '');
    if (scriptToCopy) {
      await navigator.clipboard.writeText(scriptToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadScript = () => {
    const scriptToDownload = isEditing ? editedScript : (preview?.script || '');
    if (scriptToDownload && preview?.filename) {
      const blob = new Blob([scriptToDownload], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = preview.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleDeploy = () => {
    onClose();
    onDeploy?.();
  };

  const handleScriptChange = (value: string) => {
    setEditedScript(value);
    setHasChanges(value !== preview?.script);
  };

  const handleSaveChanges = () => {
    // TODO: Save edited script back to agent
    setIsEditing(false);
    setHasChanges(false);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Split script into lines for better rendering
  const currentScript = isEditing ? editedScript : (preview?.script || '');
  const scriptLines = currentScript.split('\n');

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl w-full max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="flex-none px-6 py-3 border-b bg-white">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-blue-600" />
              <span>Python Agent Script Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(!isEditing)}
                className="h-7 px-2"
              >
                {isEditing ? (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleTheme}
                className="h-7 w-7 p-0"
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <span className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">{preview?.filename}</span>
              {preview?.roomName && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">{preview?.roomName}</span>
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4 text-xs mt-1">
            <span><strong>Agent:</strong> {agent.name}</span>
            <span className="text-gray-400">|</span>
            <span><strong>Model:</strong> {agent.model}</span>
            <span className="text-gray-400">|</span>
            <span><strong>Voice:</strong> {agent.voice}</span>
            <span className="text-gray-400">|</span>
            <span><strong>Temperature:</strong> {agent.temperature}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-500 text-center">
                <p className="font-semibold">Failed to generate script preview</p>
                <p className="text-sm mt-1">{error.message}</p>
              </div>
            </div>
          ) : currentScript ? (
            isEditing ? (
              // Editable mode
              <div className={`h-full flex ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                {/* Line numbers column */}
                <div className={`w-14 flex-shrink-0 overflow-y-auto ${
                  isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'
                }`}>
                  <div className="py-3 px-2">
                    {scriptLines.map((_, index) => (
                      <div key={index} className="text-xs font-mono text-right leading-5">
                        {index + 1}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Editable textarea */}
                <div className="flex-1 relative">
                  <textarea
                    value={editedScript}
                    onChange={(e) => handleScriptChange(e.target.value)}
                    className={`absolute inset-0 w-full h-full py-3 px-4 font-mono text-xs leading-5 resize-none focus:outline-none ${
                      isDarkMode 
                        ? 'bg-gray-900 text-gray-100 caret-white' 
                        : 'bg-white text-gray-900 caret-black'
                    }`}
                    style={{ lineHeight: '1.25rem' }}
                    spellCheck={false}
                  />
                </div>
              </div>
            ) : (
              // Read-only mode with theme support
              <div className={`h-full flex ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                {/* Line numbers column */}
                <div className={`w-14 flex-shrink-0 overflow-y-auto ${
                  isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'
                }`}>
                  <div className="py-3 px-2">
                    {scriptLines.map((_, index) => (
                      <div key={index} className="text-xs font-mono text-right leading-5">
                        {index + 1}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Code content */}
                <div className="flex-1 overflow-auto">
                  <div className="py-3 px-4">
                    {scriptLines.map((line, index) => (
                      <div 
                        key={index} 
                        className={`text-xs font-mono leading-5 ${
                          isDarkMode 
                            ? 'text-gray-100 hover:bg-gray-800/30' 
                            : 'text-gray-900 hover:bg-gray-100'
                        }`}
                        style={{ whiteSpace: 'pre' }}
                      >
                        {line || '\u00A0'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : null}
        </div>

        <div className="flex-none flex justify-between items-center px-6 py-3 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyScript}
              disabled={!currentScript}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy Script
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadScript}
              disabled={!currentScript}
              className="flex items-center gap-2"
            >
              <Download className="h-3 w-3" />
              Download
            </Button>
            {hasChanges && (
              <span className="text-xs text-amber-600 ml-2">
                • Unsaved changes
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {isEditing && hasChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditedScript(preview?.script || '');
                  setHasChanges(false);
                }}
                className="text-gray-600"
              >
                Discard Changes
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleDeploy}
              size="sm"
              disabled={!currentScript}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Rocket className="h-3 w-3" />
              {hasChanges ? 'Deploy with Changes' : 'Deploy to LiveKit Cloud'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}