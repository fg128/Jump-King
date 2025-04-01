// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the 'public' directory (put your Jump-King files here)
app.use(express.static("public"));

// Object to hold all connected players
let players = {};

io.on("connection", (socket) => {
	console.log(`User connected: ${socket.id}`);

	// Create a new player and add it to our players object
	players[socket.id] = {};

	// Send the current players to the newly connected player
	socket.emit("currentPlayers", players);

	// Notify all other players of the new player
	socket.broadcast.emit("newPlayer", {
		id: socket.id,
		info: players[socket.id],
	});

	// Listen for movement events from this client
	socket.on("playerMovement", (state) => {
		if (players[socket.id]) {
			// Update the player's position on the server
			players[socket.id].state = state;

			// Broadcast the updated position to all other players
			socket.broadcast.emit("playerMoved", {
				id: socket.id,
				state: players[socket.id].state,
			});
		}
	});

    socket.on("pushPlayer", (data) => {
		// Broadcast the push event to all clients
		io.emit("playerPushed", data);
	});

	// Handle player disconnects
	socket.on("disconnect", () => {
		console.log(`User disconnected: ${socket.id}`);
		// Remove the player from our players object
		delete players[socket.id];
		// Notify all players that this player has disconnected
		io.emit("playerDisconnected", socket.id);
	});
});

server.listen(3000, () => {
	console.log("Server is running on port 3000");
});
