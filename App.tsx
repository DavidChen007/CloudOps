
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PipelineWizard from './components/PipelineWizard';
import K8sExplorer from './components/K8sExplorer';
import JenkinsJobs from './components/JenkinsJobs';
import GitCredentials from './components/GitCredentials';
import { ViewMode } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewMode>(ViewMode.Dashboard);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  const handleViewChange = (view: ViewMode, jobId?: string) => {
    setActiveView(view);
    if (view === ViewMode.Wizard && jobId) {
      setEditingJobId(jobId);
    } else if (view !== ViewMode.Wizard) {
      setEditingJobId(null);
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case ViewMode.Dashboard:
        return <Dashboard />;
      case ViewMode.Wizard:
        return <PipelineWizard editingJobId={editingJobId} onBack={() => handleViewChange(ViewMode.JenkinsJobs)} />;
      case ViewMode.K8sExplorer:
        return <K8sExplorer />;
      case ViewMode.JenkinsJobs:
        return <JenkinsJobs onViewChange={handleViewChange} />;
      case ViewMode.GitCredentials:
        return <GitCredentials />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeView={activeView} onViewChange={handleViewChange}>
      {renderContent()}
    </Layout>
  );
};

export default App;

