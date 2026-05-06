import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Schemas
const teamSchema = new mongoose.Schema({
  name: String,
  totalScore: { type: Number, default: 0 },
  players: [
    {
      name: String,
      score: { type: Number, default: 0 }
    }
  ],
  roundWins: { type: Number, default: 0 }
});

const gameSchema = new mongoose.Schema({
  round: Number,
  teams: [teamSchema],
  createdAt: { type: Date, default: Date.now },
  winnerId: String,
  status: { type: String, default: 'active' }, // active, completed
  gameTitle: { type: String, default: 'Foosball Tournament' }
});

const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: String,
  createdAt: { type: Date, default: Date.now }
});

const Game = mongoose.model('Game', gameSchema);
const Admin = mongoose.model('Admin', adminSchema);

// Authentication Middleware
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    res.json({ token, message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new game with custom player names
app.post('/api/games', authenticateAdmin, async (req, res) => {
  try {
    const { playerNames = {} } = req.body;

    const teamsData = [
      { 
        name: "Fooseball Fanatics", 
        players: [
          { name: playerNames.p1 || "Player 1", score: 0 },
          { name: playerNames.p2 || "Player 2", score: 0 }
        ]
      },
      { 
        name: "House Heroes", 
        players: [
          { name: playerNames.p3 || "Player 3", score: 0 },
          { name: playerNames.p4 || "Player 4", score: 0 }
        ]
      },
      { 
        name: "Rapid Fighters", 
        players: [
          { name: playerNames.p5 || "Player 5", score: 0 },
          { name: playerNames.p6 || "Player 6", score: 0 }
        ]
      },
      { 
        name: "Fire Storm", 
        players: [
          { name: playerNames.p7 || "Player 7", score: 0 },
          { name: playerNames.p8 || "Player 8", score: 0 }
        ]
      }
    ];

    const game = new Game({
      round: 1,
      teams: teamsData
    });

    await game.save();
    res.status(201).json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current game
app.get('/api/games/current', async (req, res) => {
  try {
    const game = await Game.findOne({ status: 'active' }).sort({ createdAt: -1 });
    if (!game) {
      return res.status(404).json({ error: 'No active game found' });
    }
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update player name (Admin only)
app.put('/api/games/:gameId/player-name', authenticateAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { teamIndex, playerIndex, newName } = req.body;

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    game.teams[teamIndex].players[playerIndex].name = newName;
    await game.save();
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update team name (Admin only)
app.put('/api/games/:gameId/team-name', authenticateAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { teamIndex, newName } = req.body;

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    game.teams[teamIndex].name = newName;
    await game.save();
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update player score (Admin only)
app.put('/api/games/:gameId/score', authenticateAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { teamIndex, playerIndex, increment } = req.body;

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    game.teams[teamIndex].players[playerIndex].score += increment;
    game.teams[teamIndex].totalScore = game.teams[teamIndex].players.reduce(
      (sum, player) => sum + player.score,
      0
    );

    // Check for round winner
    if (game.teams[teamIndex].totalScore >= 10) {
      game.teams[teamIndex].roundWins += 1;
      game.winnerId = teamIndex;
      
      // Reset for next round
      game.teams.forEach(team => {
        team.totalScore = 0;
        team.players.forEach(player => {
          player.score = 0;
        });
      });
      game.round += 1;
    }

    await game.save();
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// End game
app.put('/api/games/:gameId/end', authenticateAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = await Game.findByIdAndUpdate(
      gameId,
      { status: 'completed' },
      { new: true }
    );
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get game history
app.get('/api/games/history', async (req, res) => {
  try {
    const games = await Game.find().sort({ createdAt: -1 }).limit(10);
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset specific player score (Admin only)
app.put('/api/games/:gameId/reset-player', authenticateAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { teamIndex, playerIndex } = req.body;

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    game.teams[teamIndex].players[playerIndex].score = 0;
    game.teams[teamIndex].totalScore = game.teams[teamIndex].players.reduce(
      (sum, player) => sum + player.score,
      0
    );

    await game.save();
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
