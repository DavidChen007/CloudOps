
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PipelineWizard from './components/PipelineWizard';
import K8sExplorer from './components/K8sExplorer';
import JenkinsJobs from './components/JenkinsJobs';
import { ViewMode } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewMode>(ViewMode.Dashboard);

  const renderContent = () => {
    switch (activeView) {
      case ViewMode.Dashboard:
        return <Dashboard />;
      case ViewMode.Wizard:
        return <PipelineWizard />;
      case ViewMode.K8sExplorer:
        return <K8sExplorer />;
      case ViewMode.JenkinsJobs:
        return <JenkinsJobs onViewChange={setActiveView} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      {renderContent()}
    </Layout>
  );
};

export default App;
