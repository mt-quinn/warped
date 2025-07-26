import { memo } from 'react';
import React from 'react';
import { getGameState, subscribe, infectDot } from '../game/game';
import './EarthView.css';
import { usePulseOnIncrease } from '../hooks/usePulseOnIncrease';

function formatNumber(num) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

export const EarthView = memo(function EarthView({ target, onDotClick }) {
  const [gameState, setGameState] = React.useState(getGameState());

  React.useEffect(() => {
    const unsubscribe = subscribe(setGameState);
    return unsubscribe;
  }, []);


  if (!target) {
    return <div>Loading...</div>;
  }

  const { earth, earth_systems } = gameState;
  const infectedPercentage = (earth.infected_population / target.population) * 100;

  const researchLabs = earth_systems.research_labs;
  const powerPlants = earth_systems.power_plants;
  const growthFactor = earth.infection_growth_factor * (1 + researchLabs.bonus[researchLabs.level]);
  const baseInfectionRate = earth.infection_rate * (1 + powerPlants.bonus[powerPlants.level]);
  const totalInfectionRate = baseInfectionRate + (earth.infected_population * growthFactor);

  const infectionRatePulse = usePulseOnIncrease(totalInfectionRate);

  return (
    <div className="earth-view">
      <h1>{target.name}</h1>
      <div className="stats">
        <div>
          <h2>Total Population</h2>
          <p>{formatNumber(Math.floor(target.population))}</p>
        </div>
        <div>
          <h2>Infected Population</h2>
          <p>{formatNumber(Math.floor(earth.infected_population))}</p>
        </div>
        <div>
          <h2>Infection Rate</h2>
          <p className={infectionRatePulse}>{formatNumber(totalInfectionRate.toFixed(1))}/s</p>
        </div>
      </div>
      <div className="progress-bar">
        <div
          className="progress"
          style={{ width: `${infectedPercentage}%` }}
        ></div>
      </div>
      <div className="dot-grid">
        {target.dots.map(dot => (
          <div
            key={dot.id}
            className={`dot ${dot.status}`}
            onClick={() => onDotClick(dot)}
          ></div>
        ))}
      </div>
    </div>
  );
}); 