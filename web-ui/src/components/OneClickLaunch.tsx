import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Phone, MessageSquare, Zap, ExternalLink, Play, Pause } from 'lucide-react';
import { api } from '@/utils/api';
import { toast } from 'sonner';

interface OneClickLaunchProps {
  agent: {
    id: string;
    name: string;
    status: string;
    phoneNumber?: {
      id: string;
      number: string;
      callDirection: string;
    } | null;
  };
  onLaunch?: (result: any) => void;
}

export default function OneClickLaunch({ agent, onLaunch }: OneClickLaunchProps) {
  const [testMode, setTestMode] = useState<'chat' | 'voice' | 'both'>('chat');
  const [autoAssignNumber, setAutoAssignNumber] = useState(false);
  const [selectedNumberId, setSelectedNumberId] = useState<string>('');
  const [isLaunching, setIsLaunching] = useState(false);

  // Fetch available phone numbers
  const { data: availableNumbers } = api.numbers.getAll.useQuery();

  // One-click launch mutation
  const oneClickLaunchMutation = api.agents.oneClickLaunch.useMutation({
    onSuccess: (data) => {
      setIsLaunching(false);
      toast.success(data.message);
      if (onLaunch) {
        onLaunch(data);
      }
    },
    onError: (error) => {
      setIsLaunching(false);
      toast.error(error.message);
    },
  });

  const handleLaunch = () => {
    setIsLaunching(true);
    oneClickLaunchMutation.mutate({
      id: agent.id,
      testMode,
      autoAssignNumber,
      phoneNumberId: autoAssignNumber && selectedNumberId ? selectedNumberId : undefined,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-gray-100 text-gray-800';
      case 'DEPLOYING': return 'bg-yellow-100 text-yellow-800';
      case 'ERROR': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              One-Click Launch
            </CardTitle>
            <CardDescription>
              Deploy and test your agent instantly
            </CardDescription>
          </div>
          <Badge className={getStatusColor(agent.status)}>
            {agent.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Agent Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900">{agent.name}</h4>
          {agent.phoneNumber && (
            <p className="text-sm text-gray-600 mt-1">
              📞 {agent.phoneNumber.number} ({agent.phoneNumber.callDirection})
            </p>
          )}
        </div>

        {/* Test Mode Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Test Mode</label>
          <Select value={testMode} onValueChange={(value: any) => setTestMode(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chat">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat Only
                </div>
              </SelectItem>
              <SelectItem value="voice">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Voice Only
                </div>
              </SelectItem>
              <SelectItem value="both">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Both Chat & Voice
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Phone Number Assignment */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="auto-assign" 
              checked={autoAssignNumber}
              onCheckedChange={(checked) => setAutoAssignNumber(checked as boolean)}
            />
            <label htmlFor="auto-assign" className="text-sm font-medium">
              Auto-assign phone number
            </label>
          </div>
          
          {autoAssignNumber && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Number</label>
              <Select value={selectedNumberId} onValueChange={setSelectedNumberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a phone number" />
                </SelectTrigger>
                <SelectContent>
                  {availableNumbers?.filter(num => num.status === 'AVAILABLE').map((number) => (
                    <SelectItem key={number.id} value={number.id}>
                      {number.number} - {number.friendlyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Launch Button */}
        <Button 
          onClick={handleLaunch}
          disabled={isLaunching || agent.status === 'DEPLOYING'}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isLaunching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Launching...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Launch & Test Agent
            </>
          )}
        </Button>

        {/* Quick Actions */}
        {agent.status === 'ACTIVE' && (
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`/ai-agent?room=agent-${agent.id}&mode=chat`, '_blank')}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat Test
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`/ai-agent?room=agent-${agent.id}&mode=voice`, '_blank')}
            >
              <Phone className="h-4 w-4 mr-1" />
              Voice Test
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

