import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { 
  Settings as SettingsIcon,
  Phone
} from "lucide-react";

// Import the existing components
import SettingsContent from "@/components/SettingsContent";
import SipSettingsContent from "@/components/SipSettingsContent";

export default function Settings() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"general" | "sip">("general");

  // Handle URL parameters for tab switching
  useEffect(() => {
    if (router.isReady) {
      const tab = router.query.tab as string;
      
      if (tab === "sip") {
        setActiveTab("sip");
      } else {
        setActiveTab("general");
      }
    }
  }, [router.isReady, router.query]);

  // Handle tab switching with URL updates
  const handleTabChange = (tab: "general" | "sip") => {
    setActiveTab(tab);
    const query = { ...router.query };
    if (tab === "general") {
      delete query.tab;
    } else {
      query.tab = tab;
    }
    router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Manage your application settings and configurations</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => handleTabChange("general")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "general"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <SettingsIcon className="h-4 w-4" />
                  <span>General Settings</span>
                </div>
              </button>
              <button
                onClick={() => handleTabChange("sip")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "sip"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>SIP & Telephony</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === "general" && <SettingsContent />}
          {activeTab === "sip" && <SipSettingsContent />}
        </div>
      </div>
    </div>
  );
}