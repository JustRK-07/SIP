import { useState } from 'react';
import { api } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function SipSettingsContent() {
  const [twilioConfig, setTwilioConfig] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    sipTrunkSid: '',
  });

  const [livekitConfig, setLivekitConfig] = useState({
    apiEndpoint: '',
    apiKey: '',
    apiSecret: '',
    sipTrunkId: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const saveTwilioConfig = api.settings.saveTwilioConfig.useMutation({
    onSuccess: () => {
      toast.success('Twilio configuration saved successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to save Twilio config: ${error.message}`);
    },
  });

  const saveLivekitConfig = api.settings.saveLivekitConfig.useMutation({
    onSuccess: () => {
      toast.success('LiveKit configuration saved successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to save LiveKit config: ${error.message}`);
    },
  });

  const testConnection = api.settings.testConnection.useMutation({
    onSuccess: (data) => {
      toast.success(`Connection test successful: ${data.message}`);
    },
    onError: (error) => {
      toast.error(`Connection test failed: ${error.message}`);
    },
  });

  const handleSaveTwilio = async () => {
    setIsLoading(true);
    try {
      await saveTwilioConfig.mutateAsync(twilioConfig);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLivekit = async () => {
    setIsLoading(true);
    try {
      await saveLivekitConfig.mutateAsync(livekitConfig);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      await testConnection.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Header Controls */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SIP & Telephony Settings</h2>
          <p className="text-gray-600">Configure Twilio and LiveKit for real phone calls</p>
        </div>
        <Button 
          onClick={handleTestConnection} 
          disabled={isLoading}
          variant="outline"
        >
          Test Connection
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Twilio Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Twilio Configuration</CardTitle>
            <CardDescription>
              Configure your Twilio account for SIP trunking and phone numbers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="twilio-account-sid">Account SID</Label>
              <Input
                id="twilio-account-sid"
                type="password"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={twilioConfig.accountSid}
                onChange={(e) => setTwilioConfig(prev => ({ ...prev, accountSid: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="twilio-auth-token">Auth Token</Label>
              <Input
                id="twilio-auth-token"
                type="password"
                placeholder="Your Twilio Auth Token"
                value={twilioConfig.authToken}
                onChange={(e) => setTwilioConfig(prev => ({ ...prev, authToken: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="twilio-phone">Phone Number</Label>
              <Input
                id="twilio-phone"
                type="tel"
                placeholder="+1234567890"
                value={twilioConfig.phoneNumber}
                onChange={(e) => setTwilioConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="twilio-sip-trunk">SIP Trunk SID</Label>
              <Input
                id="twilio-sip-trunk"
                placeholder="TKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={twilioConfig.sipTrunkSid}
                onChange={(e) => setTwilioConfig(prev => ({ ...prev, sipTrunkSid: e.target.value }))}
              />
            </div>
            
            <Button 
              onClick={handleSaveTwilio} 
              disabled={isLoading}
              className="w-full"
            >
              Save Twilio Configuration
            </Button>
          </CardContent>
        </Card>

        {/* LiveKit Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>LiveKit Configuration</CardTitle>
            <CardDescription>
              Configure LiveKit for real-time communication and SIP integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="livekit-endpoint">API Endpoint</Label>
              <Input
                id="livekit-endpoint"
                placeholder="wss://your-project.livekit.cloud"
                value={livekitConfig.apiEndpoint}
                onChange={(e) => setLivekitConfig(prev => ({ ...prev, apiEndpoint: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="livekit-api-key">API Key</Label>
              <Input
                id="livekit-api-key"
                type="password"
                placeholder="Your LiveKit API Key"
                value={livekitConfig.apiKey}
                onChange={(e) => setLivekitConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="livekit-api-secret">API Secret</Label>
              <Input
                id="livekit-api-secret"
                type="password"
                placeholder="Your LiveKit API Secret"
                value={livekitConfig.apiSecret}
                onChange={(e) => setLivekitConfig(prev => ({ ...prev, apiSecret: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="livekit-sip-trunk">SIP Trunk ID</Label>
              <Input
                id="livekit-sip-trunk"
                placeholder="Your LiveKit SIP Trunk ID"
                value={livekitConfig.sipTrunkId}
                onChange={(e) => setLivekitConfig(prev => ({ ...prev, sipTrunkId: e.target.value }))}
              />
            </div>
            
            <Button 
              onClick={handleSaveLivekit} 
              disabled={isLoading}
              className="w-full"
            >
              Save LiveKit Configuration
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Setup Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Follow these steps to set up real phone calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium">Twilio Setup</h4>
                <p className="text-sm text-muted-foreground">
                  Create a Twilio account and purchase a phone number. Set up a SIP trunk for outbound calls.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium">LiveKit SIP Configuration</h4>
                <p className="text-sm text-muted-foreground">
                  Configure your LiveKit project with SIP trunking enabled. Get your SIP trunk ID from LiveKit dashboard.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium">Test Connection</h4>
                <p className="text-sm text-muted-foreground">
                  Use the "Test Connection" button to verify your configuration is working correctly.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                4
              </div>
              <div>
                <h4 className="font-medium">Create Campaign</h4>
                <p className="text-sm text-muted-foreground">
                  Go to the campaigns page and create a new campaign with real phone numbers to start making calls.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
