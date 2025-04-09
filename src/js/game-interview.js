import tableImage from "../img/table.png";
import moonImage from "../img/moon_blue.png";
import starImage from "../img/star_pink.png";
import circleImage from "../img/circle_yellow.png";
import diamondImage from "../img/diamond_green.png";
import xImage from "../img/x_orange.png";

class ColorwoodGameInterview {
  constructor(canvas) {
    // console.log("Game constructor called");
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.holes = [];
    this.gameState = "intro"; // intro, gameplay, cta
    this.startTime = null;
    this.currentTime = 0;
    this.selectedHoleIndex = -1;
    this.hoveredHoleIndex = -1;
    this.hoveredShapeIndex = -1;
    this.selectedGroupSize = 0; // For tracking group selections
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.draggedShapes = null;

    // Original image dimensions
    this.originalWidth = 1215;
    this.originalHeight = 2160;

    // Cube dimensions (reduced by 20%)
    this.CUBE_WIDTH = 114; // 142 * 0.8
    this.CUBE_HEIGHT = 130; // 163 * 0.8

    // Adjust vertical position from bottom
    this.BOTTOM_MARGIN = 180; // Distance from bottom of canvas

    // Game configuration
    this.PIECES_PER_COLOR = 16;
    this.MAX_STACK_SIZE = 16;
    this.HOLE_COUNT = 7;
    this.HOLE_SPACING_MULTIPLIER = 1.3; // Increase space between holes

    // Magnet effect configuration
    this.MAGNET_THRESHOLD = 50; // Distance in pixels to trigger magnet effect
    this.MAGNET_SPEED = 0.2; // Speed of magnetic snap (0-1)

    // Shape colors for highlighting
    this.shapeColors = {
      moon: "#45B7D1", // blue
      star: "#FF69B4", // pink
      circle: "#FFD700", // yellow
      diamond: "#50C878", // green
      x: "#FFA500", // orange
    };

    // Playable ad timing
    this.INTRO_DURATION = 10000; // 10 seconds
    this.GAMEPLAY_DURATION = 15000; // 15 seconds
    this.CTA_DURATION = 5000; // 5 seconds
    this.TOTAL_DURATION = this.INTRO_DURATION + this.GAMEPLAY_DURATION + this.CTA_DURATION;
    this.introStartTime = 0;
    this.gameplayStartTime = 0;
    this.ctaStartTime = 0;
    this.hasInteracted = false;
    this.ctaTriggered = false;

    this.tableImage = new Image();
    this.shapeImages = {
      moon: { img: new Image(), count: this.PIECES_PER_COLOR },
      star: { img: new Image(), count: this.PIECES_PER_COLOR },
      circle: { img: new Image(), count: this.PIECES_PER_COLOR },
      diamond: { img: new Image(), count: this.PIECES_PER_COLOR },
      x: { img: new Image(), count: this.PIECES_PER_COLOR },
    };

    // Animation states
    this.initialFallAnimation = true;
    this.fallingShapes = [];
    this.animationSpeed = 15;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.fps = 0;

    // Intro animation
    this.introProgress = 0;
    this.introText = "Sort the shapes!";
    this.introSubtext = "Stack 16 same shapes to clear them";
    this.introTextOpacity = 0;
    this.introSubtextOpacity = 0;

    this.loadAssets();
  }

  loadAssets() {
    // Create a promise array to track all image loads
    const imageLoadPromises = [];

    // Load table image
    const tablePromise = new Promise((resolve) => {
      this.tableImage.onload = () => resolve();
      this.tableImage.src = tableImage;
    });
    imageLoadPromises.push(tablePromise);

    // Load shape images
    const shapeTypes = ["moon", "star", "circle", "diamond", "x"];
    const shapeImages = [moonImage, starImage, circleImage, diamondImage, xImage];

    shapeTypes.forEach((type, index) => {
      const promise = new Promise((resolve) => {
        this.shapeImages[type].img.onload = () => resolve();
        this.shapeImages[type].img.src = shapeImages[index];
      });
      imageLoadPromises.push(promise);
    });

    // Wait for all images to load before initializing
    Promise.all(imageLoadPromises)
      .then(() => {
        console.log("All images loaded successfully");
        this.init();
      })
      .catch((error) => {
        console.error("Error loading images:", error);
      });
  }

