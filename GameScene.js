/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */

// Calculate the offset required to center the grid on the screen
import { Config } from 'cuelearn-games/config';
import { GameEvent } from 'cuelearn-games/enums';
import { GameMessageEnum } from 'cuelearn-games/games/types';
import { GameEventEmitter, Grid } from 'cuelearn-games/modules';
import { ButtonType, ButttonManager } from 'cuelearn-games/modules/button/ButtonManager';
import { GameButtons } from 'cuelearn-games/modules/GameButtons';
import { IGameEvent } from 'cuelearn-games/modules/IGameEvent';
import { PuzzleConfetti } from 'cuelearn-games/modules/PuzzleConfetti';
import lottie from 'lottie-web';
import Phaser from 'phaser';

import { gameState } from './gameState';
import { levels } from './levelsData';

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    this.questionText = '';
    this.questionCloseButtonClickNum = 0;
    this.hintLottie;
    this.replay;
    this.puzzleConfetti = new PuzzleConfetti(this);
    this.noMovesLeftText = Phaser.GameObjects.DOMElement;
    this.buttonManager = new ButttonManager(this, [
      ButtonType.Question,
      ButtonType.Hint,
      ButtonType.Reset,
    ]);
  }

  preload() {
    this.load.setBaseURL(Config.BASE_PATH);
    this.puzzleConfetti.preload();
    this.buttonManager.preload();
  }

  create() {
    let noMovesLeftText = this.add
      .dom(
        this.cameras.main.width / 2,
        70,
        'div',
        'font-family: Athletics-Regular; font-size: 14px; color: white',
        'No moves left. Please reset.',
      )
      .setOrigin(0.5)
      .setDepth(10000)
      .setAlpha(0.95)
      .setVisible(false);

    //console.log(gameState.variant)
    try {
      this.puzzleConfetti.create();
      let bgMusic = this.sound.add('bgMusic');

      bgMusic.setLoop(true);
      bgMusic.play();

      const curLevel = gameState.variant;

      //console.log(curLevel);
      GameButtons.getButtonAssets(this);

      this.buttonManager.create();
      //this.buttonManager.toggleTooltip();

      // Initialize numRows and numCols based on the level
      let numRows = 0; // Default value for levels not 1 to 5
      let numCols = 0; // Default value for levels not 71 to 83

      // Check if the length of the array in levels is 16
      if (levels[curLevel].pattern.length === 16) {
        Grid.generate(this.cameras.main.width, this.cameras.main.height, 5, this);

        numRows = 4;
        numCols = 4;
      } else {
        // For all other lengths, including 9
        Grid.generate(this.cameras.main.width, this.cameras.main.height, 4, this);

        numRows = 3;
        numCols = 3;
      }

      this.questionButton = this.buttonManager.addQuestionButton(gameState.gameQuestion);
      this.hintButton = this.buttonManager.addHintButton(
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        () => {},
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        () => {},
      );

      // ADD RESET LOGIC

      this.replay = this.buttonManager.addResetButton(() => {
        this.usedUpAllMoves = false;
        const replaySound = this.sound.add('buttonClickSoundTwo');

        replaySound.play();

        // Reset tiles to initial configuration
        flipTileBack();

        counterAnims.forEach((counterAnim, index) => {
          if (animatedLotties[index]) {
            counterAnim.anim.playSegments([30, 59], true);
          }
        });

        numClicks = 0;
        nextAnimationIndex = 0;
        animatedLotties = {};

        grid.getChildren().forEach(tile => {
          tile.input.enabled = true;
        });

        GameEventEmitter.dispatch(GameEvent.APP_VIBRATE, [10]);
      });

      // Retrieve the number of clicks allowed for the current level
      const clicksAllowed = levels[curLevel].clicksAllowed || Infinity;
      // Default to Infinity if no limit set

      // Track the number of clicks made
      let numClicks = 0;
      // Define counterAnim variable outside the functions
      let counterAnims = []; // Array to store multiple counter animations
      let animatedLotties = {}; // Object to track animated Lotties

      function addCounterTileWithAnimation(xOffset) {
        const counterAnim = this.addCounterTile(
          this.cameras.main.width / 2 + xOffset,
          36,
          'lights-on-tile-comp',
        );

        counterAnim.anim.setSpeed(1);

        this.time.delayedCall(
          1000,
          () => {
            counterAnim.anim.playSegments([59, 60], true);
          },
          [],
          this,
        );

        counterAnims.push(counterAnim); // Store the created animation in the array

        return counterAnim;
      }

      function positionCopiesForClicksAllowed() {
        const xOffsetMap = {
          2: [-12, 12],
          3: [-24, 0, 24],
          4: [-36, -12, 12, 36],
        };

        const offsets = xOffsetMap[clicksAllowed];

        if (offsets) {
          offsets.forEach(offset => {
            addCounterTileWithAnimation.call(this, offset);
          });
        }
      }

      positionCopiesForClicksAllowed.call(this, clicksAllowed);

      // Define a variable to keep track of the index of the next animation to play
      let nextAnimationIndex = 0;

      // Function to play the next animation in the queue
      function playNextAnimation() {
        // Check if there are more animations in the queue
        if (nextAnimationIndex < counterAnims.length) {
          // Play the next animation
          counterAnims[nextAnimationIndex].anim.playSegments([60, 89], true);
          animatedLotties[nextAnimationIndex] = true; // Mark this Lottie as animated
          nextAnimationIndex++; // Increment the index for the next animation
        }
      }

      // Handle click events globally
      this.input.on('pointerup', pointer => {
        // Loop through each tile to check if it was clicked
        grid.getChildren().forEach(tile => {
          if (tile.getBounds().contains(pointer.x, pointer.y)) {
            // Check if the number of clicks exceeds the allowed limit
            if (numClicks < clicksAllowed) {
              // Increment the number of clicks
              numClicks++;
              // console.log('numclicks :', numClicks);
            }

            // Check if the number of clicks exceeds the allowed limit
            if (numClicks === clicksAllowed) {
              numClicks = 0;
              // Disable input for all tiles
              grid.getChildren().forEach(tile => {
                tile.input.enabled = false;
              });
              setTimeout(() => {
                noMovesLeftText.setVisible(true).setAlpha(0.95);
              }, 100); // Adjust the timeout duration as needed
            }
            // Queue the animation to be played
            playNextAnimation();
          }
        });
      });

      // let hintMessageShown = false;
      let resetPlayed = false; // Add this variable to track if reset has been played
      let hintShownPositions = []; // Keep track of shown hint positions
      let hintEventProcessed = false;
      let hintImage;
      let isHintButtonOn = false;
      const hintSound = this.sound.add('buttonClickSoundOne');

      function showHint() {
        const hintPositions = {
          415: [{ x: 2 * cellSize, y: 4 * cellSize }],
          416: [{ x: 3 * cellSize, y: 4 * cellSize }],
          401: [{ x: 2 * cellSize, y: 4 * cellSize }],
          417: [{ x: 1 * cellSize, y: 4 * cellSize }],
          421: [{ x: 2 * cellSize, y: 4 * cellSize }],
          420: [
            { x: 2 * cellSize, y: 3 * cellSize },
            { x: 2 * cellSize, y: 4 * cellSize },
          ],
          418: [{ x: 2 * cellSize, y: 3 * cellSize }],
          419: [
            { x: 2 * cellSize, y: 3 * cellSize },
            { x: 3 * cellSize, y: 4 * cellSize },
          ],
          1309: [{ x: 3 * cellSize, y: 2 * cellSize }],
          1308: [{ x: 1 * cellSize, y: 2 * cellSize }],
          1307: [{ x: 1 * cellSize, y: 4 * cellSize }],
          1306: [{ x: 3 * cellSize, y: 4 * cellSize }],
          1305: [{ x: 2 * cellSize, y: 4 * cellSize }],
          1304: [{ x: 3 * cellSize, y: 3 * cellSize }],
          1303: [{ x: 2 * cellSize, y: 2 * cellSize }],
          1302: [{ x: 1 * cellSize, y: 3 * cellSize }],
          1301: [
            { x: 2 * cellSize, y: 3 * cellSize },
            { x: 3 * cellSize, y: 2 * cellSize },
          ],
          1300: [
            { x: 2 * cellSize, y: 3 * cellSize },
            { x: 1 * cellSize, y: 2 * cellSize },
          ],
          1299: [
            { x: 1 * cellSize, y: 3 * cellSize },
            { x: 2 * cellSize, y: 4 * cellSize },
          ],
          1292: [{ x: 2 * cellSize, y: 3 * cellSize }],
          1291: [{ x: 2 * cellSize, y: 3 * cellSize }],
          1290: [{ x: 2 * cellSize, y: 3 * cellSize }],
          1286: [
            { x: 2 * cellSize, y: 3 * cellSize },
            { x: 3 * cellSize, y: 3 * cellSize },
          ],
          1285: [
            { x: 2 * cellSize, y: 3 * cellSize },
            { x: 2 * cellSize, y: 2 * cellSize },
          ],
          1284: [
            { x: 2 * cellSize, y: 3 * cellSize },
            { x: 1 * cellSize, y: 3 * cellSize },
          ],
          1283: [{ x: 3 * cellSize, y: 3 * cellSize }],
          1282: [{ x: 2 * cellSize, y: 2 * cellSize }],
          1281: [{ x: 1 * cellSize, y: 3 * cellSize }],
          1271: [{ x: 3 * cellSize, y: 4 * cellSize }],
          1270: [{ x: 3 * cellSize, y: 2 * cellSize }],
          1269: [{ x: 1 * cellSize, y: 2 * cellSize }],
          1268: [{ x: 3 * cellSize, y: 3 * cellSize }],
          1267: [{ x: 2 * cellSize, y: 2 * cellSize }],
          1266: [{ x: 1 * cellSize, y: 3 * cellSize }],
          1265: [{ x: 3 * cellSize, y: 2 * cellSize }],
          1264: [{ x: 1 * cellSize, y: 2 * cellSize }],
          1263: [{ x: 1 * cellSize, y: 4 * cellSize }],
          1262: [{ x: 3 * cellSize, y: 3 * cellSize }],
          1261: [{ x: 2 * cellSize, y: 2 * cellSize }],
          1260: [{ x: 1 * cellSize, y: 3 * cellSize }],

          1579: [
            { x: 4 * cellSize, y: 4 * cellSize },
            { x: 1 * cellSize, y: 3 * cellSize },
          ],
          1582: [
            { x: 4 * cellSize, y: 5 * cellSize },
            { x: 2 * cellSize, y: 4 * cellSize },
          ],
          1583: [
            { x: 4 * cellSize, y: 4 * cellSize },
            { x: 3 * cellSize, y: 4 * cellSize },
          ],
          1584: [
            { x: 1 * cellSize, y: 2 * cellSize },
            { x: 4 * cellSize, y: 3 * cellSize },
          ],
          1585: [{ x: 2 * cellSize, y: 4 * cellSize }],
          1586: [{ x: 1 * cellSize, y: 4 * cellSize }],
          1861: [
            { x: 3 * cellSize, y: 4 * cellSize },
            { x: 1 * cellSize, y: 3 * cellSize },
          ],
          1860: [
            { x: 1 * cellSize, y: 2 * cellSize },
            { x: 3 * cellSize, y: 3 * cellSize },
          ],
          1862: [{ x: 1 * cellSize, y: 3 * cellSize }],
          1863: [{ x: 3 * cellSize, y: 4 * cellSize }],
          1864: [{ x: 2 * cellSize, y: 2 * cellSize }],
          1865: [{ x: 2 * cellSize, y: 3 * cellSize }],
          1866: [{ x: 3 * cellSize, y: 2 * cellSize }],
          1867: [{ x: 3 * cellSize, y: 4 * cellSize }],
          1868: [{ x: 3 * cellSize, y: 3 * cellSize }],
          1869: [{ x: 2 * cellSize, y: 2 * cellSize }],
          1870: [{ x: 3 * cellSize, y: 2 * cellSize }],
          1871: [{ x: 1 * cellSize, y: 3 * cellSize }],
        };

        // Initialize hintsForLevel if undefined or empty
        if (!this.hintsForLevel || this.hintsForLevel.length === 0) {
          this.hintsForLevel = [...hintPositions[curLevel]] || [];
        }

        if (!hintEventProcessed && !resetPlayed) {
          flipTileBack();

          resetPlayed = true;
          counterAnims.forEach((counterAnim, index) => {
            if (animatedLotties[index]) {
              counterAnim.anim.playSegments([30, 59], true);
            }
          });

          numClicks = 0;
          nextAnimationIndex = 0;
          animatedLotties = {};

          grid.getChildren().forEach(tile => {
            tile.input.enabled = true;
          });
        }

        if (this.hintLottie) {
          this.hintLottie.dom.setDepth(-10).destroy();
          hintImage.destroy();
        }

        const remainingPositions = this.hintsForLevel.filter(position => {
          return !hintShownPositions.some(
            shownPosition =>
              shownPosition.x === position.x && shownPosition.y === position.y,
          );
        });

        const randomIndex = Phaser.Math.RND.between(0, remainingPositions.length - 1);
        const randomPosition = remainingPositions[randomIndex] || {
          x: 20 * cellSize,
          y: 20 * cellSize,
        };

        this.hintLottie = this.addFlipItUpHint(
          randomPosition.x,
          randomPosition.y + offsetY,
          numRows,
        );
        this.hintLottie.dom.setDepth(30);
        this.hintLottie.anim.playSegments([28, 150], true);

        hintShownPositions.push(randomPosition);

        const imageKey = 'hint';

        hintImage = this.add
          .image(randomPosition.x, randomPosition.y + offsetY, imageKey)
          .setDisplaySize(0.85 * cellSize, 0.85 * cellSize)
          .setAlpha(1);

        hintImage.setDepth(-29);
        hintImage.setInteractive();
        hintImage.setAlpha(0.000001);
        hintImage.on('pointerdown', () => {
          //
        });

        GameEventEmitter.dispatch(GameEvent.APP_VIBRATE, [10]);

        if (hintShownPositions.length === hintPositions[curLevel].length) {
          hintEventProcessed = true;
          this.setHintButtonOnState();
        }
      }

      GameEventEmitter.subscribe(GameEvent.GAME_SHOW_HINTS, () => {
        if (hintEventProcessed) {
          return;
        }

        showHint.call(this);
        this.setHintButtonOnState();
      });

      this.input.on('pointerup', pointer => {
        if (!this.hintButton.getBounds().contains(pointer.x, pointer.y)) {
          // Check if the click was on a tile
          grid.getChildren().forEach(tile => {
            if (tile.getBounds().contains(pointer.x, pointer.y)) {
              this.setHintButtonOffState();
              // Check if the hintLottie is visible and not hidden
              if (this.hintLottie && this.hintLottie.dom.depth !== -10) {
                if (hintImage && hintImage.getBounds().contains(pointer.x, pointer.y)) {
                  isHintButtonOn = false;
                  hintImage.destroy();
                  this.hintLottie.dom.setDepth(-10).destroy();
                  // Add setTimeout before calling showHint
                  setTimeout(() => {
                    showHint.call(this);
                  }, 500);
                } else {
                  if (hintImage) {
                    hintImage.destroy();
                  }
                  isHintButtonOn = false;
                  this.hintLottie.dom.setDepth(-10).destroy();
                }
              }
            }
          });
        }
      });

      this.hintButton.on('pointerdown', pointer => {
        hintEventProcessed = false;
        hintShownPositions = [];
        resetPlayed = false;
        IGameEvent.showMessage(GameMessageEnum.ASK_PERMISSION_TO_SHOW_HINTS);

        hintSound.play();

        // Always toggle the state
        isHintButtonOn = !isHintButtonOn;

        if (!isHintButtonOn) {
          // Check if there's a hintLottie and its depth is not -10
          if (this.hintLottie && this.hintLottie.dom.depth !== -10) {
            // Remove the 'hint' image if it exists
            if (hintImage) {
              hintImage.destroy();
            }
            // Make the hintLottie disappear
            this.hintLottie.dom.setDepth(-10).destroy();
          }

          this.setHintButtonOffState();
        }
      });

      const cellSize = Grid.getCellSize();

      let audioAndVisibilityPlayed = false;

      function createLightsOnTileAnim(x, y, speed, delay, offsetY) {
        const anim = this.addLottieTile(x, y + offsetY, 'lights-on-tile-comp', numRows);

        anim.anim.setSpeed(speed);

        this.time.delayedCall(
          delay,
          () => {
            if (!audioAndVisibilityPlayed) {
              const introAudio = this.sound.add('lights-on-intro');

              introAudio.play();

              this.buttonManager.toggleTooltip();
              audioAndVisibilityPlayed = true;
            }

            anim.anim.playSegments([0, 29], true);
          },
          [],
          this,
        );

        return anim;
      }

      const animations = [];

      let offsetY = 0;

      if (numRows === 3) {
        offsetY =
          Math.floor(this.cameras.main.height / 2 - 3 * cellSize) -
          (Math.floor(this.cameras.main.height / 2 - 3 * cellSize) % cellSize);
      } else if (numRows === 4) {
        offsetY =
          Math.floor(this.cameras.main.height / 2 - 2.5 * cellSize) -
          (Math.floor(this.cameras.main.height / 2 - 2.5 * cellSize) % cellSize);
      }

      if (numRows === 3) {
        const positions = [
          [1, 2, 1, 1000],
          [2, 2, 1, 1000],
          [3, 2, 1, 1000],
          [1, 3, 1.25, 1050],
          [2, 3, 1.25, 1050],
          [3, 3, 1.25, 1050],
          [1, 4, 1.5, 1100],
          [2, 4, 1.5, 1100],
          [3, 4, 1.5, 1100],
        ];

        positions.forEach(pos =>
          animations.push(
            createLightsOnTileAnim.call(
              this,
              pos[0] * cellSize,
              pos[1] * cellSize,
              pos[2],
              pos[3],
              offsetY,
            ),
          ),
        );
      }

      if (numRows === 4) {
        const positions = [
          [1, 2, 1, 1000],
          [2, 2, 1, 1000],
          [3, 2, 1, 1000],
          [4, 2, 1, 1000],
          [1, 3, 1.25, 1050],
          [2, 3, 1.25, 1050],
          [3, 3, 1.25, 1050],
          [4, 3, 1.25, 1050],
          [1, 4, 1.5, 1100],
          [2, 4, 1.5, 1100],
          [3, 4, 1.5, 1100],
          [4, 4, 1.5, 1100],
          [1, 5, 1.75, 1150],
          [2, 5, 1.75, 1150],
          [3, 5, 1.75, 1150],
          [4, 5, 1.75, 1150],
        ];

        positions.forEach(pos =>
          animations.push(
            createLightsOnTileAnim.call(
              this,
              pos[0] * cellSize,
              pos[1] * cellSize,
              pos[2],
              pos[3],
              offsetY,
            ),
          ),
        );
      }

      const flipSound = this.sound.add('lights-on-tile-flip');
      const flipBeginning = this.sound.add('lights-on-touch-purple'); //not used

      const tileCoordinates3x3 = [
        {
          left: 1 * cellSize,

          top: 2 * cellSize,
        },
        {
          left: 2 * cellSize,

          top: 2 * cellSize,
        },
        {
          left: 3 * cellSize,

          top: 2 * cellSize,
        },
        {
          left: 1 * cellSize,

          top: 3 * cellSize,
        },
        {
          left: 2 * cellSize,

          top: 3 * cellSize,
        },
        {
          left: 3 * cellSize,

          top: 3 * cellSize,
        },
        // Add tiles for the third row only if numRows is 3
        ...(numRows === 3
          ? [
              {
                left: 1 * cellSize,

                top: 4 * cellSize,
              },
              {
                left: 2 * cellSize,

                top: 4 * cellSize,
              },
              {
                left: 3 * cellSize,

                top: 4 * cellSize,
              },
            ]
          : []),
      ];

      const tileCoordinates4x4 = [
        {
          left: 1 * cellSize,

          top: 2 * cellSize,
        },
        {
          left: 2 * cellSize,

          top: 2 * cellSize,
        },
        {
          left: 3 * cellSize,

          top: 2 * cellSize,
        },
        {
          left: 4 * cellSize,

          top: 2 * cellSize,
        },
        {
          left: 1 * cellSize,

          top: 3 * cellSize,
        },
        {
          left: 2 * cellSize,

          top: 3 * cellSize,
        },
        {
          left: 3 * cellSize,

          top: 3 * cellSize,
        },
        {
          left: 4 * cellSize,

          top: 3 * cellSize,
        },

        {
          left: 1 * cellSize,

          top: 4 * cellSize,
        },
        {
          left: 2 * cellSize,

          top: 4 * cellSize,
        },
        {
          left: 3 * cellSize,

          top: 4 * cellSize,
        },
        {
          left: 4 * cellSize,

          top: 4 * cellSize,
        },
        {
          left: 1 * cellSize,

          top: 5 * cellSize,
        },
        {
          left: 2 * cellSize,

          top: 5 * cellSize,
        },
        {
          left: 3 * cellSize,

          top: 5 * cellSize,
        },
        {
          left: 4 * cellSize,

          top: 5 * cellSize,
        },
      ];

      let tile_coordinates;

      if (numRows === 3) {
        tile_coordinates = tileCoordinates3x3;
      } else if (numRows === 4) {
        tile_coordinates = tileCoordinates4x4;
      }

      const grid = this.add.group();

      tile_coordinates.forEach((coord, index) => {
        const row = Math.floor(index / numCols);
        const col = index % numCols;
        const x = coord.left;
        const y = coord.top + offsetY;

        const tile = this.add.image(x, y, 'black');

        tile.setInteractive();

        // Calculate the scaling factor based on cellSize
        const scalingFactor = 0.85 * (cellSize / tile.width);

        // Set the scale of the tile
        tile.setScale(scalingFactor);
        const opacity = 0.00001;

        tile.setAlpha(opacity);
        tile.setScale(scalingFactor);
        tile.setDepth(40);

        function scaleDownLottieAndNeighbors() {
          const scaleDownTile = (r, c) => {
            if (r >= 0 && r < numRows && c >= 0 && c < numCols) {
              const tiles = grid.getChildren()[r * numCols + c];

              scaleDownLottie(tiles);
            }
          };

          scaleDownTile(row, col);
          scaleDownTile(row - 1, col);
          scaleDownTile(row + 1, col);
          scaleDownTile(row, col - 1);
          scaleDownTile(row, col + 1);
        }

        function scaleUpLottieAndNeighbors() {
          const scaleUpTile = (r, c) => {
            if (r >= 0 && r < numRows && c >= 0 && c < numCols) {
              const tiles = grid.getChildren()[r * numCols + c];

              scaleUpLottie(tiles);
            }
          };

          scaleUpTile(row, col);
          scaleUpTile(row - 1, col);
          scaleUpTile(row + 1, col);
          scaleUpTile(row, col - 1);
          scaleUpTile(row, col + 1);
        }

        tile.on('pointerdown', () => {
          const tileTexture = tile.texture.key;

          if (tileTexture === 'black') {
            const touchBlackSound = this.sound.add('lights-on-touch-grey');

            touchBlackSound.play();
            scaleDownLottieAndNeighbors(row, col);
            // Dispatch the vibration event
            GameEventEmitter.dispatch(GameEvent.APP_VIBRATE, [10]);
          } else if (tileTexture === 'purple') {
            const touchPurpleSound = this.sound.add('lights-on-touch-purple');

            touchPurpleSound.play();
            scaleDownLottieAndNeighbors(row, col);
            // Dispatch the vibration event
            GameEventEmitter.dispatch(GameEvent.APP_VIBRATE, [10]);
          }
        });

        tile.on('pointerup', () => {
          if (tileColor === 0) {
            toggleTileAndNeighbors(row, col);
            scaleUpLottieAndNeighbors(row, col);
            playPurpleAnimationClicked(row, col);
          } else if (tileColor === 1) {
            toggleTileAndNeighbors(row, col);
            scaleUpLottieAndNeighbors(row, col);
            playBlackAnimationClicked(row, col);
          }

          // Check if all tiles are purple after the pointerup event
          if (areAllTilesPurple()) {
            noMovesLeftText.destroy();
            // Introduce a delay of 500 milliseconds before playing confetti
            setTimeout(() => {
              this.puzzleConfetti.playGameOverConfetti();
              this.replay?.destroy();
            }, 500);
          }
        });

        grid.add(tile);

        // Check the condition and set the texture accordingly
        const tileColor = levels[curLevel].pattern[row * numCols + col];

        if (tileColor === 1) {
          tile.setTexture('purple');
          const index_2 = row * numCols + col;
          const lottieAnim = getLottieAnimationByIndex(index);
          const delay = index_2 * 100;

          playPurpleAnimationWithoutShimmer.call(this, lottieAnim, delay);
        }
      });

      this.addLottieTile(0, 0);
      this.addCounterTile(0, 0);

      // Function to flip tiles back to their initial positions
      function flipTileBack() {
        noMovesLeftText.setVisible(false);
        // Reset tiles to initial configuration
        tile_coordinates.forEach((coord, index) => {
          const row = Math.floor(index / numCols);
          const col = index % numCols;
          const tile = grid.children.entries[index];

          const tileValue = levels[curLevel].pattern[row * numCols + col];

          // Set the tile texture based on the initial configuration in levels
          let initialTexture = tileValue === 0 ? 'black' : 'purple';

          // Check if the texture is different from the initial configuration
          if (tile.texture.key !== initialTexture) {
            // Trigger animation based on the initial and current textures
            if (initialTexture === 'black') {
              // Trigger playpurpleanimation
              // const index = grid.getChildren().indexOf(tile);
              const lottieAnim = getLottieAnimationByIndex(index);

              // Set the tile texture to initialTexture before playing the animation
              tile.setTexture(initialTexture);

              lottieAnim.anim.playSegments([60, 89], true);

              // Play the flip sound
              flipSound.play();
            } else {
              // Trigger playblackanimation
              // const index = grid.getChildren().indexOf(tile);
              const lottieAnim = getLottieAnimationByIndex(index);

              // Set the tile texture to initialTexture before playing the animation
              tile.setTexture(initialTexture);

              lottieAnim.anim.playSegments([30, 59], true);

              // Play the flip sound
              flipSound.play();
            }
          }
        });
      }

      function toggleTileAndNeighbors(row, col) {
        toggleTile(row, col, true); // Pass true to indicate that this is the clicked tile
        toggleTile(row - 1, col);
        toggleTile(row + 1, col);
        toggleTile(row, col - 1);
        toggleTile(row, col + 1);
      }

      function toggleTile(row, col, isClickedTile = false) {
        if (row >= 0 && row < numRows && col >= 0 && col < numCols) {
          const tile = grid.getChildren()[row * numCols + col];
          const currentTexture = tile.texture.key;

          if (currentTexture === 'black') {
            // Scale down before changing to purple
            // scaleDownLottie(tile);
            tile.setTexture('purple');
            if (isClickedTile) {
              playPurpleAnimationClicked(tile);
            } else {
              playPurpleAnimation(tile);
            }
          } else if (currentTexture === 'purple') {
            // Scale down before changing to black
            // scaleDownLottie(tile);
            tile.setTexture('black');
            if (isClickedTile) {
              playBlackAnimationClicked(tile);
            } else {
              playBlackAnimation(tile);
            }
          }

          // Check if all tiles are purple and play frame [150, 299] if so
          if (areAllTilesPurple()) {
            // Introduce a delay and then play the all-purple animation
            setTimeout(playAllPurpleAnimation, 500); // Adjust the delay time as needed
          }
        }
      }

      // Add a variable to keep track of whether all tiles are purple
      let allTilesPurple = false;

      function areAllTilesPurple() {
        return grid.getChildren().every(tile => tile.texture.key === 'purple');
      }

      function playAllPurpleAnimation() {
        // Check if all tiles are purple before playing the animation
        if (areAllTilesPurple() && !allTilesPurple) {
          counterAnims.forEach((counterAnim, index) => {
            if (animatedLotties[index]) {
              counterAnim.anim.destroy();
            }
          });
          allTilesPurple = true; // Set the variable to true to avoid repeated calls
          this.replay?.destroy().setVisible(false).setInteractive(false);
          this.hintButton.destroy();

          const endanimations = [
            animations[0],
            animations[1],
            animations[2],
            animations[3],
            animations[4],
            animations[5],
          ];

          if (numRows === 3) {
            endanimations.push(animations[6], animations[7], animations[8]);
          }

          if (numRows === 4) {
            endanimations.push(
              animations[6],
              animations[7],
              animations[8],
              animations[9],
              animations[10],
              animations[11],
              animations[12],
              animations[13],
              animations[14],
              animations[15],
            );
          }

          // Variable to keep track of completed animations
          let completedAnimations = 0;

          // Log values for debugging
          // console.log('numRows:', numRows);

          endanimations.forEach((anim, index) => {
            // Introduce a delay based on the index
            const delay = index * 0; // Adjust the delay time as needed

            // Use setTimeout to play animations with a delay
            setTimeout(() => {
              // bgMusic.stop();
              anim.anim.playSegments([150, 301], true);

              // Adjust the speed of the animation
              anim.anim.setSpeed(1);

              // Listen for the completion event
              anim.anim.addEventListener('complete', () => {
                // Increment the count of completed animations
                completedAnimations++;

                // Check if all animations have completed
                if (completedAnimations === endanimations.length) {
                  // Introduce a delay before dispatching the APP_GAME_OVER event
                  setTimeout(() => {
                    GameEventEmitter.dispatch(GameEvent.APP_GAME_OVER, {});
                    //TooltipManager.hideTooltip();
                    this.questionButton.setVisible(false);
                  }, 1700); // Adjust the delay time as needed
                }
              });
            }, delay);
          });

          // Play the success sound when all tiles are purple
          successSound.play();

          // Dispatch vibration when playing the success sound
          GameEventEmitter.dispatch(GameEvent.APP_VIBRATE, [10, 50, 20, 50]);

          // Destroy all tiles
          grid.clear(true, true);
          //TooltipManager.destroyTooltip();
          this.questionButton.destroy();
        }
      }

      function playPurpleAnimation(tile) {
        const index = grid.getChildren().indexOf(tile);
        const lottieAnim = getLottieAnimationByIndex(index);

        lottieAnim.anim.playSegments([30, 59], true);

        // Play the flip sound
        flipSound.play();
      }

      function playBlackAnimation(tile) {
        const index = grid.getChildren().indexOf(tile);
        const lottieAnim = getLottieAnimationByIndex(index);

        lottieAnim.anim.playSegments([60, 89], true);

        // Play the flip sound
        flipSound.play();
      }

      function playPurpleAnimationClicked(tile) {
        const index = grid.getChildren().indexOf(tile);
        //console.log('Clicked tile index:', index); // Add this line

        const lottieAnim = getLottieAnimationByIndex(index);

        if (!lottieAnim) {
          //console.error(`Lottie animation not found for index ${index}`);
          return;
        }

        lottieAnim.anim.playSegments([90, 119], true);

        // Play the flip sound
        flipSound.play();
      }

      function playBlackAnimationClicked(tile) {
        const index = grid.getChildren().indexOf(tile);
        //console.log('Clicked tile index:', index); // Add this line

        const lottieAnim = getLottieAnimationByIndex(index);

        if (!lottieAnim) {
          //console.error(`Lottie animation not found for index ${index}`);
          return;
        }

        lottieAnim.anim.playSegments([120, 149], true);

        // Play the flip sound
        flipSound.play();
      }

      function playPurpleAnimationWithoutShimmer(lottieAnim, delay) {
        const onComplete = () => {
          setTimeout(() => {
            lottieAnim.anim.playSegments([30, 59], true);

            // Create a new instance of the sound using the sound manager
            const flipSoundIntro = this.sound.add('lights-on-tile-flip');

            flipSoundIntro.play();
          }, delay);

          // Remove the event listener after it has been triggered once
          lottieAnim.anim.removeEventListener('complete', onComplete);
        };

        lottieAnim.anim.addEventListener('complete', onComplete);
      }

      function scaleDownLottie(tile) {
        const index = grid.getChildren().indexOf(tile);
        const lottieAnim = getLottieAnimationByIndex(index);

        const initialScale = lottieAnim.dom.scale;
        let targetScale;

        if (numRows === 4) {
          targetScale = 0.2;
        }

        // else if (curLevel >= 79 && curLevel <= 83) {
        //   // Add the condition for the second case (you can adjust the level accordingly)
        //   targetScale = 0.17; // Adjust the scale value as needed
        // }
        if (numRows === 3) {
          // Add the condition for the third case (you can adjust the level accordingly)
          targetScale = 0.26; // Adjust the scale value as needed
        }

        const duration = 90; // milliseconds

        let startTime;

        function animate(currentTime) {
          if (!startTime) {
            startTime = currentTime;
          }

          const progress = (currentTime - startTime) / duration;
          const newScale = initialScale + (targetScale - initialScale) * progress;

          lottieAnim.dom.setScale(newScale);

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        }

        requestAnimationFrame(animate);
      }

      function scaleUpLottie(tile) {
        const index = grid.getChildren().indexOf(tile);
        const lottieAnim = getLottieAnimationByIndex(index);

        const initialScale = lottieAnim.dom.scale;
        let targetScale;

        if (numRows === 4) {
          targetScale = 0.23;
        }

        // else if (curLevel >= 79 && curLevel <= 83) {
        //   // Add the condition for the second case (you can adjust the level accordingly)
        //   targetScale = 0.19; // Adjust the scale value as needed
        // }
        if (numRows === 3) {
          // Add the condition for the third case (you can adjust the level accordingly)
          targetScale = 0.3; // Adjust the scale value as needed
        }

        const duration = 90; // milliseconds

        let startTime;

        function animate(currentTime) {
          if (!startTime) {
            startTime = currentTime;
          }

          const progress = (currentTime - startTime) / duration;
          const newScale = initialScale + (targetScale - initialScale) * progress;

          lottieAnim.dom.setScale(newScale);

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        }

        requestAnimationFrame(animate);
      }

      const successSound = this.sound.add('lights-on-success');

      function getLottieAnimationByIndex(index) {
        return animations[index] || null;
      }

      GameEventEmitter.dispatch(GameEvent.APP_GAME_LOADED, {
        isGameLoaded: true,
      });
    } catch (err) {
      GameEventEmitter.dispatch(GameEvent.APP_GAME_LOADED, {
        isGameLoaded: false,
      });
    }
  }

  addLottieTile(_x, _y, animationName, numRows) {
    let scaleValue;

    if (numRows === 4) {
      scaleValue = 0.23;
    }
    // else if (curLevel >= 79 && curLevel <= 83) {
    //   // Add the condition for the second case (you can adjust the level accordingly)
    //   scaleValue = 0.19; // Adjust the scale value as needed
    // }

    if (numRows === 3) {
      // Add the condition for the third case (you can adjust the level accordingly)
      scaleValue = 0.3; // Adjust the scale value as needed
    }

    const lottieRef = this.add
      .dom(_x - this.cameras.main.width / 2, _y - this.cameras.main.height / 2, 'div')
      //.setScale(this.cameras.main.height / this.cameras.main.width)
      .setScale(scaleValue);

    const lottieDiv = lottieRef.node;

    lottieDiv.style.height = '100%';
    lottieDiv.style.width = '100%';

    const animationData = this.cache.json.get(animationName); // Use the JSON data based on the animation name

    const LottieAnim = lottie.loadAnimation({
      container: lottieDiv,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: animationData, // Use the specified JSON data
    });

    const dataset = { anim: LottieAnim, dom: lottieRef };

    return dataset;
  }

  addCounterTile(_x, _y, animationName) {
    const cellSize = Grid.getCellSize();

    const lottieRef = this.add
      .dom(_x - this.cameras.main.width / 2, _y - this.cameras.main.height / 2, 'div')
      //.setScale(this.cameras.main.height / this.cameras.main.width)
      .setScale(0.07);

    const lottieDiv = lottieRef.node;

    lottieDiv.style.height = '100%';
    lottieDiv.style.width = '100%';

    const animationData = this.cache.json.get(animationName); // Use the JSON data based on the animation name

    const LottieAnim = lottie.loadAnimation({
      container: lottieDiv,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: animationData, // Use the specified JSON data
    });

    const dataset = { anim: LottieAnim, dom: lottieRef };

    return dataset;
  }

  playHintLottie(position) {
    // Check if a hint Lottie is already playing and destroy it
    if (this.hintLottie) {
      this.hintLottie.dom.destroy();
      this.hintLottie = null;
    }

    // Create a new hint Lottie
    this.hintLottie = this.addMLottie(position.x, position.y, 'hintLottie');
    this.hintLottie.dom.setDepth(28);
    this.hintLottie.anim.play();
  }

  setHintButtonOnState() {
    // Set the hint button to on state

    this.hintState = true;
    this.hintButton.playAnimation(0, 26, false);
  }

  setHintButtonOffState() {
    // Set the hint button to off state

    this.hintState && this.hintButton.playAnimation(26, 52, false);

    this.hintState = false;
  }
  addFlipItUpHint(_x, _y, numRows) {
    const animationName = 'flip-it-up-hint'; // Update with the actual animation name

    let scaleValue;

    if (numRows === 4) {
      scaleValue = 0.23;
    }

    // else if (curLevel >= 79 && curLevel <= 83) {
    //   // Add the condition for the second case (you can adjust the level accordingly)
    //   scaleValue = 0.19; // Adjust the scale value as needed
    // }
    if (numRows === 3) {
      // Add the condition for the third case (you can adjust the level accordingly)
      scaleValue = 0.3; // Adjust the scale value as needed
    }

    const lottieRef = this.add
      .dom(_x - this.cameras.main.width / 2, _y - this.cameras.main.height / 2, 'div')
      .setScale(scaleValue);

    const lottieDiv = lottieRef.node;

    lottieRef.setDepth(1);

    lottieDiv.style.height = '100%';
    lottieDiv.style.width = '100%';

    const animationData = this.cache.json.get(animationName);

    const LottieAnim = lottie.loadAnimation({
      container: lottieDiv,
      renderer: 'svg',
      loop: true,
      autoplay: false,
      animationData: animationData,
    });

    const dataset = { anim: LottieAnim, dom: lottieRef };

    return dataset;
  }
}

export default GameScene;
