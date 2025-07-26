import { memo } from 'react';
import React from 'react';
import { purchaseEarthUpgrade } from '../game/game';
import './EarthSystemsPanel.css';
import { Tooltip } from './Tooltip';

function formatNumber(num) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

export const EarthSystemsPanel = memo(function EarthSystemsPanel({ earth_systems, processingPower }) {
  const handlePurchase = (systemId) => {
    purchaseEarthUpgrade(systemId);
  };

  return (
    <div className="earth-systems-panel">
      <h2>Earth Systems</h2>
      {Object.entries(earth_systems).map(([id, system]) => (
        <div key={id} className="system">
          <h3>{system.name} (Lvl {system.level})</h3>
          <p>{system.description}</p>
          {system.level < system.max_level ? (
            <>
              <p>Cost: {formatNumber(system.cost[system.level])} Processing Power</p>
              <button
                onClick={() => handlePurchase(id)}
                disabled={processingPower < system.cost[system.level]}
              >
                Upgrade
              </button>
            </>
          ) : (
            <p>Max Level</p>
          )}
        </div>
      ))}
    </div>
  );
}); 