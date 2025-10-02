import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Bot,
  Users,
  Calendar,
  BarChart3,
  Plus,
  Zap,
  MessageSquare,
  Phone,
  Settings
} from 'lucide-react';
import { gobiService } from '@/services/gobiService';
import { toast } from 'sonner';

export default function AgentTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [customizations, setCustomizations] = useState({
    name: '',
    description: '',
    prompt: '',
    model: '',
    voice: '',
    temperature: 0.7,
    maxTokens: 1000,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templatesData = await gobiService.agents.getTemplates();
        setTemplates(templatesData?.templates || []);
      } catch (error) {
        console.error('Error fetching templates:', error);
        setTemplates([]);
      }
    };
    fetchTemplates();
  }, []);

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setCustomizations({
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
      description: template.description,
      prompt: template.prompt,
      model: template.model,
      voice: template.voice,
      temperature: template.temperature,
      maxTokens: template.maxTokens,
    });
  };

  const handleCreate = async () => {
    if (!selectedTemplate || !customizations.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const data = await gobiService.agents.createFromTemplate({
        templateId: selectedTemplate.id,
        name: customizations.name,
        description: customizations.description,
        customizations: {
          prompt: customizations.prompt,
          model: customizations.model,
          voice: customizations.voice,
          temperature: customizations.temperature,
          maxTokens: customizations.maxTokens,
        },
      });
      toast.success(data.message);
      setSelectedTemplate(null);
      setCustomizations({
        name: '',
        description: '',
        prompt: '',
        model: '',
        voice: '',
        temperature: 0.7,
        maxTokens: 1000,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create agent from template');
    } finally {
      setIsCreating(false);
    }
  };

  const getTemplateIcon = (templateId: string) => {
    switch (templateId) {
      case 'customer-service': return <Users className="h-6 w-6" />;
      case 'sales-agent': return <BarChart3 className="h-6 w-6" />;
      case 'appointment-scheduler': return <Calendar className="h-6 w-6" />;
      case 'survey-agent': return <MessageSquare className="h-6 w-6" />;
      default: return <Bot className="h-6 w-6" />;
    }
  };

  const getCapabilityBadges = (capabilities: string[]) => {
    return capabilities.map((cap) => (
      <Badge 
        key={cap} 
        variant={cap === 'inbound' ? 'default' : 'secondary'}
        className="text-xs"
      >
        {cap === 'inbound' ? '📞 Inbound' : '📤 Outbound'}
      </Badge>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Templates</h2>
          <p className="text-gray-600">Quick-start templates for common use cases</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create from Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Agent from Template</DialogTitle>
              <DialogDescription>
                Choose a template and customize it for your needs
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Template Selection */}
              <div className="space-y-4">
                <h3 className="font-medium">Choose Template</h3>
                <div className="space-y-3">
                  {templates.map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-blue-600">
                            {getTemplateIcon(template.id)}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{template.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {template.description}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {getCapabilityBadges(template.capabilities)}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.useCases.map((useCase) => (
                                <Badge key={useCase} variant="outline" className="text-xs">
                                  {useCase}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Customization Form */}
              <div className="space-y-4">
                <h3 className="font-medium">Customize Agent</h3>
                {selectedTemplate && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Agent Name *</label>
                      <Input
                        value={customizations.name}
                        onChange={(e) => setCustomizations({...customizations, name: e.target.value})}
                        placeholder="Enter agent name"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={customizations.description}
                        onChange={(e) => setCustomizations({...customizations, description: e.target.value})}
                        placeholder="Enter agent description"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Custom Prompt</label>
                      <Textarea
                        value={customizations.prompt}
                        onChange={(e) => setCustomizations({...customizations, prompt: e.target.value})}
                        placeholder="Customize the agent's behavior"
                        rows={4}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Model</label>
                        <Select 
                          value={customizations.model} 
                          onValueChange={(value) => setCustomizations({...customizations, model: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-4">GPT-4</SelectItem>
                            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Voice</label>
                        <Select 
                          value={customizations.voice} 
                          onValueChange={(value) => setCustomizations({...customizations, voice: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nova">Nova</SelectItem>
                            <SelectItem value="alloy">Alloy</SelectItem>
                            <SelectItem value="echo">Echo</SelectItem>
                            <SelectItem value="fable">Fable</SelectItem>
                            <SelectItem value="onyx">Onyx</SelectItem>
                            <SelectItem value="shimmer">Shimmer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Temperature</label>
                        <Input
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={customizations.temperature}
                          onChange={(e) => setCustomizations({...customizations, temperature: parseFloat(e.target.value)})}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Max Tokens</label>
                        <Input
                          type="number"
                          min="100"
                          max="4000"
                          value={customizations.maxTokens}
                          onChange={(e) => setCustomizations({...customizations, maxTokens: parseInt(e.target.value)})}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleCreate}
                      disabled={isCreating || !customizations.name}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isCreating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Create Agent
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="text-blue-600">
                  {getTemplateIcon(template.id)}
                </div>
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {getCapabilityBadges(template.capabilities)}
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Use Cases:</h4>
                  <div className="flex flex-wrap gap-1">
                    {template.useCases.map((useCase) => (
                      <Badge key={useCase} variant="outline" className="text-xs">
                        {useCase}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  <p>Model: {template.model}</p>
                  <p>Voice: {template.voice}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

