import { getBaseGameConfig } from 'cuelearn-games/utils/baseGameConfigUtil';
import Phaser from 'phaser';

import GameScene from './GameScene';
import { gameState } from './gameState';
import LoadScene from './LoadScene';

export function getFlipItUpGameInstance(gameConfig) {
  const { id, variant, gameQuestion } = gameConfig;

  //console.log('question: ', gameQuestion);

  gameState.variant = variant;
  gameState.gameQuestion = gameQuestion;
  const config = {
    ...getBaseGameConfig(id),
    scene: [LoadScene, GameScene],
  };

  return new Phaser.Game(config);
}
