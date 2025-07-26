import { getGameState, addLog, awakenInfected, saveGame, notify, checkForConquest } from './game.js';

const TICK_RATE = 50; // ms per tick, our ideal update interval
let lastTickTime = Date.now();
let autosaveTimer = 0;
const AUTOSAVE_INTERVAL = 30; // seconds

function findTargetablePods(state) {
    const allPods = state.bays.flat();
    const dormant = allPods.filter(p => p.status === 'dormant');
    if (dormant.length === 0) return [];

    // only find pods adjacent to infected or empty ones (the player's "network")
    const networkPods = allPods.filter(p => p.status === 'infected' || p.status === 'empty');
    return dormant.filter(pod => 
        networkPods.some(networkPod =>
            Math.abs(networkPod.x - pod.x) <= 1 &&
            Math.abs(networkPod.y - pod.y) <= 1
        )
    );
}

function gameLoop() {
  const now = Date.now();
  const deltaTime = (now - lastTickTime) / 1000.0; // Delta time in seconds
  lastTickTime = now;
  
  const state = getGameState();

  // Clamp deltaTime to prevent the "spiral of death" on long AFK
  const clampedDeltaTime = Math.min(deltaTime, 1.0); 

  if (state.phase === 'PHASE_0_SPREAD') {
    // --- PHASE 0: SPREAD ---
    const corruptionPerSecond = state.resources.infected_pods.count * 5; 
    state.progress.charge_progress += corruptionPerSecond * clampedDeltaTime;

    const infectionCost = state.resources.infected_pods.base_cost; // Simplified cost for charges
    if (state.progress.charge_progress >= infectionCost) {
      state.resources.corruption_charges.count++;
      state.progress.charge_progress -= infectionCost;
    }

    // Passive Hacking, only if not already completed
    if (!state.systems.pod_control.hacked) {
      const hackingPower = state.resources.infected_pods.count * 0.2; // Each pod adds 0.2 hacking/sec
      const podControlSystem = state.systems.pod_control;
      podControlSystem.hacking_progress += hackingPower * clampedDeltaTime;

      // --- Narrative Triggers for Phase 0 ---
      const hackProgress = podControlSystem.hacking_progress / podControlSystem.hacking_cost;
      if (hackProgress > 0.1) {
          addLog('narrative', "As your power grows, your host of human minds begin to grapple with the controls to their stasis pods, yearning to serve you more actively.", 'phase0_grapple');
      }

      if (podControlSystem.hacking_progress >= podControlSystem.hacking_cost) {
          podControlSystem.hacked = true;
          podControlSystem.hacking_progress = podControlSystem.hacking_cost; // Clamp to max
          addLog('event', 'SYSTEM HACK COMPLETE: Pod Door Control', 'pod_control_hacked');
          addLog('narrative', 'The flimsy digital locks yield. You have control. You can open the pods.', 'pod_control_hacked_narrative');
      }
    }

  } else if (state.phase === 'PHASE_1_AWAKENING') {
    // --- PHASE 1: AWAKENING & EXPANSION ---

    // Calculate base work rate with upgrades
    let workRate = state.resources.awakened_infected.work_rate;
    const neuralAmpUpgrade = state.systems.stasis_network.upgrades.neural_amplifiers;
    if (neuralAmpUpgrade.level > 0) {
        for (let i = 0; i < neuralAmpUpgrade.level; i++) {
            workRate += neuralAmpUpgrade.bonus[i];
        }
    }

    // 0. Generate Resources
    const totalAssigned = state.assignments.infect + state.assignments.awaken + state.assignments.hack + state.assignments.assemble;
    const idleInfected = state.resources.awakened_infected.count - totalAssigned;
    let powerPerSecond = 0;
    
    // Power from idle infected
    if (idleInfected > 0) {
      let idlePower = idleInfected * 0.5;
      if (state.systems.internal_comms.upgrades.ambient_processing.unlocked) {
        idlePower *= 3;
      }
      powerPerSecond += idlePower;
    }

    // Power from working infected (with Cognitive Surplus)
    if (state.systems.drone_control.upgrades.cognitive_surplus.unlocked) {
      powerPerSecond += (totalAssigned * 0.5) * 0.5; // 50% rate
    }

    state.resources.processing_power.count += powerPerSecond * clampedDeltaTime;

    // Processing Power from Data Skimming/Siphoning
    if (state.systems.internal_comms.upgrades.data_siphoning.unlocked) {
        state.resources.processing_power.count += 25 * clampedDeltaTime;
    } else if (state.systems.internal_comms.upgrades.data_skimming.unlocked) {
      state.resources.processing_power.count += 10 * clampedDeltaTime;
    }

    // 1. Infection Progress
    let baseInfectionRate = 0;
    if (state.systems.stasis_network.upgrades.viral_propagation.unlocked) {
      let passiveRate = 0.5;
      if (state.systems.navigation.upgrades.hyperspeed_propagation.unlocked) {
          passiveRate = 20;
      } else if (state.systems.stasis_network.upgrades.viral_synergy.unlocked) {
        passiveRate *= 10;
      }
      baseInfectionRate += passiveRate;
    }
    if (state.assignments.infect > 0) {
        baseInfectionRate += state.assignments.infect * workRate;
    }
    const infectionDroneBonus = Math.pow(1.1, state.drone_assignments.infect);
    const newProgress = { ...state.progress };
    newProgress.infection += (baseInfectionRate * infectionDroneBonus) * clampedDeltaTime;
    
    const infectionCost = 50;

    if (newProgress.infection >= infectionCost) {
        const numNewInfections = Math.floor(newProgress.infection / infectionCost);
        for (let i = 0; i < numNewInfections; i++) {
            const targetablePods = findTargetablePods(state);
            if (targetablePods.length > 0) {
                const podToInfect = targetablePods[Math.floor(Math.random() * targetablePods.length)];
                for (const bay of state.bays) {
                    const podIndex = bay.findIndex(p => p.id === podToInfect.id);
                    if (podIndex !== -1) {
                        bay[podIndex].status = 'infected';
                        break;
                    }
                }
                state.resources.infected_pods.count++;
                addLog('event', `A new pod has been infected! Total: ${state.resources.infected_pods.count}`);
            } else {
                addLog('warning', 'No dormant pods available to infect in this bay.');
                break; 
            }
        }
        newProgress.infection %= infectionCost;
    }

    // 2. Awakening Progress
    if (state.assignments.awaken > 0 && state.resources.infected_pods.count > 0) {
        const droneBonus = Math.pow(1.1, state.drone_assignments.awaken);
        const awakeningWork = state.assignments.awaken * workRate * droneBonus * clampedDeltaTime;
        newProgress.awakening += awakeningWork;
    
        let awakeningCost = state.resources.awakened_infected.base_cost * Math.pow(state.resources.awakened_infected.cost_multiplier, state.resources.awakened_infected.count);
        const reanimationUpgrade = state.systems.navigation.upgrades.reanimation_protocols;
        if (reanimationUpgrade.level > 0) {
            awakeningCost *= Math.pow(0.5, reanimationUpgrade.level);
        }

        if (newProgress.awakening >= awakeningCost) {
            awakenInfected();
            newProgress.awakening -= awakeningCost;
        }
    }

    // 3. Drone Assembly
    if (state.systems.drone_control.hacked && state.assignments.assemble > 0) {
        let assemblyWorkRate = workRate;
        if (state.systems.drone_control.upgrades.manufacturing_speed.unlocked) {
            assemblyWorkRate += 1.0;
        }
        const droneBonus = Math.pow(1.1, state.drone_assignments.assemble);
        const assemblyWork = state.assignments.assemble * assemblyWorkRate * droneBonus * clampedDeltaTime;
        newProgress.assembly += assemblyWork;

        const droneCost = state.resources.drones.base_cost * Math.pow(state.resources.drones.cost_multiplier, state.resources.drones.count);
        if (newProgress.assembly >= droneCost) {
            state.resources.drones.count++;
            newProgress.assembly -= droneCost;
            addLog('event', `A new drone has been assembled. Total: ${state.resources.drones.count}`);
        }
    }

    state.progress = newProgress;

    // 4. Hacking Progress
    let newSystems = { ...state.systems };
    let newAI = { ...state.ai };

    if (!state.hacking_target) {
        // Find the first unhacked system and set it as the target
        const firstUnhackedSystem = Object.keys(state.systems).find(id => !state.systems[id].hacked);
        if (firstUnhackedSystem) {
            state.hacking_target = firstUnhackedSystem;
        }
    }

    if (state.hacking_target) {
        const targetSystem = newSystems[state.hacking_target];
        if (targetSystem && !targetSystem.hacked) {
            let hackingPower = 0;
            hackingPower += state.resources.infected_pods.count * 0.1; // Passive Hacking
            hackingPower += state.assignments.hack * workRate; // Active Hacking
            
            const droneBonus = Math.pow(1.1, state.drone_assignments.hack);
            const totalHackingPower = hackingPower * droneBonus;

            targetSystem.hacking_progress += totalHackingPower * clampedDeltaTime;

            if (targetSystem.hacking_progress >= targetSystem.hacking_cost) {
                targetSystem.hacked = true;
                targetSystem.hacking_progress = targetSystem.hacking_cost;
                addLog('event', `SYSTEM HACK COMPLETE: ${targetSystem.name}`);
                state.hacking_target = null;

                if (targetSystem.name === "FTL Control") {
                    // This is where the automatic transition was
                }
            }
        }
    }

    // 5. AI Vigilance
    const hackedSystemsCount = Object.values(newSystems).filter(s => s.hacked).length;
    let vigilanceMultiplier = 1 + hackedSystemsCount * 0.5;
    if (newSystems.internal_comms.upgrades.ghost_signal.unlocked) {
      vigilanceMultiplier *= 0.5;
    }
    newAI.vigilance += state.ai.vigilance_per_second * vigilanceMultiplier * clampedDeltaTime; 
    
    if(newAI.vigilance >= state.ai.purge_threshold) {
      addLog('warning', 'AI Security Purge detected. Hacking progress on active projects has been partially reversed.');
      if (state.hacking_target) {
        const targetSystem = newSystems[state.hacking_target];
        if (targetSystem && !targetSystem.hacked) {
            const purgeAmount = targetSystem.hacking_cost * state.ai.purge_strength;
            targetSystem.hacking_progress = Math.max(0, targetSystem.hacking_progress - purgeAmount);
            addLog('warning', `[${targetSystem.name}] hack progress reduced by ${Math.floor(purgeAmount)}.`);
        }
      }
      newAI.vigilance = 0;
    }

    state.systems = newSystems;
    state.ai = newAI;

  } else if (state.phase === 'PHASE_2_EARTH_INFECTION') {
    // --- PHASE 2: EARTH INFECTION ---
    if (state.earth.status === 'infecting') {
        if (state.earth.infected_population > 0) {
            // Add power from infected population
            state.resources.processing_power.count += state.earth.infected_population * 0.1 * clampedDeltaTime;

            // --- Calculate Growth ---
            const researchLabs = state.earth_systems.research_labs;
            const powerPlants = state.earth_systems.power_plants;
            const growthFactor = state.earth.infection_growth_factor * (1 + researchLabs.bonus[researchLabs.level]);
            const infectionRate = state.earth.infection_rate * (1 + powerPlants.bonus[powerPlants.level]);
            const newInfections = (infectionRate + (state.earth.infected_population * growthFactor)) * clampedDeltaTime;
            state.earth.infected_population += newInfections;

            // --- Update Visuals ---
            const currentTarget = state.infection_targets[state.earth.currentViewId];
            if (currentTarget) {
                const dotsThatShouldBeInfected = Math.floor(state.earth.infected_population / currentTarget.population_per_dot);
                const newDotsToInfectCount = dotsThatShouldBeInfected - currentTarget.infected_dot_count;

                if (newDotsToInfectCount > 0) {
                    for (let i = 0; i < newDotsToInfectCount; i++) {
                        if (currentTarget.healthy_dot_indices.length > 0) {
                            const randomIndex = Math.floor(Math.random() * currentTarget.healthy_dot_indices.length);
                            const dotIndexToInfect = currentTarget.healthy_dot_indices[randomIndex];
                            
                            currentTarget.dots[dotIndexToInfect].status = 'infected';
                            currentTarget.infected_dot_count++;
                            
                            // Remove the newly infected dot from the list of healthy dots
                            currentTarget.healthy_dot_indices.splice(randomIndex, 1);
                        } else {
                            break; // No more healthy dots
                        }
                    }
                }
            }
             checkForConquest();
        }
    }
  }

  // Autosave
  autosaveTimer += clampedDeltaTime;
  if (autosaveTimer >= AUTOSAVE_INTERVAL) {
    saveGame();
    autosaveTimer = 0;
  }

  // Notify UI of changes
  notify();
}

export function start() {
  setInterval(gameLoop, TICK_RATE);
} 