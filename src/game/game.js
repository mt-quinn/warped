import { initialState } from './state.js';
import { geography } from './geography';

let gameState = JSON.parse(JSON.stringify(initialState));
let listeners = [];

function createBay(bayId) {
    const pods = [];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            pods.push({
                id: `${bayId}-${x}-${y}`,
                x,
                y,
                status: 'dormant'
            });
        }
    }
    return pods;
}

function initializeBays() {
    const initialBay = createBay(0);
    // Set the initial infected pod, somewhere near the middle.
    const initialPod = initialBay.find(p => p.x === 7 && p.y === 7);
    if (initialPod) {
        initialPod.status = 'infected';
    }
    gameState.bays = [initialBay];
}

initializeBays();

export function notify() {
    listeners.forEach(listener => listener(gameState));
}

export function subscribe(listener) {
    listeners.push(listener);
    return function unsubscribe() {
        listeners = listeners.filter(l => l !== listener);
    };
}

// Recalculate cost a lot, so helper function is nice
function getInfectionCost() {
    return gameState.resources.infected_pods.base_cost * Math.pow(gameState.resources.infected_pods.cost_multiplier, gameState.resources.infected_pods.count);
}

export function getGameState() {
  return gameState;
}

export function setGameState(newState) {
    gameState = newState;
}

const SAVE_KEY = 'warped_save';

export function saveGame() {
    try {
        const stateToSave = { ...gameState };
        
        // Strip out the large dot arrays before saving
        stateToSave.infection_targets = { ...stateToSave.infection_targets };
        for (const key in stateToSave.infection_targets) {
            stateToSave.infection_targets[key] = {
                ...stateToSave.infection_targets[key],
                dots: [], // Remove dots
                healthy_dot_indices: [], // and indices
            };
        }

        localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
        console.error("Error saving game:", error);
    }
}

/**
 * A simple deep merge function to combine a saved state with the initial state,
 * ensuring new properties are added to old saves without overwriting existing progress.
 */
function deepMerge(target, source) {
    const output = { ...target };

    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: target[key] !== undefined ? target[key] : source[key] });
            }
        });
    }

    // Ensure all keys from the source are in the output, even if the target doesn't have them
    for (const key in source) {
        if (!output.hasOwnProperty(key)) {
            output[key] = source[key];
        }
    }


    return output;
}

function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}


export function loadGame() {
    try {
        const savedStateJSON = localStorage.getItem(SAVE_KEY);
        if (savedStateJSON) {
            let savedState = JSON.parse(savedStateJSON);
            
            // Merge the saved state with the initial state to add new properties
            // and regenerate the dot arrays
            gameState = deepMerge(savedState, initialState);

            // Re-hydrate the dot statuses from the saved infected count
            for (const target of Object.values(gameState.infection_targets)) {
                const dotsToInfect = target.infected_dot_count;
                target.infected_dot_count = 0; // Reset before recounting
                target.healthy_dot_indices = Array.from({ length: target.dots.length }, (_, i) => i);
                
                for (let i = 0; i < dotsToInfect; i++) {
                    if (target.healthy_dot_indices.length > 0) {
                        const randomIndex = Math.floor(Math.random() * target.healthy_dot_indices.length);
                        const dotIndexToInfect = target.healthy_dot_indices[randomIndex];
                        target.dots[dotIndexToInfect].status = 'infected';
                        target.infected_dot_count++;
                        target.healthy_dot_indices.splice(randomIndex, 1);
                    }
                }
            }
            
            console.log("Game loaded and merged with latest version.");
        }
    } catch (error) {
        console.error("Error loading game:", error);
        resetGame(); // If loading fails, reset to avoid a corrupted state
    }
}

export function resetGame() {
    localStorage.removeItem(SAVE_KEY);
    gameState = JSON.parse(JSON.stringify(initialState));
    console.log("Game reset.");
}

