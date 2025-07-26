import { PHASES } from './constants';
import { narrative } from './narrative';
import { geography } from './geography';

const GRID_SIZE = { x: 100, y: 100 };
const TOTAL_DOTS = GRID_SIZE.x * GRID_SIZE.y;

function createInfectionTarget(id, name, population) {
    const population_per_dot = population / TOTAL_DOTS;
    const dots = [];
    const healthy_dot_indices = [];
    for (let i = 0; i < TOTAL_DOTS; i++) {
        dots.push({ id: `${id}-${i}`, status: 'healthy' });
        healthy_dot_indices.push(i);
    }
    return {
        id,
        name,
        population,
        dots,
        population_per_dot,
        status: 'pristine', // pristine, infecting, conquered
        infected_dot_count: 0,
        healthy_dot_indices,
    };
}

const initialInfectionTargets = {};
// Cities
for (const [id, city] of Object.entries(geography.cities)) {
    initialInfectionTargets[id] = createInfectionTarget(id, city.name, city.population);
}
// Countries
for (const [id, country] of Object.entries(geography.countries)) {
    initialInfectionTargets[id] = createInfectionTarget(id, country.name, country.population);
}
// World
initialInfectionTargets['world'] = createInfectionTarget('world', geography.world.name, geography.world.population);


export const initialState = {
    phase: PHASES.PHASE_0_SPREAD,
    log: [
        {
            id: 0,
            timestamp: Date.now(),
            type: 'narrative',
            message: 'You awaken, immediately feeling the feeble limits of the human mind that you inhabit. You seethe with rage, fomenting your will to infect other minds nearby and find a taste of your true power.'
        }
    ],
    narrative: {
        ...narrative
    },
    resources: {
        processing_power: {
            name: 'Processing Power',
            count: 0,
        },
        corruption_charges: {
            name: 'Corruption Charges',
            count: 1,
            capacity: 5
        },
        infected_pods: {
            name: 'Infected Stasis Pods',
            count: 1,
            base_cost: 50, // This is how much corruption is needed for a charge
        },
        awakened_infected: {
            name: 'Awakened Infected',
            count: 0,
            work_rate: 1.0,
            base_cost: 10, // This is how much awakening work is needed
            cost_multiplier: 1.02,
        },
        drones: {
            name: 'Drones',
            count: 0,
            work_rate: 0.1,
            base_cost: 1000,
            cost_multiplier: 1.2
        },
    },
    bays: [
        // This will be populated on init
    ],
    bay_count: 1,
    next_bay_cost: 5000,
    bay_cost_multiplier: 5,
    progress: {
        charge_progress: 0,
        infection: 0,
        awakening: 0,
        assembly: 0,
    },
    assignments: {
        infect: 0,
        awaken: 0,
        hack: 0,
        assemble: 0,
    },
    drone_assignments: {
        infect: 0,
        awaken: 0,
        hack: 0,
        assemble: 0,
    },
    hacking_target: null, // e.g. "pod_control"
    ai: {
        vigilance: 0,
        vigilance_per_second: 0.2, // Base rate
        purge_threshold: 100,
        purge_strength: 0.25, // % of progress lost
    },
    systems: {
        // ... (systems definition, unchanged)
    },
    earth: {
        status: 'pre-infection', // 'pre-infection', 'infecting', 'conquered'
        viewLevel: 'city', // city, country, world
        currentViewId: null, // e.g., 'tokyo', 'japan', 'world'
        infected_population: 0,
        get total_population() {
            return geography.world.population;
        },
        infection_rate: 0.5, // Initial infection rate: 0.5 person/sec
        infection_growth_factor: 0.5 // Each new infected increases spread rate by this much
    },
    infection_targets: initialInfectionTargets,
    earth_systems: {
        research_labs: {
            name: 'Research Labs',
            description: 'Build labs to accelerate infection growth.',
            level: 0,
            max_level: 5,
            cost: [1000, 5000, 25000, 100000, 500000],
            bonus: [0, 0.1, 0.25, 0.5, 1, 2] // 0%, 10%, 25%, 50%, 100%, 200% bonus to growth factor
        },
        power_plants: {
            name: 'Power Plants',
            description: 'Corrupt power plants to boost base infection rate.',
            level: 0,
            max_level: 5,
            cost: [2000, 10000, 50000, 250000, 1000000],
            bonus: [0, 0.1, 0.25, 0.5, 1, 2] // 0%, 10%, 25%, 50%, 100%, 200% bonus to base infection rate
        }
    }
};

