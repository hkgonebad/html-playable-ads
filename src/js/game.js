class ColorwoodGame {
  constructor(canvas) {
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

    this.tableImage = new Image();
    this.shapeImages = {
      moon: { img: new Image(), count: this.PIECES_PER_COLOR },
      star: { img: new Image(), count: this.PIECES_PER_COLOR },
      circle: { img: new Image(), count: this.PIECES_PER_COLOR },
      diamond: { img: new Image(), count: this.PIECES_PER_COLOR },
      x: { img: new Image(), count: this.PIECES_PER_COLOR },
    };

    this.loadAssets();
    this.tableImage.onload = () => {
      this.init();
    };
  }

  loadAssets() {
    this.tableImage.src = "/src/img/table.png";
    this.shapeImages.moon.img.src = "/src/img/moon_blue.png";
    this.shapeImages.star.img.src = "/src/img/star_pink.png";
    this.shapeImages.circle.img.src = "/src/img/circle_yellow.png";
    this.shapeImages.diamond.img.src = "/src/img/diamond_green.png";
    this.shapeImages.x.img.src = "/src/img/x_orange.png";
  }

  init() {
    // For mobile, use device width
    let targetWidth = Math.min(window.innerWidth, 600); // Cap at 600px for larger screens

    // Calculate scale based on target width
    const scale = targetWidth / this.originalWidth;

    // Set canvas size maintaining aspect ratio
    this.canvas.width = targetWidth;
    this.canvas.height = this.originalHeight * scale;

    // Center canvas if screen is wider than canvas
    if (window.innerWidth > this.canvas.width) {
      this.canvas.style.position = "absolute";
      this.canvas.style.left = `${(window.innerWidth - this.canvas.width) / 2}px`;
      this.canvas.style.top = "0";
    } else {
      this.canvas.style.position = "absolute";
      this.canvas.style.left = "0";
      this.canvas.style.top = "0";
    }

    // Calculate hole dimensions based on cube size and scale
    const holeWidth = this.CUBE_WIDTH * scale;
    // Increase spacing between holes
    const holeSpacing = (this.CUBE_WIDTH * this.HOLE_SPACING_MULTIPLIER - this.CUBE_WIDTH) * scale;
    const totalHolesWidth = this.HOLE_COUNT * (holeWidth + holeSpacing) - holeSpacing;
    const startX = (this.canvas.width - totalHolesWidth) / 2;

    // Calculate hole height to accommodate 16 cubes with adjusted overlap
    const holeHeight = this.CUBE_HEIGHT * this.MAX_STACK_SIZE * 0.3 * scale;
    const startY = this.canvas.height - holeHeight - this.BOTTOM_MARGIN * scale;

    // Initialize holes with adjusted spacing
    this.holes = [];
    for (let i = 0; i < this.HOLE_COUNT; i++) {
      this.holes.push({
        x: startX + i * (holeWidth + holeSpacing),
        y: startY,
        width: holeWidth,
        height: holeHeight,
        shapes: [],
      });
    }

    // Create and distribute shapes
    this.distributeShapesRandomly();

    // Start game loop if not already started
    if (!this.startTime) {
      this.startTime = Date.now();
      this.gameLoop();
    }
  }

  distributeShapesRandomly() {
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
  }

  gameLoop() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Always render gameplay now (timer disabled)
    this.gameState = "gameplay";
    this.renderGameplay();

    requestAnimationFrame(() => this.gameLoop());
  }

  renderIntro() {
    this.ctx.drawImage(this.tableImage, 0, 0, this.canvas.width, this.canvas.height);

    // Render intro text
    this.ctx.fillStyle = "#fff";
    this.ctx.font = `${48 * (this.canvas.width / this.originalWidth)}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.fillText("Sort the shapes!", this.canvas.width / 2, this.canvas.height / 3);
    this.ctx.font = `${24 * (this.canvas.width / this.originalWidth)}px Arial`;
    this.ctx.fillText("Stack 16 same shapes to clear them", this.canvas.width / 2, this.canvas.height / 3 + 50);
  }

  renderGameplay() {
    // Draw table
    this.ctx.drawImage(this.tableImage, 0, 0, this.canvas.width, this.canvas.height);

    // Draw holes and shapes
    this.holes.forEach((hole, holeIndex) => {
      hole.shapes.forEach((shape, index) => {
        const img = this.shapeImages[shape.type].img;
        let x = hole.x + (hole.width - shape.width) / 2;
        let y = hole.y + hole.height - (index + 1) * (shape.height * 0.7);

        // If this shape is being dragged, use the dragged position
        if (this.isDragging && holeIndex === this.selectedHoleIndex && index >= hole.shapes.length - this.selectedGroupSize) {
          const dragIndex = index - (hole.shapes.length - this.selectedGroupSize);
          x = this.dragStartX + this.dragOffsetX - shape.width / 2;
          y = this.dragStartY + this.dragOffsetY - shape.height / 2 - dragIndex * shape.height * 0.7;

          // Apply magnet effect
          const nearestHole = this.findNearestValidHole(x + shape.width / 2, y + shape.height / 2);
          if (nearestHole !== null) {
            const targetX = nearestHole.x + (nearestHole.width - shape.width) / 2;
            const targetY = nearestHole.y + nearestHole.height - (nearestHole.shapes.length + dragIndex + 1) * shape.height * 0.7;

            x = x + (targetX - x) * this.MAGNET_SPEED;
            y = y + (targetY - y) * this.MAGNET_SPEED;
          }
        }

        // Only highlight if this shape is specifically selected/hovered
        const isInSelectedGroup = this.isDragging && holeIndex === this.selectedHoleIndex && index >= hole.shapes.length - this.selectedGroupSize;

        const isHoverable = this.isShapeSelectable(holeIndex, index);
        const isHovered = holeIndex === this.hoveredHoleIndex && index === this.hoveredShapeIndex && isHoverable && !this.isDragging;

        if (isHovered || isInSelectedGroup) {
          this.ctx.save();
          // Use shape's color for glow effect
          this.ctx.shadowColor = this.shapeColors[shape.type];
          this.ctx.shadowBlur = isInSelectedGroup ? 25 : 20;
          // Add white inner glow for selected group
          if (isInSelectedGroup) {
            this.ctx.shadowColor = "#ffffff";
            this.ctx.shadowBlur = 15;
          }
        }

        this.ctx.drawImage(img, x, y, shape.width, shape.height);

        if (isHovered || isInSelectedGroup) {
          this.ctx.restore();
        }
      });
    });
  }

  renderCTA() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const scale = this.canvas.width / this.originalWidth;

    this.ctx.fillStyle = "#fff";
    this.ctx.font = `${48 * scale}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.fillText("Play Now!", this.canvas.width / 2, this.canvas.height / 2);

    // Draw CTA button
    const buttonWidth = 200 * scale;
    const buttonHeight = 60 * scale;
    const buttonX = (this.canvas.width - buttonWidth) / 2;
    const buttonY = this.canvas.height / 2 + 20 * scale;

    this.ctx.fillStyle = "#4CAF50";
    this.ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 10 * scale);
    this.ctx.fill();

    this.ctx.fillStyle = "#fff";
    this.ctx.font = `${24 * scale}px Arial`;
    this.ctx.fillText("Download Now!", this.canvas.width / 2, buttonY + buttonHeight / 2 + 8);
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
          const shapeY = hole.y + hole.height - (shapeIndex + 1) * (shape.height * 0.75);

          if (y >= shapeY && y <= shapeY + shape.height) {
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
      this.hoveredHoleIndex = clickedShape.holeIndex;
      this.hoveredShapeIndex = clickedShape.shapeIndex;
    } else {
      this.hoveredHoleIndex = -1;
      this.hoveredShapeIndex = -1;
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
    this.dragOffsetX = x - this.dragStartX;
    this.dragOffsetY = y - this.dragStartY;

    return true;
  }

  updateDrag(x, y) {
    if (!this.isDragging) return;
    this.dragOffsetX = x - this.dragStartX;
    this.dragOffsetY = y - this.dragStartY;
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
        const holeY = hole.y + hole.height - hole.shapes.length * this.CUBE_HEIGHT * 0.7 * (this.canvas.width / this.originalWidth);
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
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.alpha -= 0.02;
        particle.radius *= 0.99;

        if (particle.alpha > 0) {
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          this.ctx.fillStyle = `hsla(${particle.color}, ${particle.alpha})`;
          this.ctx.fill();
        }
      });

      if (particles.some((p) => p.alpha > 0)) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }
}

export default ColorwoodGame;
