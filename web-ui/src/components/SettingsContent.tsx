import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AiOutlineApi, AiOutlineEye, AiOutlineEyeInvisible, AiOutlineCopy, AiOutlineCheck, AiOutlineRobot } from "react-icons/ai";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type WebEnvInfo = {
  web: {
    nodeEnv: string;
    databaseUrl: string;
    livekitApiEndpoint: string;
    livekitApiKey: string;
    livekitApiSecret: string;
    livekitSipTrunkId: string;
  };
  sensitiveKeys: string[];
};

type AgentEnvInfo = {
  agentEnv: {
    OPENAI_API_KEY: string;
    OPENAI_MODEL: string;
    OPENAI_TEMPERATURE: string;
    OPENAI_MAX_TOKENS: string;
    [key: string]: string;
  };
  sensitiveKeys: string[];
};

export default function SettingsContent() {
  const [webEnvInfo, setWebEnvInfo] = useState<WebEnvInfo | null>(null);
  const [agentEnvInfo, setAgentEnvInfo] = useState<AgentEnvInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [showAllSecrets, setShowAllSecrets] = useState(false);

  useEffect(() => {
    const fetchEnvInfo = async () => {
      try {
        setIsLoading(true);
        
        // Fetch web environment variables
        const webResponse = await fetch("/api/settings/env");
        if (!webResponse.ok) {
          throw new Error("Failed to fetch web environment info");
        }
        const webData = await webResponse.json();
        setWebEnvInfo(webData);

        // Fetch agent environment variables
        const agentResponse = await fetch("/api/settings/agent-env");
        if (!agentResponse.ok) {
          throw new Error("Failed to fetch agent environment info");
        }
        const agentData = await agentResponse.json();
        setAgentEnvInfo(agentData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchEnvInfo();
  }, []);

  const toggleVisibility = (key: string) => {
    setVisibleSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const copyToClipboard = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      toast.success("Copied to clipboard!");
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const formatValue = (section: string, key: string, value: string, sensitiveKeys: string[]) => {
    const fullKey = `${section}.${key}`;
    if (!sensitiveKeys.includes(key)) return value || "Not set";
    if (!value) return "Not set";
    
    // If showAllSecrets is true, show the value
    if (showAllSecrets) return value;
    
    // Otherwise, use individual visibility toggle
    return visibleSecrets[fullKey] ? value : "••••••••••••••••";
  };

  const renderEnvSection = (
    title: string,
    section: string,
    variables: Record<string, string> | undefined,
    sensitiveKeys: string[],
    icon: React.ReactNode
  ) => {
    if (!variables) return null;

    return (
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              {icon}
            </div>
            <CardTitle className="text-lg text-slate-800 dark:text-slate-100">{title}</CardTitle>
          </div>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Environment variables for {title.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {Object.entries(variables).map(([key, value]) => {
              const fullKey = `${section}.${key}`;
              const formattedValue = formatValue(section, key, value, sensitiveKeys);
              const isSensitive = sensitiveKeys.includes(key);
              const displayName = key
                .replace(/([A-Z])/g, ' $1')
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');

              return (
                <div
                  key={key}
                  className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-4"
                >
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100">{displayName}</h3>
                    <div className="flex items-center space-x-2">
                      {isSensitive && !showAllSecrets && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleVisibility(fullKey)}
                          className="h-8 w-8 p-0"
                        >
                          {visibleSecrets[fullKey] ? (
                            <AiOutlineEyeInvisible className="h-4 w-4" />
                          ) : (
                            <AiOutlineEye className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(fullKey, value)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedStates[fullKey] ? (
                          <AiOutlineCheck className="h-4 w-4 text-green-500" />
                        ) : (
                          <AiOutlineCopy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm font-mono text-slate-600 dark:text-slate-400 break-all">
                    {formattedValue}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      {/* Header Controls */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">General Settings</h2>
          <p className="text-gray-600">Manage your application settings and configurations</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllSecrets(!showAllSecrets)}
            className="flex items-center space-x-2"
          >
            {showAllSecrets ? (
              <AiOutlineEyeInvisible className="h-4 w-4" />
            ) : (
              <AiOutlineEye className="h-4 w-4" />
            )}
            <span>{showAllSecrets ? "Hide" : "Show"} All Secrets</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="text-center py-4 text-slate-600 dark:text-slate-400">
            Loading environment information...
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : (
          <>
            {renderEnvSection(
              "Web Configuration",
              "web",
              webEnvInfo?.web,
              webEnvInfo?.sensitiveKeys || [],
              <AiOutlineApi className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            )}
            {renderEnvSection(
              "Agent Configuration",
              "agent",
              agentEnvInfo?.agentEnv,
              agentEnvInfo?.sensitiveKeys || [],
              <AiOutlineRobot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