export function infectPod(podToInfect) {
    if (gameState.phase !== 'PHASE_0_SPREAD') return;
    if (podToInfect.status !== 'dormant') return;

    if (gameState.resources.corruption_charges.count < 1) {
        addLog('warning', "Not enough Corruption Charges to infect.");
        return;
    }

    // All checks passed, infect the pod
    gameState.resources.corruption_charges.count--;
    // The pod object passed in is a copy, so we need to find the original in the state and modify it.
    for (const bay of gameState.bays) {
        const podInState = bay.find(p => p.id === podToInfect.id);
        if (podInState) {
            podInState.status = 'infected';
            break; 
        }
    }
    gameState.resources.infected_pods.count++;
    
    addLog('event', `Pod at (${podToInfect.x}, ${podToInfect.y}) has been infected.`);
}

export function purchaseBay() {
    console.log('Attempting to purchase new bay. Current PP:', gameState.resources.processing_power.count, 'Cost:', gameState.next_bay_cost);
    if (gameState.resources.processing_power.count >= gameState.next_bay_cost) {
        gameState.resources.processing_power.count -= gameState.next_bay_cost;
        gameState.bay_count++;
        gameState.next_bay_cost *= gameState.bay_cost_multiplier;
        
        const newBay = createBay(gameState.bays.length);
        gameState.bays.push(newBay);

        addLog('event', `New stasis bay unlocked! Total bays: ${gameState.bay_count}`);
        console.log('Bay purchase successful. New state:', gameState);
    } else {
        addLog('warning', 'Not enough Processing Power to unlock a new bay.');
        console.log('Bay purchase failed. Not enough PP.');
    }
}

export function setHackingTarget(systemId) {
    if (gameState.systems[systemId] && !gameState.systems[systemId].hacked) {
        gameState.hacking_target = systemId;
        addLog('event', `New hacking target set: ${gameState.systems[systemId].name}`);
    } else {
        console.error(`Invalid or already hacked system: ${systemId}`);
    }
}

export function purchaseUpgrade(systemId, upgradeId) {
    const system = gameState.systems[systemId];
    if (!system || !system.hacked) {
        console.error(`System ${systemId} not available.`);
        return;
    }

    const upgrade = system.upgrades[upgradeId];
    if (!upgrade) {
        console.error(`Upgrade ${upgradeId} not found in system ${systemId}.`);
        return;
    }

    // Handle multi-level upgrades
    if (upgrade.hasOwnProperty('level')) {
        if (upgrade.level >= upgrade.max_level) {
            console.error(`Upgrade ${upgradeId} is already max level.`);
            return;
        }
        const cost = upgrade.cost[upgrade.level];
        if (gameState.resources.processing_power.count >= cost) {
            gameState.resources.processing_power.count -= cost;
            upgrade.level++;
            addLog('event', `Upgraded ${upgrade.name} to Level ${upgrade.level}.`);
        } else {
            addLog('warning', 'Not enough Processing Power.');
        }
    } 
    // Handle single-purchase upgrades
    else {
        if (upgrade.unlocked) {
            console.error(`Upgrade ${upgradeId} already purchased.`);
            return;
        }
        if (gameState.resources.processing_power.count >= upgrade.cost) {
            gameState.resources.processing_power.count -= upgrade.cost;
            upgrade.unlocked = true;
            addLog('event', `Upgrade Purchased: ${upgrade.name}`);
        } else {
            addLog('warning', 'Not enough Processing Power.');
        }
    }
}

export function completePhase0() {
    if (gameState.phase === 'PHASE_0_SPREAD' && gameState.systems.pod_control.hacked) {
        gameState.systems.pod_control.is_complete = true;
        gameState.phase = 'PHASE_1_AWAKENING';
        // Give the player their first infected for free upon unlocking the system
        gameState.resources.awakened_infected.count = 1;
        addLog('event', 'SYSTEM COMPROMISED: Pod Door Control now accessible.', 'phase1_start');
        addLog('narrative', 'The doors are yours. Awaken your first servant. Let the true work begin.', 'phase1_start_narrative');
        
        // Also mark one pod as empty
        let podEmptied = false;
        for (const bay of gameState.bays) {
            const podToEmpty = bay.find(p => p.status === 'infected');
            if (podToEmpty) {
                podToEmpty.status = 'empty';
                podEmptied = true;
                break;
            }
        }
    }
}

