// Global variables and asset declarations
let width = 0;
let height = 0;
let canvas = null;

let player = null;
let lines = [];
let backgroundImage = null;

let creatingLines = false;

let idleImage = null;
let squatImage = null;
let jumpImage = null;
let oofImage = null;
let run1Image = null;
let run2Image = null;
let run3Image = null;
let fallenImage = null;
let fallImage = null;
let showingLines = false;
let showingCoins = false;
let levelImages = [];

let placingPlayer = false;
let placingCoins = false;
let playerPlaced = false;

let testingSinglePlayer = true;

let fallSound = null;
let jumpSound = null;
let bumpSound = null;
let landSound = null;

let snowImage = null;

let population = null;
let levelDrawn = false;

let startingPlayerActions = 5;
let increaseActionsByAmount = 5;
let increaseActionsEveryXGenerations = 10;
let evolationSpeed = 1;

// Declare a variable for the Socket.IO connection
let socket;

// Object to keep track of other players
let otherPlayers = {};

// Preload assets
function preload() {
	backgroundImage = loadImage("images/levelImages/1.png");
	idleImage = loadImage("images/poses/idle.png");
	squatImage = loadImage("images/poses/squat.png");
	jumpImage = loadImage("images/poses/jump.png");
	oofImage = loadImage("images/poses/oof.png");
	run1Image = loadImage("images/poses/run1.png");
	run2Image = loadImage("images/poses/run2.png");
	run3Image = loadImage("images/poses/run3.png");
	fallenImage = loadImage("images/poses/fallen.png");
	fallImage = loadImage("images/poses/fall.png");

	snowImage = loadImage("images/snow3.png");

	for (let i = 1; i <= 43; i++) {
		levelImages.push(loadImage("images/levelImages/" + i + ".png"));
	}

	jumpSound = loadSound("sounds/jump.mp3");
	fallSound = loadSound("sounds/fall.mp3");
	bumpSound = loadSound("sounds/bump.mp3");
	landSound = loadSound("sounds/land.mp3");
}

function setup() {
	setupCanvas();

	// Initialize the Socket.IO connection
	socket = io();

	// Listen for current players when you connect
	socket.on("currentPlayers", (players) => {
		for (let id in players) {
			if (id !== socket.id) {
				// Create a new player and set their state from the server data
                otherPlayers[id] = new Player();
                otherPlayers[id].setState(players[id].state);
			} else {
				// Set your own starting position from the server data
				player = new Player();
				player.setState(players[id].state);
			}
		}
	});

    socket.on("newPlayer", (player) => {
        otherPlayers[player.id] = new Player();
        otherPlayers[player.id].setState(player.state);
    });

    socket.on("playerMoved", (player) => {
        if (otherPlayers[player.id]) {
            otherPlayers[player.id].setState(player.state);
        }
    });


	// Remove players when they disconnect
	socket.on("playerDisconnected", (id) => {
		delete otherPlayers[id];
	});

	// Initialize your game objects
    player = new Player();
	population = new Population(600);
	setupLevels();
	jumpSound.playMode("sustain");
	fallSound.playMode("sustain");
	bumpSound.playMode("sustain");
	landSound.playMode("sustain");
}

function drawMousePosition() {
	let snappedX = mouseX - (mouseX % 20);
	let snappedY = mouseY - (mouseY % 20);
	push();
	fill(255, 0, 0);
	noStroke();
	ellipse(snappedX, snappedY, 5);
	if (mousePos1 != null) {
		stroke(255, 0, 0);
		strokeWeight(5);
		line(mousePos1.x, mousePos1.y, snappedX, snappedY);
	}
	pop();
}

let lastEmitTime = 0;
const FRAMES_PER_SECOND = 30;
const EMIT_INTERVAL = 1000 / FRAMES_PER_SECOND; // ms

function sendPlayerMovement() {
	if (player && socket) {
		let currentTime = millis();
		if (currentTime - lastEmitTime > EMIT_INTERVAL) {
			socket.emit("playerMovement", player.getState());
			lastEmitTime = currentTime;
		}
	}
}

