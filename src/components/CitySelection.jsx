import { memo } from 'preact/compat';
import './CitySelection.css';

export const CitySelection = memo(({ cities, onSelectCity }) => {
  return (
    <div class="city-selection-container">
      <h2>Select a City to Begin Infection</h2>
      <div class="city-list">
        {cities.map((city) => (
          <div key={city.id} class="city-card" onClick={() => onSelectCity(city.id)}>
            <h3>{city.name}</h3>
            <p>Population: {city.population.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}); 