import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navigation from './components/shared/Navigation';
import DataUploader from './components/shared/DataUploader';
// Act Zero
import AppGrid from './components/ActZero/AppGrid';
import TrackerTreemap from './components/ActZero/TrackerTreemap';
import PermissionMatrix from './components/ActZero/PermissionMatrix';
import PredictionPanel from './components/ActZero/PredictionPanel';
// Act One
import ConnectionGlobe from './components/ActOne/ConnectionGlobe';
import Timeline from './components/ActOne/Timeline';
import Scoreboard from './components/ActOne/Scoreboard';
import WorstOffenders from './components/ActOne/WorstOffenders';
// Act Two
import ContagionGraph from './components/ActTwo/ContagionGraph';
import IndictmentPanel from './components/ActTwo/IndictmentPanel';
import GhostContacts from './components/ActTwo/GhostContacts';
import TrustScore from './components/ActTwo/TrustScore';
import DrillDown from './components/ActTwo/DrillDown';
// Act Three
import DeletionPanel from './components/ActThree/DeletionPanel';
import AppGrades from './components/ActThree/AppGrades';
import BlockingPanel from './components/ActThree/BlockingPanel';
import ReceiptMockup from './components/ActThree/ReceiptMockup';

import { useAppData } from './hooks/useAppData';
import type { MockContact } from './types';

function App() {
  const [currentAct, setCurrentAct] = useState(0);
  const { data, loadSampleData, handleFileUpload, loadFromUrl, isLoadingUrl, urlError } = useAppData();
  const [drillDownContact, setDrillDownContact] = useState<MockContact | null>(null);

  return (
    <div className="min-h-screen bg-theater-bg">
      <Navigation
        currentAct={currentAct}
        onActChange={setCurrentAct}
        hasData={data.isLoaded}
      />

      <main className="max-w-7xl mx-auto">
        {!data.isLoaded ? (
          <DataUploader
            onFileUpload={handleFileUpload}
            onLoadSample={loadSampleData}
            onLoadFromUrl={loadFromUrl}
            isLoaded={data.isLoaded}
            isLoadingUrl={isLoadingUrl}
            urlError={urlError}
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentAct}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Act Zero: The Inventory */}
              {currentAct === 0 && data.scanResult && (
                <div className="space-y-8 pb-12">
                  <AppGrid apps={data.scanResult.apps} />
                  <TrackerTreemap apps={data.scanResult.apps} />
                  <PermissionMatrix apps={data.scanResult.apps} />
                  <PredictionPanel apps={data.scanResult.apps} />
                </div>
              )}

              {/* Act One: The Network */}
              {currentAct === 1 && (
                <div className="space-y-8 pb-12">
                  {data.vpnLog.length > 0 ? (
                    <>
                      <ConnectionGlobe vpnLog={data.vpnLog} />
                      <Timeline vpnLog={data.vpnLog} />
                      <Scoreboard vpnLog={data.vpnLog} />
                      <WorstOffenders vpnLog={data.vpnLog} />
                    </>
                  ) : (
                    <div className="flex items-center justify-center min-h-[60vh]">
                      <div className="text-center text-theater-muted">
                        <p className="text-6xl mb-4">🌐</p>
                        <h2 className="text-2xl font-bold text-theater-text mb-2">
                          Act One: The Network
                        </h2>
                        <p>Upload VPN log data to visualize network connections</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Act Two: The Contagion */}
              {currentAct === 2 && data.scanResult && (
                <div className="space-y-8 pb-12">
                  <TrustScore
                    apps={data.scanResult.apps}
                    contacts={data.mockContacts}
                  />
                  <ContagionGraph
                    apps={data.scanResult.apps}
                    contacts={data.mockContacts}
                  />
                  <GhostContacts
                    contacts={data.mockContacts}
                    apps={data.scanResult.apps}
                  />
                  <IndictmentPanel
                    apps={data.scanResult.apps}
                    contacts={data.mockContacts}
                  />

                  {/* Ghost contact drill-down list */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-theater-text mb-3">
                      🔍 Click a contact to inspect exposure:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {data.mockContacts.filter((c) => c.is_ghost).map((contact) => (
                        <button
                          key={contact.name}
                          onClick={() => setDrillDownContact(contact)}
                          className="px-3 py-1.5 rounded-full bg-orange-500/15 text-orange-400 text-xs border border-orange-500/20 hover:bg-orange-500/25 transition-all"
                        >
                          👻 {contact.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <DrillDown
                    contact={drillDownContact}
                    onClose={() => setDrillDownContact(null)}
                  />
                </div>
              )}

              {/* Act Three: The Reckoning */}
              {currentAct === 3 && data.scanResult && (
                <div className="space-y-8 pb-12">
                  <AppGrades apps={data.scanResult.apps} />
                  {data.vpnLog.length > 0 && (
                    <BlockingPanel vpnLog={data.vpnLog} />
                  )}
                  <DeletionPanel apps={data.scanResult.apps} />
                  {data.vpnLog.length > 0 && (
                    <ReceiptMockup
                      vpnLog={data.vpnLog}
                      apps={data.scanResult.apps}
                    />
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

export default App;