  init(preserveState = true) {
    //console.log("Game init called, window width:", window.innerWidth);

    // Get the container width (max 600px)
    const container = this.canvas.parentElement;
    const containerWidth = container.clientWidth;
    let targetWidth = Math.min(containerWidth, 600);

    // Calculate scale based on target width
    const scale = targetWidth / this.originalWidth;
    //console.log("Target width:", targetWidth, "Scale:", scale);

    // Store current state if preserving
    const previousHoles = preserveState ? this.holes : null;

    // Set canvas size maintaining aspect ratio
    this.canvas.width = targetWidth;
    this.canvas.height = this.originalHeight * scale;
    //console.log("Canvas dimensions set to:", this.canvas.width, "x", this.canvas.height);

    // Center canvas using margin instead of absolute positioning
    this.canvas.style.position = "relative";
    this.canvas.style.margin = "0 auto";
    this.canvas.style.display = "block";
    //console.log("Canvas centered using margin: auto");

    // Calculate hole dimensions based on cube size and scale
    const holeWidth = this.CUBE_WIDTH * scale;
    const holeSpacing = (this.CUBE_WIDTH * this.HOLE_SPACING_MULTIPLIER - this.CUBE_WIDTH) * scale;
    const totalHolesWidth = this.HOLE_COUNT * (holeWidth + holeSpacing) - holeSpacing;
    const startX = (this.canvas.width - totalHolesWidth) / 2;
    //console.log("Hole dimensions:", holeWidth, "Spacing:", holeSpacing, "Start X:", startX);

    // Calculate hole height - adjust to position cubes lower on the table
    const holeHeight = this.CUBE_HEIGHT * this.MAX_STACK_SIZE * 0.3 * scale;
    const startY = this.canvas.height - holeHeight - (this.BOTTOM_MARGIN - 40) * scale; // Adjusted to move cubes down more
    //console.log("Hole height:", holeHeight, "Start Y:", startY);

    // Initialize or update holes
    if (preserveState && previousHoles && previousHoles.length > 0) {
      //console.log("Updating existing holes");
      // Update existing holes with new positions while preserving shapes
      this.holes = previousHoles.map((hole, i) => ({
        x: startX + i * (holeWidth + holeSpacing),
        y: startY,
        width: holeWidth,
        height: holeHeight,
        shapes: hole.shapes.map((shape) => ({
          ...shape,
          width: this.CUBE_WIDTH * scale,
          height: this.CUBE_HEIGHT * scale,
        })),
      }));
    } else {
      //console.log("Creating new holes");
      // Create new holes
      this.holes = Array(this.HOLE_COUNT)
        .fill(null)
        .map((_, i) => ({
          x: startX + i * (holeWidth + holeSpacing),
          y: startY,
          width: holeWidth,
          height: holeHeight,
          shapes: [],
        }));

      // Create and distribute shapes
      this.distributeShapesRandomly();
    }

    // Start game loop if not already started
    if (!this.startTime) {
      //console.log("Starting game loop");
      this.startTime = Date.now();
      this.introStartTime = this.startTime;
      this.gameplayStartTime = this.introStartTime + this.INTRO_DURATION;
      this.ctaStartTime = this.gameplayStartTime + this.GAMEPLAY_DURATION;
      this.gameLoop();
    }
  }

  distributeShapesRandomly() {
    //console.log("Distributing shapes randomly");
    const allShapes = [];
    const types = ["moon", "star", "circle", "diamond", "x"];

    // Calculate shape dimensions based on hole width
    const scale = this.canvas.width / this.originalWidth;
    const shapeWidth = this.CUBE_WIDTH * scale;
    const shapeHeight = this.CUBE_HEIGHT * scale;

    // Create all shapes
    types.forEach((type) => {
      for (let i = 0; i < this.PIECES_PER_COLOR; i++) {
        allShapes.push({
          type: type,
          width: shapeWidth,
          height: shapeHeight,
        });
      }
    });

    // Shuffle shapes
    for (let i = allShapes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allShapes[i], allShapes[j]] = [allShapes[j], allShapes[i]];
    }

    // Distribute to holes
    let shapeIndex = 0;
    while (shapeIndex < allShapes.length) {
      for (let hole of this.holes) {
        if (shapeIndex < allShapes.length && hole.shapes.length < this.MAX_STACK_SIZE) {
          hole.shapes.push(allShapes[shapeIndex]);
          shapeIndex++;
        }
      }
    }
    //console.log("Shapes distributed to holes");