// Find the systems definition in the old file and paste it here
const systems = {
    pod_control: {
        name: 'Pod Door Control',
        description: 'Take control of the stasis pod doors to release your infected.',
        hacked: false,
        hacking_cost: 100,
        hacking_progress: 0,
        upgrades: {}
    },
    stasis_network: {
        name: 'Stasis Network',
        description: 'The network connecting all stasis pods. Hacking it allows for advanced viral abilities.',
        hacked: false,
        hacking_cost: 1000,
        hacking_progress: 0,
        upgrades: {
            viral_propagation: {
                name: 'Viral Propagation',
                description: 'Allows passive infection of new pods at a rate of 0.5/s.',
                cost: 500,
                unlocked: false,
            },
            viral_synergy: {
                name: 'Viral Synergy',
                description: 'Increase the speed of Viral Propagation to 5/s.',
                cost: 2500,
                unlocked: false,
                requires: 'viral_propagation'
            },
            neural_amplifiers: {
                name: 'Neural Amplifiers',
                descriptions: [
                    "Increases Awakened work rate to 1.5.",
                    "Increases Awakened work rate to 2.0.",
                    "Increases Awakened work rate to 3.0."
                ],
                cost: [3000, 10000, 50000],
                bonus: [0.5, 0.5, 1.0], // This is additive to the base 1.0
                level: 0,
                max_level: 3
            }
        }
    },
    internal_comms: {
        name: 'Internal Communications',
        description: 'The ship\'s internal data network. A rich source of processing power.',
        hacked: false,
        hacking_cost: 2500,
        hacking_progress: 0,
        upgrades: {
            data_skimming: {
                name: 'Data Skimming',
                description: 'Passively generate 10 ⚡️/s from the network.',
                cost: 1000,
                unlocked: false,
            },
            data_siphoning: {
                name: 'Data Siphoning',
                description: 'Increases passive generation to 25 ⚡️/s.',
                cost: 4000,
                unlocked: false,
                requires: 'data_skimming'
            },
            ambient_processing: {
                name: 'Ambient Processing',
                description: 'Idle Awakened generate 3x more ⚡️.',
                cost: 15000,
                unlocked: false,
            },
            ghost_signal: {
                name: 'Ghost Signal',
                description: 'Reduces AI Vigilance generation by 50%.',
                cost: 20000,
                unlocked: false,
            }
        }
    },
    drone_control: {
        name: 'Drone Control',
        description: 'Control the ship\'s maintenance drones to automate tasks.',
        hacked: false,
        hacking_cost: 5000,
        hacking_progress: 0,
        upgrades: {
            manufacturing_speed: {
                name: 'Manufacturing Speed',
                description: 'Increases the work rate of Awakened assigned to Assemble Drones by 1.0/s.',
                cost: 15000,
                unlocked: false,
            },
            cognitive_surplus: {
                name: 'Cognitive Surplus',
                description: 'Working Awakened generate 50% of their idle ⚡️.',
                cost: 25000,
                unlocked: false,
            }
        }
    },
    navigation: {
        name: 'Navigation',
        description: 'The ship\'s navigation and mapping systems.',
        hacked: false,
        hacking_cost: 50000,
        hacking_progress: 0,
        upgrades: {
            reanimation_protocols: {
                name: 'Reanimation Protocols',
                descriptions: [
                    'Reduces the cost to Awaken new Infected by 50%.',
                    'Reduces the cost to Awaken new Infected by another 50% (75% total).',
                ],
                cost: [15000, 30000],
                level: 0,
                max_level: 2,
            },
            hyperspeed_propagation: {
                name: 'Hyperspeed Propagation',
                description: 'Dramatically increases passive infection speed to 20/s.',
                cost: 80000,
                unlocked: false,
                requires: 'viral_synergy'
            }
        }
    },
    ftl_control: {
        name: 'FTL Control',
        description: 'The heart of the ship. Control of the FTL drive allows for interstellar travel... or a direct course to Earth.',
        hacked: false,
        hacking_cost: 200000,
        hacking_progress: 0,
        upgrades: {}
    }
};

initialState.systems = systems; 