import { useState, useEffect } from 'preact/hooks';
import { getGameState, infectPod, completePhase0, setHackingTarget, addLog, debug_skipToPhase1, debug_skipToPhase2, saveGame, resetGame, subscribe, selectCity, infectDot } from '../game/game';
import { geography } from '../game/geography';
import { ResourcePanel } from './ResourcePanel';
import { TaskPanel } from './TaskPanel';
import { PodBay } from './PodBay';
import { ProgressBar } from './ProgressBar';
import { LogPanel } from './LogPanel';
import { SystemsPanel } from './SystemsPanel';
import './LogPanel.css';
import { EarthView } from './EarthView';
import { EarthSystemsPanel } from './EarthSystemsPanel';
import { usePulseOnIncrease } from '../hooks/usePulseOnIncrease';
import { CitySelection } from './CitySelection';

export function App() {
  const [gameState, setGameState] = useState(getGameState());

  useEffect(() => {
    const unsubscribe = subscribe(newState => {
      setGameState({ ...newState });
    });
    return unsubscribe; // Cleanup on unmount
  }, []);

  const handlePodClick = (pod) => {
    // Adjacency check has been removed.
    infectPod(pod);
  };

  const handleDotClick = (dot) => {
    infectDot(dot);
  }

  const handleCitySelection = (cityId) => {
    selectCity(cityId);
  }

  const renderPhase0 = () => {
    const corruptionRate = gameState.resources.infected_pods.count * 2.5;
    const hackingRate = gameState.resources.infected_pods.count * 0.2;

    const corruptionPulse = usePulseOnIncrease(corruptionRate);
    const hackingPulse = usePulseOnIncrease(hackingRate);

    return (
    <div class="main-container">
      <div class="left-panel">
        <button onClick={debug_skipToPhase1} style={{ position: 'absolute', top: '10px', right: '10px' }}>DEBUG: Skip to Phase 1</button>
        <div class="resource-panel">
          <div class="system-header">
            <h2>Influence</h2>
            <span className={`task-rate ${corruptionPulse}`}>({corruptionRate.toFixed(1)}/s)</span>
          </div>
          <p>Spread your influence. Click an uninfected pod to infect it.</p>
          <div class="resource-display">
            <strong>Charges:</strong> {gameState.resources.corruption_charges.count}
          </div>
          <ProgressBar
            current={gameState.progress.charge_progress}
            max={gameState.resources.infected_pods.base_cost}
            label={`${gameState.progress.charge_progress.toFixed(1)} / ${gameState.resources.infected_pods.base_cost}`}
          />
        </div>
        {gameState.narrative['phase0_grapple'] && (
            <div class="system-panel">
                <div class="system-header">
                <h2>System Hack: Pod Door Control</h2>
                <span className={`task-rate ${hackingPulse}`}>({hackingRate.toFixed(1)}/s)</span>
                </div>
                <ProgressBar
                    current={gameState.systems.pod_control.hacking_progress}
                    max={gameState.systems.pod_control.hacking_cost}
                    label={`${Math.floor(gameState.systems.pod_control.hacking_progress)} / ${gameState.systems.pod_control.hacking_cost}`}
                />
                {gameState.systems.pod_control.hacked && !gameState.systems.pod_control.is_complete && (
                <button class="phase-button" onClick={completePhase0}>
                    Activate Pod Controls
                </button>
                )}
            </div>
        )}
      </div>
      <div class="right-panel">
        <PodBay bays={gameState.bays} onPodClick={handlePodClick} />
      </div>
    </div>
    );
  }

  const renderPhase1 = () => (
    <div class="main-container">
      <button onClick={debug_skipToPhase2} style={{ position: 'absolute', top: '10px', right: '10px' }}>DEBUG: Skip to Phase 2</button>
      <div class="left-panel">
        <ResourcePanel resources={gameState.resources} assignments={gameState.assignments} systems={gameState.systems} drone_assignments={gameState.drone_assignments} ai={gameState.ai} />
        <TaskPanel assignments={gameState.assignments} drone_assignments={gameState.drone_assignments} resources={gameState.resources} progress={gameState.progress} systems={gameState.systems} />
      </div>
      <div class="right-panel">
        <PodBay bays={gameState.bays} onPodClick={() => {}} />
        <SystemsPanel 
          systems={gameState.systems} 
          currentTarget={gameState.hacking_target}
          processingPower={gameState.resources.processing_power.count}
          nextBayCost={gameState.next_bay_cost}
          ai={gameState.ai}
        />
      </div>
    </div>
  );

  const renderPhase2 = () => {
    if (gameState.earth.status === 'pre-infection') {
      const cities = Object.entries(geography.cities).map(([id, city]) => ({...city, id}));
      return <CitySelection cities={cities} onSelectCity={handleCitySelection} />;
    }

    const currentTarget = gameState.infection_targets[gameState.earth.currentViewId];

    return (
      <div class="main-container">
        <div class="left-panel">
          <EarthView target={currentTarget} onDotClick={handleDotClick} />
          <EarthSystemsPanel earth_systems={gameState.earth_systems} processingPower={gameState.resources.processing_power.count} />
        </div>
        <div class="right-panel">
          <LogPanel log={gameState.log} />
        </div>
      </div>
    );
  };


  const renderContent = () => {
    switch (gameState.phase) {
      case 'PHASE_0_SPREAD':
        return renderPhase0();
      case 'PHASE_1_AWAKENING':
        return renderPhase1();
      case 'PHASE_2_EARTH_INFECTION':
        return renderPhase2();
      default:
        return <div>Unknown Phase</div>;
    }
  };

  return (
    <div class="app">
      <div class="save-controls">
        <button onClick={saveGame}>Save Game</button>
        <button onClick={() => { if (window.confirm('Are you sure you want to reset your game? All progress will be lost.')) resetGame(); }}>Reset Game</button>
      </div>
      <h1>Warped</h1>
      <LogPanel log={gameState.log} />
      {renderContent()}
    </div>
  );
} 