export function purchaseEarthUpgrade(systemId) {
    const system = gameState.earth_systems[systemId];
    if (!system) {
        console.error(`System ${systemId} not available.`);
        return;
    }

    if (system.level >= system.max_level) {
        console.error(`Upgrade ${systemId} is already max level.`);
        return;
    }

    const cost = system.cost[system.level];
    if (gameState.resources.processing_power.count >= cost) {
        gameState.resources.processing_power.count -= cost;
        system.level++;
        addLog('event', `Upgraded ${system.name} to Level ${system.level}.`);
    } else {
        addLog('warning', 'Not enough Processing Power.');
    }
}

export function infectDot(dotToInfect) {
    if (dotToInfect.status !== 'healthy') return;

    const currentTarget = gameState.infection_targets[gameState.earth.currentViewId];
    if (!currentTarget) return;

    dotToInfect.status = 'infected';
    currentTarget.infected_dot_count++;

    // Remove from healthy list
    const indexToRemove = currentTarget.healthy_dot_indices.indexOf(parseInt(dotToInfect.id.split('-')[1]));
    if (indexToRemove > -1) {
        currentTarget.healthy_dot_indices.splice(indexToRemove, 1);
    }

    if (gameState.earth.infected_population === 0) {
        gameState.earth.infected_population = 1;
    }

    notify();
}

export function checkForConquest() {
    const viewId = gameState.earth.currentViewId;
    if (!viewId) return;

    const target = gameState.infection_targets[viewId];
    if (target.status === 'conquered') return;

    if (target.infected_dot_count === target.dots.length) {
        target.status = 'conquered';
        addLog('event', `${target.name} has been completely infected!`);

        // Zoom out logic
        let nextViewId = null;
        let nextViewName = '';
        if (gameState.earth.viewLevel === 'city') {
            const cityInfo = geography.cities[viewId];
            nextViewId = cityInfo.country;
            nextViewName = geography.countries[nextViewId].name;
            gameState.earth.viewLevel = 'country';
            addLog('narrative', `The infection has consumed a city. Now, the entire nation of ${nextViewName} is in our sights.`);
        } else if (gameState.earth.viewLevel === 'country') {
            nextViewId = 'world';
            nextViewName = 'The World';
            gameState.earth.viewLevel = 'world';
            addLog('narrative', 'An entire nation has fallen. The world is next.');
        }

        if (nextViewId) {
            gameState.earth.currentViewId = nextViewId;
            const nextTarget = gameState.infection_targets[nextViewId];
            const contribution = target.population / nextTarget.population;
            const dotsToInfect = Math.floor(contribution * nextTarget.dots.length);

            for (let i = 0; i < dotsToInfect; i++) {
                if (nextTarget.healthy_dot_indices.length > 0) {
                    const randomIndex = Math.floor(Math.random() * nextTarget.healthy_dot_indices.length);
                    const dotIndexToInfect = nextTarget.healthy_dot_indices[randomIndex];
                    nextTarget.dots[dotIndexToInfect].status = 'infected';
                    nextTarget.infected_dot_count++;
                    nextTarget.healthy_dot_indices.splice(randomIndex, 1);
                }
            }
        }
    }
}

export function completePhase1() {
    if (gameState.phase === 'PHASE_1_AWAKENING' && gameState.systems.ftl_control.hacked) {
        gameState.phase = 'PHASE_2_EARTH_INFECTION';
        addLog('event', 'SYSTEM COMPROMISED: FTL Control now accessible.', 'phase2_start');
        addLog('narrative', 'The ship is yours. The long journey home begins.', 'phase2_start_narrative');
    }
}

export function selectCity(cityId) {
    gameState.earth.status = 'infecting';
    gameState.earth.currentViewId = cityId;
    const cityName = gameState.infection_targets[cityId].name;
    addLog('narrative', `The infection begins in ${cityName}. Now, we must spread.`);
    notify();
}

export function debug_skipToPhase1() {
    gameState.systems.pod_control.hacked = true;

    // Set infected pods to 50 for testing
    let infectedCount = 1; // Start with the initial one
    for (const bay of gameState.bays) {
        for (const pod of bay) {
            if (pod.status === 'dormant' && infectedCount < 50) {
                pod.status = 'infected';
                infectedCount++;
            }
        }
    }
    gameState.resources.infected_pods.count = infectedCount;

    completePhase0();
}

