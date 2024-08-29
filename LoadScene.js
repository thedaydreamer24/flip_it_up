// import { gameState } from './index';
import { Config } from 'cuelearn-games/config';
import Phaser from 'phaser';

export default class LoadScene extends Phaser.Scene {
  constructor() {
    super({
      key: 'LoadScene',
    });
  }

  preload() {
    this.load.setBaseURL(Config.BASE_PATH);
  }

  create() {
    this.assetsLoad();
    this.loadAudio();

    this.load.start();

    this.load.on('complete', () => {
      //console.log('complete');
      this.time.delayedCall(2000, () => {
        this.scene.stop('LoadScene');
        this.scene.start('GameScene');
      });
    });
  }

  assetsLoad() {
    this.load.json('flip-it-up-hint', `flip-it-up-assets/FlipHintLottie.json`);
    this.load.svg('purple', 'flip-it-up-assets/purple.svg');
    this.load.svg('black', 'flip-it-up-assets/black.svg');
    this.load.svg('hint', 'flip-it-up-assets/purple.svg');

    this.load.json('lights-on-tile-comp', `flip-it-up-assets/lights-on-tile-comp.json`); // give your file path
    this.load.json(
      'lights-on-grid-reveal',
      `flip-it-up-assets/lights-on-grid-reveal.json`,
    );

    this.load.html('gameButtons', `game-buttons/GameButtons.html`);

    this.load.html('gameQuestionTooltip', `question-ui-tooltip/GameQuestionTooltip.html`);

    this.load.html('gameQuestionScreen', 'question-ui/GameQuestion.html');

    this.load.image('questionCloseButton', 'game-buttons/question-close-button.png');

    this.load.image('questionOpenButton', 'game-buttons/question-open-button.png');

    this.load.image('retryButton', 'game-buttons/reset-button.png');

    this.load.image('white-dummy', 'game-buttons/button-assets-new/white-dummy.png');

    this.load.image('black-dummy', 'game-buttons/button-assets-new/black-dummy.png');
  }

  loadAudio() {
    this.load.audio('bgMusic', `flip-it-up-assets/lights-on-bgloop-v1.mp3`);
    this.load.audio('lights-on-intro', 'flip-it-up-assets/lights-on-intro.mp3');
    this.load.audio('lights-on-success', 'flip-it-up-assets/lights-on-success.mp3');
    this.load.audio('lights-on-tile-flip', 'flip-it-up-assets/lights-on-tile-flip.mp3');
    this.load.audio('lights-on-touch-grey', 'flip-it-up-assets/lights-on-touch-grey.mp3');
    this.load.audio(
      'lights-on-touch-purple',
      'flip-it-up-assets/lights-on-touch-purple.mp3',
    );
    this.load.audio('lights-on-bgloop-v1', 'flip-it-up-assets/lights-on-bgloop-v1.mp3');

    this.load.audio(
      'buttonClickSoundOne',
      'game-buttons/button-assets-new/button-sound-confirm-hint-question.wav',
    );

    this.load.audio(
      'buttonClickSoundTwo',
      'game-buttons/button-assets-new/button-sound-reset-back.wav',
    );
  }
}