let levelNumber = 0;
function draw() {
	background(10);
	push();
	translate(0, 50);

	if (testingSinglePlayer) {
		image(levels[player.currentLevelNo].levelImage, 0, 0);
		levels[player.currentLevelNo].show();
		player.Update();
		player.Show();

        // Show other players on the same level
        for (let id in otherPlayers) {
            if (player.currentLevelNo === otherPlayers[id].currentLevelNo) {
                otherPlayers[id].Show();
            }
        }
	} else if (replayingBestPlayer) {
		if (!cloneOfBestPlayer.hasFinishedInstructions) {
			for (let i = 0; i < evolationSpeed; i++) {
				cloneOfBestPlayer.Update();
			}
			showLevel(cloneOfBestPlayer.currentLevelNo);
			alreadyShowingSnow = false;
			cloneOfBestPlayer.Show();
		} else {
			replayingBestPlayer = false;
			mutePlayers = true;
		}
	} else {
		if (population.AllPlayersFinished()) {
			population.NaturalSelection();
			if (population.gen % increaseActionsEveryXGenerations === 0) {
				population.IncreasePlayerMoves(increaseActionsByAmount);
			}
		}
		for (let i = 0; i < evolationSpeed; i++) population.Update();
		population.Show();
	}

	if (showingLines || creatingLines) showLines();
	if (creatingLines) drawMousePosition();
	if (frameCount % 15 === 0) {
		previousFrameRate = floor(getFrameRate());
	}
	pop();

	fill(0);
	noStroke();
	rect(0, 0, width, 50);
	if (!testingSinglePlayer) {
		textSize(32);
		fill(255, 255, 255);
		text("FPS: " + previousFrameRate, width - 160, 35);
		text("Gen: " + population.gen, 30, 35);
		text(
			"Moves: " + population.players[0].brain.instructions.length,
			200,
			35
		);
		text("Best Height: " + population.bestHeight, 400, 35);
	}

	// Send your player's movement to the server
	sendPlayerMovement();
}

let previousFrameRate = 60;
function showLevel(levelNumberToShow) {
	levels[levelNumberToShow].show();
}

function showLines() {
	if (creatingLines) {
		for (let l of lines) {
			l.Show();
		}
	} else {
		for (let l of levels[player.currentLevelNo].lines) {
			l.Show();
		}
	}
}

function setupCanvas() {
	canvas = createCanvas(1200, 950);
	canvas.parent("canvas");
	width = canvas.width;
	height = canvas.height - 50;
}

function keyPressed() {
	switch (key) {
		case " ":
			player.jumpHeld = true;
			break;
		case "R":
			population.ResetAllPlayers();
			break;
		case "S":
			bumpSound.stop();
			jumpSound.stop();
			landSound.stop();
			fallSound.stop();
			break;
	}
	switch (keyCode) {
		case LEFT_ARROW:
			player.leftHeld = true;
			break;
		case RIGHT_ARROW:
			player.rightHeld = true;
			break;
	}
}

replayingBestPlayer = false;
cloneOfBestPlayer = null;

function keyReleased() {
	switch (key) {
		case "B":
			replayingBestPlayer = true;
			cloneOfBestPlayer =
				population.cloneOfBestPlayerFromPreviousGeneration.clone();
			evolationSpeed = 1;
			mutePlayers = false;
			break;
		case " ":
			if (!creatingLines) {
				player.jumpHeld = false;
				player.Jump();
			}
			break;
		case "R":
			if (creatingLines) {
				lines = [];
				linesString = "";
				mousePos1 = null;
				mousePos2 = null;
			}
			break;
		case "N":
			if (creatingLines) {
				levelNumber += 1;
				linesString += "\nlevels.push(tempLevel);";
				linesString += "\ntempLevel = new Level();";
				print(linesString);
				lines = [];
				linesString = "";
				mousePos1 = null;
				mousePos2 = null;
			} else {
				player.currentLevelNo += 1;
				print(player.currentLevelNo);
			}
			break;
		case "D":
			if (creatingLines) {
				mousePos1 = null;
				mousePos2 = null;
			}
	}
	switch (keyCode) {
		case LEFT_ARROW:
			player.leftHeld = false;
			break;
		case RIGHT_ARROW:
			player.rightHeld = false;
			break;
		case DOWN_ARROW:
			evolationSpeed = constrain(evolationSpeed - 1, 0, 50);
			print(evolationSpeed);
			break;
		case UP_ARROW:
			evolationSpeed = constrain(evolationSpeed + 1, 0, 50);
			print(evolationSpeed);
			break;
	}
}

let mousePos1 = null;
let mousePos2 = null;
let linesString = "";

function mouseClicked() {
	if (creatingLines) {
		let snappedX = mouseX - (mouseX % 20);
		let snappedY = mouseY - (mouseY % 20);
		if (mousePos1 == null) {
			mousePos1 = createVector(snappedX, snappedY);
		} else {
			mousePos2 = createVector(snappedX, snappedY);
			lines.push(
				new Line(mousePos1.x, mousePos1.y, mousePos2.x, mousePos2.y)
			);
			linesString +=
				"\ntempLevel.lines.push(new Line(" +
				mousePos1.x +
				"," +
				mousePos1.y +
				"," +
				mousePos2.x +
				"," +
				mousePos2.y +
				"));";
			mousePos1 = null;
			mousePos2 = null;
		}
	} else if (placingPlayer && !playerPlaced) {
		playerPlaced = true;
		player.currentPos = createVector(mouseX, mouseY);
	} else if (placingCoins) {
		// Implement coin placement as needed
	}
	print(
		"levels[" +
			player.currentLevelNo +
			"].coins.push(new Coin(" +
			floor(mouseX) +
			", " +
			floor(mouseY - 50) +
			', "progress"));'
	);
}

// Note: Ensure that the Player, Population, Level, and Line classes (and any related logic) are defined elsewhere in your project.

// End of sketch.js
