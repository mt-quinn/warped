import { memo } from 'react';
import { ProgressBar } from './ProgressBar';
import { purchaseUpgrade, purchaseBay, completePhase1 } from '../game/game';
import './SystemsPanel.css';
import { Tooltip } from './Tooltip';

export const SystemsPanel = memo(function SystemsPanel({ systems, currentTarget, processingPower, nextBayCost, ai }) {
  // We don't want to show the Pod Control system here as it's part of Phase 0
  const displayableSystems = Object.entries(systems).filter(([id]) => id !== 'pod_control');

  return (
    <div class="system-panel">
      <h2>Ship Systems</h2>

      {ai && (
        <Tooltip text="The ship's AI is suspicious of your activities. When this bar fills, a large amount of progress from the current system you are hacking will be undone. Rate increases with every system hacked.">
            <div className="ai-vigilance-panel">
            <div className="ai-vigilance-header">
                <strong>AI Vigilance</strong>
                <span className="resource-rate">({(ai.vigilance_per_second * (1 + Object.values(systems).filter(s => s.hacked).length * 0.5) * (systems.internal_comms.upgrades.ghost_signal.unlocked ? 0.5 : 1)).toFixed(1)}/s)</span>
            </div>
            <ProgressBar
                current={ai.vigilance}
                max={ai.purge_threshold}
                label={`${Math.floor(ai.vigilance)} / ${ai.purge_threshold}`}
                className="ai-vigilance-bar"
            />
            </div>
        </Tooltip>
      )}

      {displayableSystems.map(([id, system]) => {
        const isLocked = id === 'ftl_control' && !systems.navigation.hacked;
        const disabledReason = isLocked ? 'Requires Navigation System to be hacked.' : '';

        return (
          <div key={id} class={`system ${system.hacked ? 'hacked' : ''} ${currentTarget === id ? 'targeting' : ''} ${isLocked ? 'locked' : ''}`}>
            <div class="system-header">
              <strong>{system.name}</strong>
              {currentTarget === id && !system.hacked && (
                <span class="system-status">Hacking...</span>
              )}
            </div>
            <p class="system-description">{system.description}</p>
            {!system.hacked && (
              <ProgressBar
                current={system.hacking_progress}
                max={system.hacking_cost}
                label={`${Math.floor(system.hacking_progress)} / ${system.hacking_cost}`}
              />
            )}
            {system.hacked && (
              <div class="upgrades-section">
                <h4>Upgrades</h4>
                {Object.entries(system.upgrades).map(([upgradeId, upgrade]) => {
                  const isMultiLevel = upgrade.hasOwnProperty('level');
                  const isMaxLevel = isMultiLevel && upgrade.level >= upgrade.max_level;
                  const isUnlocked = !isMultiLevel && upgrade.unlocked;

                  let cost = 0;
                  if (isMultiLevel && !isMaxLevel) {
                    cost = upgrade.cost[upgrade.level];
                  } else if (!isMultiLevel) {
                    cost = upgrade.cost;
                  }

                  return (
                    <div key={upgradeId} class="upgrade">
                      <div class="upgrade-info">
                        <strong>{upgrade.name} {isMultiLevel && `(Lvl ${upgrade.level})`}</strong>
                        <p>{isMultiLevel ? upgrade.descriptions[upgrade.level] : upgrade.description}</p>
                      </div>
                      {isMaxLevel || isUnlocked ? (
                        <span class="unlocked-text">{isMaxLevel ? 'Max Level' : 'Unlocked'}</span>
                      ) : (
                        <button
                          class="buy-button"
                          onClick={() => purchaseUpgrade(id, upgradeId)}
                          disabled={processingPower < cost}
                        >
                          {isMultiLevel ? `Upgrade (${cost} ⚡️)` : `Buy (${cost} ⚡️)`}
                        </button>
                      )}
                    </div>
                  );
                })}
                 {id === 'ftl_control' && system.hacked && (
                    <button class="phase-button" onClick={completePhase1}>
                        Initiate FTL Jump to Earth
                    </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Special section for Bay Unlocking */}
      <div class="system">
          <div class="system-header">
            <strong>Unlock Stasis Bay</strong>
          </div>
          <p class="system-description">Extend your influence to an adjacent stasis bay, revealing more minds to corrupt.</p>
          <button
            class="buy-button"
            onClick={() => purchaseBay()}
            disabled={processingPower < nextBayCost}
          >
            Unlock ({nextBayCost} ⚡️)
          </button>
      </div>
    </div>
  );
}); 