export function debug_skipToPhase2() {
    for (const systemId in gameState.systems) {
        gameState.systems[systemId].hacked = true;
    }
    completePhase1();
}

export function awakenInfected() {
    if (gameState.resources.infected_pods.count < 1) {
        addLog('warning', "Not enough infected pods to awaken.");
        return;
    }

    gameState.resources.awakened_infected.count++;
    gameState.resources.infected_pods.count--;
    
    // Find an infected pod and set it to 'empty'
    let podEmptied = false;
    for (const bay of gameState.bays) {
        const podToEmpty = bay.find(p => p.status === 'infected');
        if (podToEmpty) {
            podToEmpty.status = 'empty';
            podEmptied = true;
            break;
        }
    }

    addLog('event', `An infected has been awakened. Total: ${gameState.resources.awakened_infected.count}`);
}

export function addLog(type, message, narrativeId = null) {
    if (narrativeId) {
        if (gameState.narrative[narrativeId]) {
            return; // Don't add duplicate narrative messages
        }
        gameState.narrative[narrativeId] = true;
    }

    const newLogEntry = {
        id: gameState.log.length > 0 ? gameState.log[gameState.log.length - 1].id + 1 : 0,
        timestamp: Date.now(),
        type, // 'narrative', 'event', 'warning'
        message
    };

    let newLog = [...gameState.log, newLogEntry];

    // Keep the log from getting too long
    if (newLog.length > 100) {
        newLog = newLog.slice(newLog.length - 100);
    }

    gameState.log = newLog;
}

export function assignDrone(task, amount = 1) {
    const availableDrones = gameState.resources.drones.count - Object.values(gameState.drone_assignments).reduce((a, b) => a + b, 0) + (gameState.drone_assignments[task] || 0);
    if (amount > availableDrones) {
        amount = availableDrones; // Cap the amount to the number of available drones
    }
    if (gameState.drone_assignments.hasOwnProperty(task)) {
        let newAmount = gameState.drone_assignments[task] + amount;
        // This logic is flawed for 'add all'. Let's rethink.

        const otherAssignedDrones = Object.keys(gameState.drone_assignments)
            .filter(key => key !== task)
            .reduce((sum, key) => sum + gameState.drone_assignments[key], 0);
        
        const maxAssignable = gameState.resources.drones.count - otherAssignedDrones;
        
        newAmount = Math.min(gameState.drone_assignments[task] + amount, maxAssignable);


        gameState.drone_assignments = {
            ...gameState.drone_assignments,
            [task]: newAmount
        };
    } else {
        console.error(`Unknown task for drone: ${task}`);
    }
    notify();
}

export function unassignDrone(task, amount = 1) {
    if (gameState.drone_assignments.hasOwnProperty(task)) {
        const assigned = gameState.drone_assignments[task];
        if (amount > assigned) {
            console.error(`Cannot unassign more drones than are assigned to ${task}`);
            return;
        }
        gameState.drone_assignments = {
            ...gameState.drone_assignments,
            [task]: gameState.drone_assignments[task] - amount
        };
    } else {
        console.error(`Unknown task for drone: ${task}`);
    }
    notify();
}

export function assignInfected(task, amount = 1) {
    const availableInfected = gameState.resources.awakened_infected.count - Object.values(gameState.assignments).reduce((a, b) => a + b, 0);
    if (amount > availableInfected) {
        console.error("Not enough available infected.");
        return;
    }

    if (gameState.assignments.hasOwnProperty(task)) {
        gameState.assignments = {
            ...gameState.assignments,
            [task]: gameState.assignments[task] + amount
        };
    } else {
        console.error(`Unknown task: ${task}`);
    }
    notify();
}

export function unassignInfected(task, amount = 1) {
    if (gameState.assignments.hasOwnProperty(task)) {
        const assigned = gameState.assignments[task];
        if (amount > assigned) {
            console.error(`Cannot unassign more infected than are assigned to ${task}`);
            return;
        }
        gameState.assignments = {
            ...gameState.assignments,
            [task]: gameState.assignments[task] - amount
        };
    } else {
        console.error(`Unknown task: ${task}`);
    }
    notify();
} 