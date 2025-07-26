import { memo } from 'react';
import { assignInfected, unassignInfected, assignDrone, unassignDrone } from '../game/game';
import { ProgressBar } from './ProgressBar';
import { usePulseOnIncrease } from '../hooks/usePulseOnIncrease';
import { Tooltip } from './Tooltip';
import './TaskPanel.css';

export const TaskPanel = memo(function TaskPanel({ assignments, drone_assignments, resources, progress, systems }) {
  const unassignedInfected = resources.awakened_infected.count - (assignments.infect + assignments.awaken + assignments.hack + assignments.assemble);
  const unassignedDrones = resources.drones.count - (drone_assignments.infect + drone_assignments.awaken + drone_assignments.hack + drone_assignments.assemble);

  // Calculate base work rate with upgrades
  let workRate = resources.awakened_infected.work_rate;
  const neuralAmpUpgrade = systems.stasis_network.upgrades.neural_amplifiers;
    if (neuralAmpUpgrade.level > 0) {
        for (let i = 0; i < neuralAmpUpgrade.level; i++) {
            workRate += neuralAmpUpgrade.bonus[i];
        }
    }

  const infectionCost = 50;
  
  let baseInfectionRate = 0;
  if (systems.stasis_network.upgrades.viral_propagation.unlocked) {
    let passiveRate = 0.5;
    if (systems.stasis_network.upgrades.viral_synergy.unlocked) {
      passiveRate = 5; // New base rate for synergy
      if (systems.navigation.upgrades.hyperspeed_propagation.unlocked) {
        passiveRate = 20; // Hyperspeed rate
      }
    }
    baseInfectionRate += passiveRate;
  }
  baseInfectionRate += assignments.infect * workRate;
  const totalInfectionRate = baseInfectionRate * Math.pow(1.1, drone_assignments.infect);
  
  let awakeningCost = resources.awakened_infected.base_cost * Math.pow(resources.awakened_infected.cost_multiplier, resources.awakened_infected.count);
  const reanimationUpgrade = systems.navigation.upgrades.reanimation_protocols;
  if (reanimationUpgrade.level > 0) {
    awakeningCost *= Math.pow(0.5, reanimationUpgrade.level); // Apply 50% reduction for each level
  }
  const awakeningRate = assignments.awaken * workRate * Math.pow(1.1, drone_assignments.awaken);
  
  const passiveHackingRate = resources.infected_pods.count * 0.1;
  const activeHackingRate = assignments.hack * workRate;
  const totalHackingRate = (passiveHackingRate + activeHackingRate) * Math.pow(1.1, drone_assignments.hack);


  let assemblyWorkRate = workRate;
  if (systems.drone_control.upgrades.manufacturing_speed.unlocked) {
    assemblyWorkRate += 1.0;
  }
  const droneCost = resources.drones.base_cost * Math.pow(resources.drones.cost_multiplier, resources.drones.count);
  const assemblyRate = assignments.assemble * assemblyWorkRate * Math.pow(1.1, drone_assignments.assemble);


  // Individual work rate calculations
  const infectWork = assignments.infect * workRate;
  const infectDroneWork = (baseInfectionRate * Math.pow(1.1, drone_assignments.infect)) - baseInfectionRate;
  const awakenWork = assignments.awaken * workRate;
  const awakenDroneWork = (awakeningRate) - awakenWork;
  const hackWork = activeHackingRate;
  const hackDroneWork = (totalHackingRate) - (passiveHackingRate + activeHackingRate);
  const assembleWork = assignments.assemble * assemblyWorkRate;
  const assembleDroneWork = (assemblyRate) - assembleWork;

  const infectionPulse = usePulseOnIncrease(totalInfectionRate);
  const awakeningPulse = usePulseOnIncrease(awakeningRate);
  const hackingPulse = usePulseOnIncrease(totalHackingRate);
  const assemblyPulse = usePulseOnIncrease(assemblyRate);

  // --- Tooltip Text Generation ---
  let infectionTooltipText = '';
  if (systems.stasis_network.upgrades.viral_propagation.unlocked) {
    let passiveRate = 0.5;
    if (systems.navigation.upgrades.hyperspeed_propagation.unlocked) {
        passiveRate = 20;
    } else if (systems.stasis_network.upgrades.viral_synergy.unlocked) {
      passiveRate = 5;
    }
    infectionTooltipText += `Viral Propagation: +${passiveRate.toFixed(1)}/s`;
  }

  let hackingTooltipText = '';
  if (passiveHackingRate > 0) {
    hackingTooltipText += `Slumbering Infected: +${passiveHackingRate.toFixed(1)}/s`;
  }

  return (
    <div class="task-panel">
      <h2>Assignments</h2>
      <div class="unassigned-workers">
        <span>Available Awakened: {unassignedInfected}</span>
        {systems.drone_control.hacked && <span>Available Drones: {unassignedDrones}</span>}
      </div>

      <div class="task-card">
        <div class="task-header">
          <span>Infect Pods</span>
          <Tooltip text={infectionTooltipText}>
            <span className={`task-rate ${infectionPulse}`}>{totalInfectionRate.toFixed(1)}/s</span>
          </Tooltip>
        </div>
        <ProgressBar
          current={progress.infection}
          max={infectionCost}
          label={`${progress.infection.toFixed(1)} / ${infectionCost.toFixed(0)}`}
        />
        <div className="assignment-control-panel">
            <div className="task-buttons">
                <button onClick={() => unassignInfected('infect', assignments.infect)} disabled={assignments.infect <= 0}>--</button>
                <button onClick={() => unassignInfected('infect')} disabled={assignments.infect <= 0}>-</button>
            </div>
            <div className="assignment-center">
                <span className="assignment-label">Awakened: {assignments.infect}</span>
                <span className="assignment-contribution">({infectWork.toFixed(1)}/s)</span>
            </div>
            <div className="task-buttons">
                <button onClick={() => assignInfected('infect')} disabled={unassignedInfected <= 0}>+</button>
                <button onClick={() => assignInfected('infect', unassignedInfected)} disabled={unassignedInfected <= 0}>++</button>
            </div>
        </div>
        {systems.drone_control.hacked && (
            <div className="assignment-control-panel">
                <div className="task-buttons">
                    <button onClick={() => unassignDrone('infect', drone_assignments.infect)} disabled={drone_assignments.infect <= 0}>--</button>
                    <button onClick={() => unassignDrone('infect')} disabled={drone_assignments.infect <= 0}>-</button>
                </div>
                <div className="assignment-center">
                    <span className="assignment-label">Drones: {drone_assignments.infect}</span>
                    <span className="assignment-contribution">({infectDroneWork.toFixed(1)}/s)</span>
                </div>
                <div className="task-buttons">
                    <button onClick={() => assignDrone('infect')} disabled={unassignedDrones <= 0}>+</button>
                    <button onClick={() => assignDrone('infect', unassignedDrones)} disabled={unassignedDrones <= 0}>++</button>
                </div>
            </div>
        )}
      </div>

      <div class="task-card">
        <div class="task-header">
          <span>Awaken Infected</span>
          <span className={`task-rate ${awakeningPulse}`}>{awakeningRate.toFixed(1)}/s</span>
        </div>
        <ProgressBar
            current={progress.awakening}
            max={awakeningCost}
            label={`${progress.awakening.toFixed(1)} / ${awakeningCost.toFixed(0)}`}
        />
        <div className="assignment-control-panel">
            <div className="task-buttons">
                <button onClick={() => unassignInfected('awaken', assignments.awaken)} disabled={assignments.awaken <= 0}>--</button>
                <button onClick={() => unassignInfected('awaken')} disabled={assignments.awaken <= 0}>-</button>
            </div>
            <div className="assignment-center">
                <span className="assignment-label">Awakened: {assignments.awaken}</span>
                <span className="assignment-contribution">({awakenWork.toFixed(1)}/s)</span>
            </div>
            <div className="task-buttons">
                <button onClick={() => assignInfected('awaken')} disabled={unassignedInfected <= 0 || resources.infected_pods.count <= 0}>+</button>
                <button onClick={() => assignInfected('awaken', unassignedInfected)} disabled={unassignedInfected <= 0 || resources.infected_pods.count <= 0}>++</button>
            </div>
        </div>
        {systems.drone_control.hacked && (
            <div className="assignment-control-panel">
                <div className="task-buttons">
                    <button onClick={() => unassignDrone('awaken', drone_assignments.awaken)} disabled={drone_assignments.awaken <= 0}>--</button>
                    <button onClick={() => unassignDrone('awaken')} disabled={drone_assignments.awaken <= 0}>-</button>
                </div>
                <div className="assignment-center">
                    <span className="assignment-label">Drones: {drone_assignments.awaken}</span>
                    <span className="assignment-contribution">({awakenDroneWork.toFixed(1)}/s)</span>
                </div>
                <div className="task-buttons">
                    <button onClick={() => assignDrone('awaken')} disabled={unassignedDrones <= 0}>+</button>
                    <button onClick={() => assignDrone('awaken', unassignedDrones)} disabled={unassignedDrones <= 0}>++</button>
                </div>
            </div>
        )}
      </div>

      <div class="task-card">
        <div class="task-header">
          <span>Hack Systems</span>
           <Tooltip text={hackingTooltipText}>
            <span className={`task-rate ${hackingPulse}`}>{totalHackingRate.toFixed(1)}/s</span>
          </Tooltip>
        </div>
        <div className="assignment-control-panel">
            <div className="task-buttons">
                <button onClick={() => unassignInfected('hack', assignments.hack)} disabled={assignments.hack <= 0}>--</button>
                <button onClick={() => unassignInfected('hack')} disabled={assignments.hack <= 0}>-</button>
            </div>
            <div className="assignment-center">
                <span className="assignment-label">Awakened: {assignments.hack}</span>
                <span className="assignment-contribution">({hackWork.toFixed(1)}/s)</span>
            </div>
            <div className="task-buttons">
                <button onClick={() => assignInfected('hack')} disabled={unassignedInfected <= 0}>+</button>
                <button onClick={() => assignInfected('hack', unassignedInfected)} disabled={unassignedInfected <= 0}>++</button>
            </div>
        </div>
        {systems.drone_control.hacked && (
            <div className="assignment-control-panel">
                <div className="task-buttons">
                    <button onClick={() => unassignDrone('hack', drone_assignments.hack)} disabled={drone_assignments.hack <= 0}>--</button>
                    <button onClick={() => unassignDrone('hack')} disabled={drone_assignments.hack <= 0}>-</button>
                </div>
                <div className="assignment-center">
                    <span className="assignment-label">Drones: {drone_assignments.hack}</span>
                    <span className="assignment-contribution">({hackDroneWork.toFixed(1)}/s)</span>
                </div>
                <div className="task-buttons">
                    <button onClick={() => assignDrone('hack')} disabled={unassignedDrones <= 0}>+</button>
                    <button onClick={() => assignDrone('hack', unassignedDrones)} disabled={unassignedDrones <= 0}>++</button>
                </div>
            </div>
        )}
      </div>
      
      {systems.drone_control.hacked && (
        <div class="task-card">
          <div class="task-header">
            <span>Assemble Drones</span>
            <span className={`task-rate ${assemblyPulse}`}>{assemblyRate.toFixed(1)}/s</span>
          </div>
          <ProgressBar
              current={progress.assembly}
              max={droneCost}
              label={`${progress.assembly.toFixed(1)} / ${(droneCost).toFixed(0)}`}
          />
          <div className="assignment-control-panel">
                <div className="task-buttons">
                    <button onClick={() => unassignInfected('assemble', assignments.assemble)} disabled={assignments.assemble <= 0}>--</button>
                    <button onClick={() => unassignInfected('assemble')} disabled={assignments.assemble <= 0}>-</button>
                </div>
                <div className="assignment-center">
                    <span className="assignment-label">Awakened: {assignments.assemble}</span>
                    <span className="assignment-contribution">({assembleWork.toFixed(1)}/s)</span>
                </div>
                <div className="task-buttons">
                    <button onClick={() => assignInfected('assemble')} disabled={unassignedInfected <= 0}>+</button>
                    <button onClick={() => assignInfected('assemble', unassignedInfected)} disabled={unassignedInfected <= 0}>++</button>
                </div>
            </div>
            <div className="assignment-control-panel">
                <div className="task-buttons">
                    <button onClick={() => unassignDrone('assemble', drone_assignments.assemble)} disabled={drone_assignments.assemble <= 0}>--</button>
                    <button onClick={() => unassignDrone('assemble')} disabled={drone_assignments.assemble <= 0}>-</button>
                </div>
                <div className="assignment-center">
                    <span className="assignment-label">Drones: {drone_assignments.assemble}</span>
                    <span className="assignment-contribution">({assembleDroneWork.toFixed(1)}/s)</span>
                </div>
                <div className="task-buttons">
                    <button onClick={() => assignDrone('assemble')} disabled={unassignedDrones <= 0}>+</button>
                    <button onClick={() => unassignDrone('assemble', unassignedDrones)} disabled={unassignedDrones <= 0}>++</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
});