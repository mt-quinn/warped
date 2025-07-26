import { useState, useEffect, useRef } from 'preact/hooks';
import './PodBay.css';
import { memo } from 'react';

export const PodBay = memo(function PodBay({ bays, onPodClick }) {
  const [isDragging, setIsDragging] = useState(false);
  const [podSize, setPodSize] = useState(16);
  const [gapSize, setGapSize] = useState(1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const calculateSize = () => {
      if (!wrapperRef.current) return;

      const bayCount = bays.length;
      const containerWidth = wrapperRef.current.offsetWidth;
      const containerHeight = wrapperRef.current.offsetHeight;

      // Determine how many bays can fit per row (approx)
      const baysPerRow = Math.ceil(Math.sqrt(bayCount));
      
      // Calculate available space per bay
      const maxWidthPerBay = containerWidth / baysPerRow - 20; // 20px for gaps
      const maxHeightPerBay = containerHeight / baysPerRow - 20;

      // Find the limiting dimension
      const limitingDim = Math.min(maxWidthPerBay, maxHeightPerBay);

      // Calculate pod size (16 pods + gaps)
      const newPodSize = Math.floor(limitingDim / 16.5);
      const newGapSize = newPodSize > 4 ? 1 : 0;
      
      setPodSize(Math.max(1, newPodSize));
      setGapSize(newGapSize);
    };

    calculateSize();
    window.addEventListener('resize', calculateSize);
    return () => window.removeEventListener('resize', calculateSize);
  }, [bays.length]);

  const handleMouseDown = (pod) => {
    setIsDragging(true);
    onPodClick(pod);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseEnter = (pod) => {
    if (isDragging) {
      onPodClick(pod);
    }
  };

  return (
    <div class="pod-bay-container" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div class="pod-bay-header">
        <h2>Stasis Bays</h2>
        <div class="legend">
          <div class="legend-item"><span class="pod-color healthy"></span> Healthy</div>
          <div class="legend-item"><span class="pod-color infected"></span> Infected</div>
          <div class="legend-item"><span class="pod-color empty"></span> Empty</div>
        </div>
      </div>
      <div class="bays-wrapper" ref={wrapperRef}>
        {bays.map((bay, bayIndex) => (
          <div class="pod-grid" key={bayIndex} style={{ '--pod-size': `${podSize}px`, '--gap-size': `${gapSize}px` }}>
            {bay.map(pod => (
              <div
                key={pod.id}
                class={`pod ${pod.status}`}
                onMouseDown={() => handleMouseDown(pod)}
                onMouseEnter={() => handleMouseEnter(pod)}
                title={`Bay ${bayIndex + 1}, Pod ${pod.x}, ${pod.y}`}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}); 