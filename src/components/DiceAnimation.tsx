import React from 'react';
import Lottie from 'lottie-react';

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
  // Lottie animation data for dice (you'll need to download and import the JSON)
  const diceAnimationData = {
    "v": "5.7.4",
    "fr": 30,
    "ip": 0,
    "op": 60,
    "w": 512,
    "h": 512,
    "nm": "Dice Animation",
    "ddd": 0,
    "assets": [],
    "layers": [
      {
        "ddd": 0,
        "ind": 1,
        "ty": 4,
        "nm": "Dice",
        "sr": 1,
        "ks": {
          "o": {"a": 0, "k": 100},
          "r": {"a": 1, "k": [
            {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [0]},
            {"t": 60, "s": [360]}
          ]},
          "p": {"a": 0, "k": [256, 256, 0]},
          "a": {"a": 0, "k": [0, 0, 0]},
          "s": {"a": 0, "k": [100, 100, 100]}
        },
        "ao": 0,
        "shapes": [
          {
            "ty": "gr",
            "it": [
              {
                "ty": "rc",
                "d": 1,
                "s": {"a": 0, "k": [100, 100]},
                "p": {"a": 0, "k": [0, 0]},
                "r": {"a": 0, "k": 20}
              },
              {
                "ty": "fl",
                "c": {"a": 0, "k": [1, 1, 1, 1]},
                "o": {"a": 0, "k": 100}
              }
            ]
          }
        ],
        "ip": 0,
        "op": 60,
        "st": 0
      }
    ]
  };

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
        className="bg-white rounded-lg shadow-lg flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width="80%" height="80%" viewBox="0 0 100 100">
          {dots}
        </svg>
      </div>
    );
  };

  if (isRolling) {
    return (
      <div style={{ width: size, height: size }}>
        <Lottie 
          animationData={diceAnimationData}
          loop={true}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      {diceValues.map((value, index) => (
        <StaticDice key={index} value={value} />
      ))}
    </div>
  );
};

export default DiceAnimation;