    // Debug: Check if shapes were distributed correctly
    let totalShapes = 0;
    this.holes.forEach((hole, index) => {
      //console.log(`Hole ${index} has ${hole.shapes.length} shapes`);
      totalShapes += hole.shapes.length;
    });
    //console.log(`Total shapes distributed: ${totalShapes}`);
  }

  gameLoop() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Calculate current time and phase
    const currentTime = Date.now() - this.startTime;
    this.currentTime = currentTime;

    // Determine game state based on timing, but respect user interaction
    if (this.gameState === "intro" && currentTime < this.INTRO_DURATION) {
      this.renderIntro();
    } else if (this.gameState === "gameplay" || (this.gameState === "intro" && currentTime >= this.INTRO_DURATION)) {
      this.gameState = "gameplay"; // Ensure we're in gameplay state
      this.renderGameplay();

      // Check if gameplay duration has ended
      if (currentTime >= this.INTRO_DURATION + this.GAMEPLAY_DURATION) {
        this.gameState = "cta";
        this.ctaTriggered = true;
        this.renderCTA();
      }
    } else if (this.gameState === "cta" || (this.hasInteracted && !this.ctaTriggered && currentTime > this.INTRO_DURATION)) {
      this.gameState = "cta";
      this.ctaTriggered = true;
      // Always render the gameplay in the background
      this.renderGameplay();
      // Then render the CTA on top
      this.renderCTA();
    }

    requestAnimationFrame(() => this.gameLoop());
  }

  renderIntro() {
    // Hide CTA if it's visible
    this.hideCTA();

    // Draw table background
    this.ctx.drawImage(this.tableImage, 0, 0, this.canvas.width, this.canvas.height);

    // Show the HTML intro overlay
    const introOverlay = document.getElementById("introOverlay");
    if (introOverlay) {
      introOverlay.style.display = "flex";
    }
  }

  hideIntro() {
    const introOverlay = document.getElementById("introOverlay");
    if (introOverlay) {
      introOverlay.style.display = "none";
    }
  }

  renderGameplay() {
    // Hide intro and CTA if visible
    this.hideIntro();
    this.hideCTA();

    // Draw table
    this.ctx.drawImage(this.tableImage, 0, 0, this.canvas.width, this.canvas.height);

    // Update timer display
    const remainingTime = Math.max(0, Math.ceil((this.INTRO_DURATION + this.GAMEPLAY_DURATION - this.currentTime) / 1000));
    const timerElement = document.getElementById("gameTimer");
    if (timerElement) {
      timerElement.textContent = `Time: ${remainingTime}s`;
    }

    // Draw holes and shapes
    // First pass: Draw all non-dragged shapes
    this.holes.forEach((hole, holeIndex) => {
      hole.shapes.forEach((shape, index) => {
        // Skip shapes that are being dragged
        if (this.isDragging && holeIndex === this.selectedHoleIndex && index >= hole.shapes.length - this.selectedGroupSize) {
          return;
        }

        const img = this.shapeImages[shape.type].img;
        let x = hole.x + (hole.width - shape.width) / 2;
        let y = hole.y + hole.height - (index + 1) * (shape.height * 0.75);

        // Only highlight if this shape is specifically selected/hovered
        const isHoverable = this.isShapeSelectable(holeIndex, index);
        const isHovered = holeIndex === this.hoveredHoleIndex && index === this.hoveredShapeIndex && isHoverable && !this.isDragging;

        if (isHovered) {
          this.ctx.save();
          // Use shape's color for glow effect
          this.ctx.shadowColor = this.shapeColors[shape.type];
          this.ctx.shadowBlur = 15;
        }

        // Draw the shape
        this.ctx.drawImage(img, x, y, shape.width, shape.height);

        if (isHovered) {
          this.ctx.restore();
        }
      });
    });

    // Second pass: Draw dragged shapes on top
    if (this.isDragging) {
      this.holes.forEach((hole, holeIndex) => {
        if (holeIndex === this.selectedHoleIndex) {
          hole.shapes.forEach((shape, index) => {
            if (index >= hole.shapes.length - this.selectedGroupSize) {
              const dragIndex = index - (hole.shapes.length - this.selectedGroupSize);
              const img = this.shapeImages[shape.type].img;

              let x = this.dragStartX + this.dragOffsetX - shape.width / 2;
              let y = this.dragStartY + this.dragOffsetY - shape.height / 2 - dragIndex * shape.height * 0.75;

              // Apply magnet effect
              const nearestHole = this.findNearestValidHole(x + shape.width / 2, y + shape.height / 2);
              if (nearestHole !== null) {
                const targetX = nearestHole.x + (nearestHole.width - shape.width) / 2;
                const targetY = nearestHole.y + nearestHole.height - (nearestHole.shapes.length + dragIndex + 1) * shape.height * 0.75;

                x = x + (targetX - x) * this.MAGNET_SPEED;
                y = y + (targetY - y) * this.MAGNET_SPEED;
              }

              // Highlight selected group
              this.ctx.save();
              this.ctx.shadowColor = "#ffffff";
              this.ctx.shadowBlur = 20;

              // Draw the shape
              this.ctx.drawImage(img, x, y, shape.width, shape.height);

              this.ctx.restore();
            }
          });
        }
      });
    }
  }

  renderCTA() {
    // Instead of rendering CTA on canvas, show the HTML overlay
    const ctaOverlay = document.getElementById("ctaOverlay");
    if (ctaOverlay) {
      ctaOverlay.style.display = "flex";
    }
  }

  // Add a method to hide the CTA overlay
  hideCTA() {
    const ctaOverlay = document.getElementById("ctaOverlay");
    if (ctaOverlay) {
      ctaOverlay.style.display = "none";
    }
  }

  handleResetClick(x, y) {
    // Check if the click is on the reset button
    const resetButton = document.getElementById("resetButton");
    if (resetButton) {
      const rect = resetButton.getBoundingClientRect();
      const canvasRect = this.canvas.getBoundingClientRect();

      // Convert canvas coordinates to screen coordinates
      const screenX = x + canvasRect.left;
      const screenY = y + canvasRect.top;

      if (screenX >= rect.left && screenX <= rect.right && screenY >= rect.top && screenY <= rect.bottom) {
        this.resetGame();
        return true;
      }
    }
    return false;
  }

  resetGame() {
    //console.log("Resetting game");
    // Clear all holes
    this.holes.forEach((hole) => {
      hole.shapes = [];
    });

    // Redistribute shapes
    this.distributeShapesRandomly();
  }

  isShapeSelectable(holeIndex, shapeIndex) {
    const hole = this.holes[holeIndex];
    if (!hole || shapeIndex < 0) return false;

    // If it's not the top shape, check if it's part of a matching group
    if (shapeIndex < hole.shapes.length - 1) {
      const currentType = hole.shapes[shapeIndex].type;
      // Check if all shapes above this one match
      for (let i = shapeIndex + 1; i < hole.shapes.length; i++) {
        if (hole.shapes[i].type !== currentType) return false;
      }
    }
    return true;
  }

  getClickedShape(x, y) {
    for (let holeIndex = 0; holeIndex < this.holes.length; holeIndex++) {
      const hole = this.holes[holeIndex];
      if (x >= hole.x && x <= hole.x + hole.width) {
        // Found the hole, now find the shape
        for (let shapeIndex = hole.shapes.length - 1; shapeIndex >= 0; shapeIndex--) {
          const shape = hole.shapes[shapeIndex];
          const shapeX = hole.x + (hole.width - shape.width) / 2;
          const shapeY = hole.y + hole.height - (shapeIndex + 1) * (shape.height * 0.8);

          // Improved hit detection with balanced buffer zones
          // Use a larger buffer for top and bottom to make selection more intuitive
          const horizontalBuffer = 5 * (this.canvas.width / this.originalWidth);
          const verticalBuffer = 15 * (this.canvas.width / this.originalWidth); // Larger vertical buffer

          if (x >= shapeX - horizontalBuffer && x <= shapeX + shape.width + horizontalBuffer && y >= shapeY - verticalBuffer && y <= shapeY + shape.height + verticalBuffer) {
            if (this.isShapeSelectable(holeIndex, shapeIndex)) {
              return { holeIndex, shapeIndex };
            }
            break;
          }
        }
      }
    }
    return null;
  }

  updateHover(x, y) {
    const clickedShape = this.getClickedShape(x, y);
    if (clickedShape) {
      if (this.hoveredHoleIndex !== clickedShape.holeIndex || this.hoveredShapeIndex !== clickedShape.shapeIndex) {
        this.hoveredHoleIndex = clickedShape.holeIndex;
        this.hoveredShapeIndex = clickedShape.shapeIndex;
      }
    } else {
      if (this.hoveredHoleIndex !== -1 || this.hoveredShapeIndex !== -1) {
        this.hoveredHoleIndex = -1;
        this.hoveredShapeIndex = -1;
      }
    }
  }

  selectHole(x, y) {
    const clickedShape = this.getClickedShape(x, y);
    if (!clickedShape) {
      this.selectedHoleIndex = -1;
      this.selectedGroupSize = 0;
      return false;
    }

    const { holeIndex, shapeIndex } = clickedShape;
    const hole = this.holes[holeIndex];

    // Calculate group size (number of matching shapes from this point to top)
    let groupSize = 1;
    const selectedType = hole.shapes[shapeIndex].type;
    for (let i = shapeIndex + 1; i < hole.shapes.length; i++) {
      if (hole.shapes[i].type === selectedType) {
        groupSize++;
      } else {
        break;
      }
    }

    this.selectedHoleIndex = holeIndex;
    this.selectedGroupSize = groupSize;
    return true;
  }

  startDrag(x, y) {
    // Mark that user has interacted
    this.hasInteracted = true;

    // Check if reset button was clicked
    if (this.handleResetClick(x, y)) {
      return false;
    }

    const clickedShape = this.getClickedShape(x, y);
    if (!clickedShape) return false;

    const { holeIndex, shapeIndex } = clickedShape;
    const hole = this.holes[holeIndex];

    // Calculate group size (number of matching shapes from this point to top)
    let groupSize = 1;
    const selectedType = hole.shapes[shapeIndex].type;
    for (let i = shapeIndex + 1; i < hole.shapes.length; i++) {
      if (hole.shapes[i].type === selectedType) {
        groupSize++;
      } else {
        break;
      }
    }

    this.selectedHoleIndex = holeIndex;
    this.selectedGroupSize = groupSize;
    this.isDragging = true;

    // Store initial drag position
    const shape = hole.shapes[shapeIndex];
    this.dragStartX = hole.x + (hole.width - shape.width) / 2;
    this.dragStartY = hole.y + hole.height - (shapeIndex + 1) * (shape.height * 0.75);

    // Set drag offset directly like in fullgame.js
    this.dragOffsetX = x - this.dragStartX;
    this.dragOffsetY = y - this.dragStartY;

    return true;
  }

  updateDrag(x, y) {
    if (!this.isDragging) return;

    // Update drag offset directly like in fullgame.js
    this.dragOffsetX = x - this.dragStartX;
    this.dragOffsetY = y - this.dragStartY;

    // Find nearest valid hole for magnet effect
    const nearestHole = this.findNearestValidHole(x, y);
    if (nearestHole) {
      // Apply magnet effect more strongly when close to a valid hole
      const holeX = nearestHole.x + nearestHole.width / 2;
      const holeY = nearestHole.y + nearestHole.height - (nearestHole.shapes.length + this.selectedGroupSize) * this.CUBE_HEIGHT * 0.75 * (this.canvas.width / this.originalWidth);

      // Calculate distance to nearest hole
      const distance = Math.sqrt(Math.pow(x - holeX, 2) + Math.pow(y - holeY, 2));

      // Apply stronger magnet effect when closer to the hole
      const magnetStrength = Math.max(0, 1 - distance / this.MAGNET_THRESHOLD);
      const enhancedMagnetSpeed = this.MAGNET_SPEED * (1 + magnetStrength);

      // Apply magnet effect
      this.dragOffsetX += (holeX - x) * enhancedMagnetSpeed;
      this.dragOffsetY += (holeY - y) * enhancedMagnetSpeed;
    }
  }

  endDrag(x, y) {
    if (!this.isDragging) return;

    // Find target hole
    const holeIndex = this.holes.findIndex((hole) => x >= hole.x && x <= hole.x + hole.width);

    if (holeIndex !== -1) {
      this.moveShape(holeIndex);
    }

    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.selectedHoleIndex = -1;
    this.selectedGroupSize = 0;
  }

  moveShape(toHoleIndex) {
    if (this.selectedHoleIndex === -1 || this.selectedHoleIndex === toHoleIndex) {
      this.selectedHoleIndex = -1;
      this.selectedGroupSize = 0;
      return false;
    }

    const fromHole = this.holes[this.selectedHoleIndex];
    const toHole = this.holes[toHoleIndex];

    // Check if move is valid
    if (toHole.shapes.length + this.selectedGroupSize > this.MAX_STACK_SIZE) {
      this.selectedHoleIndex = -1;
      this.selectedGroupSize = 0;
      return false;
    }

    // If target hole is not empty, check if top shapes match
    if (toHole.shapes.length > 0) {
      const topTargetShape = toHole.shapes[toHole.shapes.length - 1];
      const movingShape = fromHole.shapes[fromHole.shapes.length - this.selectedGroupSize];
      if (topTargetShape.type !== movingShape.type) {
        this.selectedHoleIndex = -1;
        this.selectedGroupSize = 0;
        return false;
      }
    }

    // Move shape group
    const shapesToMove = fromHole.shapes.splice(fromHole.shapes.length - this.selectedGroupSize, this.selectedGroupSize);
    toHole.shapes.push(...shapesToMove);

    // Check for completion
    this.checkHoleCompletion(toHoleIndex);

    this.selectedHoleIndex = -1;
    this.selectedGroupSize = 0;
    return true;
  }

  checkHoleCompletion(holeIndex) {
    const hole = this.holes[holeIndex];
    if (hole.shapes.length === this.MAX_STACK_SIZE) {
      const firstType = hole.shapes[0].type;
      const isComplete = hole.shapes.every((shape) => shape.type === firstType);

      if (isComplete) {
        // Trigger celebration animation
        this.celebrateCompletion(hole);

        // Clear the hole
        hole.shapes = [];

        // Check if game is won
        const isGameWon = this.holes.every((h) => h.shapes.length === 0);
        if (isGameWon) {
          this.gameState = "cta";
        }
      }
    }
  }

  isValidMove(fromHoleIndex, toHoleIndex) {
    if (fromHoleIndex === toHoleIndex) return false;

    const fromHole = this.holes[fromHoleIndex];
    const toHole = this.holes[toHoleIndex];

    if (fromHole.shapes.length === 0) return false;
    if (toHole.shapes.length >= this.MAX_STACK_SIZE) return false;

    if (toHole.shapes.length > 0) {
      const topFromShape = fromHole.shapes[fromHole.shapes.length - 1];
      const topToShape = toHole.shapes[toHole.shapes.length - 1];
      return topFromShape.type === topToShape.type;
    }

    return true;
  }

  findNearestValidHole(x, y) {
    let nearest = null;
    let minDistance = this.MAGNET_THRESHOLD;

    this.holes.forEach((hole, index) => {
      if (this.isValidMove(this.selectedHoleIndex, index)) {
        const holeX = hole.x + hole.width / 2;
        const holeY = hole.y + hole.height - hole.shapes.length * this.CUBE_HEIGHT * 0.75 * (this.canvas.width / this.originalWidth);
        const distance = Math.sqrt(Math.pow(x - holeX, 2) + Math.pow(y - holeY, 2));

        if (distance < minDistance) {
          minDistance = distance;
          nearest = hole;
        }
      }
    });

    return nearest;
  }

  celebrateCompletion(hole) {
    console.log("Celebrating completion");
    // Create particle effect
    const particleCount = 30;
    const particles = [];
    const scale = this.canvas.width / this.originalWidth;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: hole.x + hole.width / 2,
        y: hole.y + hole.height / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        radius: Math.random() * 5 * scale + 2 * scale,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        alpha: 1,
      });
    }

    const animate = () => {
      this.ctx.save();
      this.ctx.globalCompositeOperation = "lighter";

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.alpha -= 0.02;
        particle.radius *= 0.98;

        if (particle.alpha > 0) {
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          this.ctx.fillStyle = `hsla(${particle.color}, ${particle.alpha})`;
          this.ctx.fill();
        }
      });

      this.ctx.restore();

      if (particles.some((p) => p.alpha > 0)) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // Method to handle CTA button click
  handleCTAClick(x, y) {
    if (this.gameState !== "cta") return false;

    const scale = this.canvas.width / this.originalWidth;
    const buttonWidth = 200 * scale;
    const buttonHeight = 60 * scale;
    const buttonX = (this.canvas.width - buttonWidth) / 2;
    const buttonY = this.canvas.height / 2 + 20 * scale;

    // Check if click is within the button
    if (x >= buttonX && x <= buttonX + buttonWidth && y >= buttonY && y <= buttonY + buttonHeight) {
      // Redirect to app store or trigger download
      console.log("CTA button clicked, redirecting to app store");
      // In a real implementation, this would redirect to the app store
      // window.location.href = "https://play.google.com/store/apps/details?id=games.burny.color.sort.woody.puzzle&hl=en-US";
      return true;
    }

    return false;
  }
}

export default ColorwoodGameInterview;
