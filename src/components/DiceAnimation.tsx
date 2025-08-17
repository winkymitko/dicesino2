import React from 'react';

interface DiceAnimationProps {
  isRolling: boolean;
  diceValues?: number[];
  size?: number;
}

const DiceAnimation: React.FC<DiceAnimationProps> = ({ 
  isRolling, 
  diceValues = [1, 1, 1], 
  size = 80 
}) => {
  const StaticDice: React.FC<{ value: number }> = ({ value }) => {
    const dots = [];
    const dotPositions: { [key: number]: number[][] } = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [75, 25], [25, 75], [75, 75]],
      5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
      6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]]
    };

    dotPositions[value]?.forEach((pos, i) => {
      dots.push(
        <circle
          key={i}
          cx={`${pos[0]}%`}
          cy={`${pos[1]}%`}
          r="8%"
          fill="black"
        />
      );
    });

    return (
      <div 
        className={`bg-white rounded-lg shadow-lg flex items-center justify-center ${
          isRolling ? 'animate-bounce' : ''
        }`}
        style={{ width: size, height: size }}
      >
        <svg width="80%" height="80%" viewBox="0 0 100 100">
          {dots}
        </svg>
      </div>
    );
  };

  return (
    <div className="flex space-x-2">
      {diceValues.map((value, index) => (
        <StaticDice key={index} value={value} />
      ))}
    </div>
  );
};

export default DiceAnimation;